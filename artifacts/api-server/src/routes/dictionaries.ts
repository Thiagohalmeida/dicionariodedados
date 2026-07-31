import { Router, type IRouter } from "express";
import { eq, inArray, desc, count } from "drizzle-orm";
import {
  db,
  dictionariesTable,
  fieldsTable,
  validationsTable,
} from "@workspace/db";
import {
  ImportDictionaryBody,
  ImportDictionaryResponse,
  ListDictionariesResponse,
  ListDictionariesQueryParams,
  listDictionariesQueryPageDefault,
  listDictionariesQueryLimitDefault,
  GetDictionaryParams,
  GetDictionaryResponse,
  DeleteDictionaryParams,
  ExportDictionaryParams,
  ExportDictionaryResponse,
  UpdateDictionaryParams,
  UpdateDictionaryBody,
  UpdateDictionaryResponse,
} from "@workspace/api-zod";
import { logger } from "../lib/logger";
import {
  computeFieldSummariesBatch,
  getFieldsWithSummaries,
} from "../lib/summary";
import { FIELD_STATUS, DICTIONARY_STATUS } from "../lib/constants";
import {
  generateDatabricksDDL,
  generateDatabricksCreateOrReplace,
  generateDatabricksAlterAddColumns,
  generateDatabricksLoadSQL,
  generateOptimizeSQL,
  generateVacuumSQL,
  type DatabricksDDLConfig,
} from "../modules/ddl-generator/databricks";

const router: IRouter = Router();

router.get("/dictionaries", async (req, res): Promise<void> => {
  // Coerce query params from strings to numbers
  const query = {
    page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
    limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
  };
  const parsedQuery = ListDictionariesQueryParams.safeParse(query);
  if (!parsedQuery.success) {
    req.log.error({ err: parsedQuery.error }, "Invalid query params");
    res.status(400).json({ error: parsedQuery.error.message });
    return;
  }

  const { page, limit } = parsedQuery.data;
  const offset = (page - 1) * limit;

  const pageDicts = await db
    .select()
    .from(dictionariesTable)
    .orderBy(desc(dictionariesTable.createdAt))
    .limit(limit)
    .offset(offset);

  const [{ total }] = await db
    .select({ total: count() })
    .from(dictionariesTable);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  if (pageDicts.length === 0) {
    res.json(
      ListDictionariesResponse.parse({
        data: [],
        total,
        page,
        limit,
        totalPages,
      }),
    );
    return;
  }

  const pageDictIds = pageDicts.map((d) => d.id);
  const pageFields = await db
    .select()
    .from(fieldsTable)
    .where(inArray(fieldsTable.dictionaryId, pageDictIds));

  const fieldsByDict = new Map<number, typeof pageFields>();
  for (const f of pageFields) {
    const list = fieldsByDict.get(f.dictionaryId) ?? [];
    list.push(f);
    fieldsByDict.set(f.dictionaryId, list);
  }

  const allFieldIds = pageFields.map((f) => f.id);
  const allSummaries = await computeFieldSummariesBatch(allFieldIds);

  const data = pageDicts.map((d) => {
    const fields = fieldsByDict.get(d.id) ?? [];
    let approvedFields = 0;
    let rejectedFields = 0;
    let pendingFields = 0;
    let totalScore = 0;
    let scoredFields = 0;
    let fieldsValidatedBy1 = 0;
    let fieldsValidatedBy2 = 0;

    for (const f of fields) {
      const summary = allSummaries.get(f.id)!;
      if (summary.statusFinal === FIELD_STATUS.APPROVED) approvedFields++;
      else if (summary.statusFinal === FIELD_STATUS.REJECTED) rejectedFields++;
      else pendingFields++;
      if (summary.score !== null) {
        totalScore += summary.score;
        scoredFields++;
      }
      // Count validations per field
      if (summary.totalValidations >= 1) fieldsValidatedBy1++;
      if (summary.totalValidations >= 2) fieldsValidatedBy2++;
    }

    const allFieldsDoubleValidated = fields.length > 0 && fields.length === fieldsValidatedBy2;

    return {
      id: d.id,
      processo: d.processo,
      categoria: d.categoria,
      tabela: d.tabela,
      version: d.version,
      parentId: d.parentId ?? null,
      status: d.status,
      createdAt: d.createdAt.toISOString(),
      totalFields: fields.length,
      approvedFields,
      rejectedFields,
      pendingFields,
      avgScore:
        scoredFields > 0
          ? Math.round((totalScore / scoredFields) * 100) / 100
          : null,
      fieldsValidatedBy1,
      fieldsValidatedBy2,
      allFieldsDoubleValidated,
    };
  });

  res.json(
    ListDictionariesResponse.parse({
      data,
      total,
      page,
      limit,
      totalPages,
    }),
  );
});

router.post("/dictionaries", async (req, res): Promise<void> => {
  const parsed = ImportDictionaryBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.error({ err: parsed.error }, "Invalid import body");
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { processo, categoria, tabela, campos } = parsed.data;

  const [dict] = await db
    .insert(dictionariesTable)
    .values({
      processo,
      categoria,
      tabela,
      version: 1,
      status: DICTIONARY_STATUS.PENDING,
    })
    .returning();

  await db.insert(fieldsTable).values(
    campos.map((c) => ({
      dictionaryId: dict.id,
      campoOrigem: c.campo_origem,
      descricao: c.descricao,
      origem: c.origem,
      periodicidade: c.periodicidade,
      campoTecnico: c.campo_tecnico,
      tipoDado: c.tipo_dado,
      chave: c.chave,
      formula: "nao" as const,
      excluded: false,
      customInternalPlatform: null,
      businessRuleExpression: null,
      businessRuleSql: null,
    })),
  );

  req.log.info({ dictionaryId: dict.id }, "Dictionary imported");

  res.status(201).json(
    ImportDictionaryResponse.parse({
      id: dict.id,
      processo: dict.processo,
      categoria: dict.categoria,
      tabela: dict.tabela,
      version: dict.version,
      parentId: dict.parentId ?? null,
      status: dict.status,
      createdAt: dict.createdAt.toISOString(),
    }),
  );
});

router.get("/dictionaries/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    req.log.error({ id: req.params.id }, "Invalid dictionary ID");
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  const [dict] = await db
    .select()
    .from(dictionariesTable)
    .where(eq(dictionariesTable.id, id));

  if (!dict) {
    req.log.error({ dictionaryId: id }, "Dictionary not found");
    res.status(404).json({ error: "Dictionary not found" });
    return;
  }

  const fieldsWithSummaries = await getFieldsWithSummaries(dict.id);

  res.json(
    GetDictionaryResponse.parse({
      id: dict.id,
      processo: dict.processo,
      categoria: dict.categoria,
      tabela: dict.tabela,
      version: dict.version,
      parentId: dict.parentId ?? null,
      status: dict.status,
      createdAt: dict.createdAt.toISOString(),
      fields: fieldsWithSummaries,
    }),
  );
});

router.get("/dictionaries/:id/validation-status", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    req.log.error({ id: req.params.id }, "Invalid dictionary ID");
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  const [dict] = await db
    .select()
    .from(dictionariesTable)
    .where(eq(dictionariesTable.id, id));

  if (!dict) {
    req.log.error({ dictionaryId: id }, "Dictionary not found");
    res.status(404).json({ error: "Dicionário não encontrado" });
    return;
  }

  const fieldsWithSummaries = await getFieldsWithSummaries(dict.id);

  let fieldsValidatedBy1 = 0;
  let fieldsValidatedBy2 = 0;
  const fieldsData = [];

  for (const field of fieldsWithSummaries) {
    const totalValidations = field.summary.totalValidations;
    const validators = field.summary.totalValidations > 0
      ? Array.from({ length: field.summary.totalValidations }, (_, i) => `Validator ${i + 1}`)
      : [];

    if (totalValidations >= 1) fieldsValidatedBy1++;
    if (totalValidations >= 2) fieldsValidatedBy2++;

    fieldsData.push({
      fieldId: field.id,
      campoTecnico: field.campoTecnico,
      totalValidations,
      validators,
    });
  }

  const canGenerateDDL = fieldsWithSummaries.length > 0 && fieldsValidatedBy2 === fieldsWithSummaries.length;

  res.json({
    fieldsTotal: fieldsWithSummaries.length,
    fieldsValidatedBy1,
    fieldsValidatedBy2,
    canGenerateDDL,
    fields: fieldsData,
  });
});

router.patch("/dictionaries/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    req.log.error({ id: req.params.id }, "Invalid dictionary ID");
    res.status(400).json({ error: "ID inválido" });
    return;
  }
  const params = UpdateDictionaryParams.safeParse({ id });
  if (!params.success) {
    req.log.error({ err: params.error }, "Invalid params");
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateDictionaryBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.error({ err: parsed.error }, "Invalid body");
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.processo !== undefined)
    updates.processo = parsed.data.processo;
  if (parsed.data.categoria !== undefined)
    updates.categoria = parsed.data.categoria;
  if (parsed.data.tabela !== undefined) updates.tabela = parsed.data.tabela;

  if (Object.keys(updates).length === 0) {
    req.log.error({ dictionaryId: params.data.id }, "No fields to update");
    res.status(400).json({ error: "No fields to update" });
    return;
  }

  const [dict] = await db
    .update(dictionariesTable)
    .set(updates)
    .where(eq(dictionariesTable.id, params.data.id))
    .returning();

  if (!dict) {
    req.log.error({ dictionaryId: params.data.id }, "Dictionary not found");
    res.status(404).json({ error: "Dictionary not found" });
    return;
  }

  req.log.info({ dictionaryId: dict.id }, "Dictionary updated");

  res.json(
    UpdateDictionaryResponse.parse({
      id: dict.id,
      processo: dict.processo,
      categoria: dict.categoria,
      tabela: dict.tabela,
      version: dict.version,
      parentId: dict.parentId ?? null,
      status: dict.status,
      createdAt: dict.createdAt.toISOString(),
    }),
  );
});

router.delete("/dictionaries/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    req.log.error({ id: req.params.id }, "Invalid dictionary ID");
    res.status(400).json({ error: "ID inválido" });
    return;
  }
  const params = DeleteDictionaryParams.safeParse({ id });
  if (!params.success) {
    req.log.error({ err: params.error }, "Invalid params");
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [dict] = await db
    .delete(dictionariesTable)
    .where(eq(dictionariesTable.id, params.data.id))
    .returning();

  if (!dict) {
    req.log.error({ dictionaryId: params.data.id }, "Dictionary not found");
    res.status(404).json({ error: "Dictionary not found" });
    return;
  }

  res.sendStatus(204);
});

router.get("/dictionaries/:id/export", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    req.log.error({ id: req.params.id }, "Invalid dictionary ID");
    res.status(400).json({ error: "ID inválido" });
    return;
  }
  const params = ExportDictionaryParams.safeParse({ id });
  if (!params.success) {
    req.log.error({ err: params.error }, "Invalid params");
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [dict] = await db
    .select()
    .from(dictionariesTable)
    .where(eq(dictionariesTable.id, params.data.id));

  if (!dict) {
    req.log.error({ dictionaryId: params.data.id }, "Dictionary not found");
    res.status(404).json({ error: "Dictionary not found" });
    return;
  }

  const format =
    typeof req.query.format === "string" ? req.query.format : "json";
  const fieldsWithSummaries = await getFieldsWithSummaries(dict.id);

  // Filter out fields with formula "sim" or "suporte"
  const filteredFields = fieldsWithSummaries.filter(
    (f) => f.formula === "nao",
  );

  if (format === "csv") {
    const header = [
      "campo_origem",
      "descricao",
      "origem",
      "periodicidade",
      "campo_tecnico",
      "tipo_dado",
      "chave",
      "status",
      "score",
      "classification",
    ].join(",");

    const rows = filteredFields.map((f) =>
      [
        `"${f.campoOrigem}"`,
        `"${f.descricao}"`,
        `"${f.origem}"`,
        `"${f.periodicidade}"`,
        `"${f.campoTecnico}"`,
        `"${f.tipoDado}"`,
        f.chave,
        f.summary.statusFinal,
        f.summary.score ?? "",
        f.summary.classification,
      ].join(","),
    );

    const content = [header, ...rows].join("\n");
    const filename = `${dict.tabela}_v${dict.version}.csv`;

    res.json(
      ExportDictionaryResponse.parse({ format: "csv", filename, content }),
    );
    return;
  }

  const exportData = {
    processo: dict.processo,
    categoria: dict.categoria,
    tabela: dict.tabela,
    version: dict.version,
    exportedAt: new Date().toISOString(),
    campos: filteredFields.map((f) => ({
      campo_origem: f.campoOrigem,
      descricao: f.descricao,
      origem: f.origem,
      periodicidade: f.periodicidade,
      campo_tecnico: f.campoTecnico,
      tipo_dado: f.tipoDado,
      chave: f.chave,
      validacao: {
        status: f.summary.statusFinal,
        score: f.summary.score,
        classification: f.summary.classification,
        total_validations: f.summary.totalValidations,
      },
    })),
  };

res.json(
    ExportDictionaryResponse.parse({
      format: "json",
      filename: `${dict.tabela}_v${dict.version}.json`,
      content: JSON.stringify(exportData, null, 2),
    })
  );
});

// Validation status endpoint - returns counts of validations per field for double-validation badge

// Databricks DDL Export - Standard
router.get("/dictionaries/:id/export/ddl-databricks", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    req.log.error({ id: req.params.id }, "Invalid dictionary ID");
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  const [dict] = await db
    .select()
    .from(dictionariesTable)
    .where(eq(dictionariesTable.id, id));

  if (!dict) {
    req.log.error({ dictionaryId: id }, "Dictionary not found for DDL export");
    res.status(404).json({ error: "Dicionário não encontrado" });
    return;
  }

  const fields = await getFieldsWithSummaries(id);

  const config: DatabricksDDLConfig = {
    catalog: req.query.catalog as string || "main",
    schema: req.query.schema as string || "suprimentos",
    tableName: dict.tabela,
    includeBusinessRules: req.query.include_business_rules === "true",
    partitionColumn: req.query.partition_column as string,
    zorderColumns: req.query.zorder_columns ? (req.query.zorder_columns as string).split(",") : undefined,
  };

  const ddl = generateDatabricksDDL(fields, config);

  const filename = `${dict.tabela}_databricks_v${dict.version}.sql`;
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.setHeader("Content-Type", "text/sql; charset=utf-8");
  res.send(ddl);
});

// Databricks DDL Export - CREATE OR REPLACE (for updates)
router.get("/dictionaries/:id/export/ddl-databricks-replace", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    req.log.error({ id: req.params.id }, "Invalid dictionary ID");
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  const [dict] = await db
    .select()
    .from(dictionariesTable)
    .where(eq(dictionariesTable.id, id));

  if (!dict) {
    req.log.error({ dictionaryId: id }, "Dictionary not found for DDL export");
    res.status(404).json({ error: "Dicionário não encontrado" });
    return;
  }

  const fields = await getFieldsWithSummaries(id);

  const config: DatabricksDDLConfig = {
    catalog: req.query.catalog as string || "main",
    schema: req.query.schema as string || "suprimentos",
    tableName: dict.tabela,
    includeBusinessRules: req.query.include_business_rules === "true",
    partitionColumn: req.query.partition_column as string,
    zorderColumns: req.query.zorder_columns ? (req.query.zorder_columns as string).split(",") : undefined,
  };

  const ddl = generateDatabricksCreateOrReplace(fields, config);

  const filename = `${dict.tabela}_databricks_replace_v${dict.version}.sql`;
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.setHeader("Content-Type", "text/sql; charset=utf-8");
  res.send(ddl);
});

// Databricks DDL - ALTER TABLE ADD COLUMNS (for incremental updates)
router.get("/dictionaries/:id/export/ddl-databricks-alter", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    req.log.error({ id: req.params.id }, "Invalid dictionary ID");
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  const [dict] = await db
    .select()
    .from(dictionariesTable)
    .where(eq(dictionariesTable.id, id));

  if (!dict) {
    req.log.error({ dictionaryId: id }, "Dictionary not found for DDL export");
    res.status(404).json({ error: "Dicionário não encontrado" });
    return;
  }

  const fields = await getFieldsWithSummaries(id);

  const config: DatabricksDDLConfig = {
    catalog: req.query.catalog as string || "main",
    schema: req.query.schema as string || "suprimentos",
    tableName: dict.tabela,
  };

  // Get existing columns from query param or assume empty
  const existingColumns = req.query.existing_columns
    ? (req.query.existing_columns as string).split(",")
    : [];

  const ddl = generateDatabricksAlterAddColumns(fields, config, existingColumns);

  const filename = `${dict.tabela}_databricks_alter_v${dict.version}.sql`;
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.setHeader("Content-Type", "text/sql; charset=utf-8");
  res.send(ddl);
});

// Databricks Load SQL Generator
router.post("/dictionaries/:id/export/databricks-load-sql", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    req.log.error({ id: req.params.id }, "Invalid dictionary ID");
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  const [dict] = await db
    .select()
    .from(dictionariesTable)
    .where(eq(dictionariesTable.id, id));

  if (!dict) {
    req.log.error({ dictionaryId: id }, "Dictionary not found");
    res.status(404).json({ error: "Dicionário não encontrado" });
    return;
  }

  const { sourcePath, fileFormat, writeMode, mergeKey } = req.body;

  if (!sourcePath) {
    res.status(400).json({ error: "sourcePath é obrigatório" });
    return;
  }

  const sql = generateDatabricksLoadSQL({
    catalog: req.body.catalog || "main",
    schema: req.body.schema || "suprimentos",
    tableName: dict.tabela,
    sourcePath,
    fileFormat: req.body.fileFormat,
    writeMode: req.body.writeMode,
    mergeKey: req.body.mergeKey,
  });

  const filename = `${dict.tabela}_databricks_load_v${dict.version}.sql`;
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.setHeader("Content-Type", "text/sql; charset=utf-8");
  res.send(sql);
});

// Databricks OPTIMIZE SQL Generator
router.get("/dictionaries/:id/export/databricks-optimize-sql", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    req.log.error({ id: req.params.id }, "Invalid dictionary ID");
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  const [dict] = await db
    .select()
    .from(dictionariesTable)
    .where(eq(dictionariesTable.id, id));

  if (!dict) {
    req.log.error({ dictionaryId: id }, "Dictionary not found");
    res.status(404).json({ error: "Dicionário não encontrado" });
    return;
  }

  const fields = await getFieldsWithSummaries(id);

  const config: DatabricksDDLConfig = {
    catalog: req.query.catalog as string || "main",
    schema: req.query.schema as string || "suprimentos",
    tableName: dict.tabela,
  };

  const sql = generateOptimizeSQL(config, fields);

  const filename = `${dict.tabela}_databricks_optimize_v${dict.version}.sql`;
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.setHeader("Content-Type", "text/sql; charset=utf-8");
  res.send(sql);
});

// Databricks VACUUM SQL Generator
router.get("/dictionaries/:id/export/databricks-vacuum-sql", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    req.log.error({ id: req.params.id }, "Invalid dictionary ID");
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  const [dict] = await db
    .select()
    .from(dictionariesTable)
    .where(eq(dictionariesTable.id, id));

  if (!dict) {
    req.log.error({ dictionaryId: id }, "Dictionary not found");
    res.status(404).json({ error: "Dicionário não encontrado" });
    return;
  }

  const config: DatabricksDDLConfig = {
    catalog: req.query.catalog as string || "main",
    schema: req.query.schema as string || "suprimentos",
    tableName: dict.tabela,
  };

  const retentionHours = req.query.retention_hours
    ? parseInt(req.query.retention_hours as string, 10)
    : 168;

  const sql = generateVacuumSQL(config, retentionHours);

  const filename = `${dict.tabela}_databricks_vacuum_v${dict.version}.sql`;
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.setHeader("Content-Type", "text/sql; charset=utf-8");
  res.send(sql);
});

export default router;
