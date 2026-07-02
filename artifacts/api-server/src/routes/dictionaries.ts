import { Router, type IRouter } from "express";
import { eq, sql, count, avg } from "drizzle-orm";
import { db, dictionariesTable, fieldsTable, validationsTable } from "@workspace/db";
import {
  ImportDictionaryBody,
  ImportDictionaryResponse,
  ListDictionariesResponse,
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
import { computeFieldSummary, getFieldsWithSummaries } from "../lib/summary";

const router: IRouter = Router();

router.get("/dictionaries", async (req, res): Promise<void> => {
  const dicts = await db.select().from(dictionariesTable).orderBy(dictionariesTable.createdAt);

  const result = await Promise.all(
    dicts.map(async (d) => {
      const fields = await db.select().from(fieldsTable).where(eq(fieldsTable.dictionaryId, d.id));
      const fieldIds = fields.map((f) => f.id);

      let approvedFields = 0;
      let rejectedFields = 0;
      let pendingFields = 0;
      let totalScore = 0;
      let scoredFields = 0;

      for (const fId of fieldIds) {
        const summary = await computeFieldSummary(fId);
        if (summary.statusFinal === "approved") approvedFields++;
        else if (summary.statusFinal === "rejected") rejectedFields++;
        else pendingFields++;
        if (summary.score !== null) {
          totalScore += summary.score;
          scoredFields++;
        }
      }

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
        avgScore: scoredFields > 0 ? Math.round((totalScore / scoredFields) * 100) / 100 : null,
      };
    })
  );

  res.json(ListDictionariesResponse.parse(result));
});

router.post("/dictionaries", async (req, res): Promise<void> => {
  const parsed = ImportDictionaryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { processo, categoria, tabela, campos } = parsed.data;

  const [dict] = await db
    .insert(dictionariesTable)
    .values({ processo, categoria, tabela, version: 1, status: "pending" })
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
    }))
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
    })
  );
});

router.get("/dictionaries/:id", async (req, res): Promise<void> => {
  const params = GetDictionaryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [dict] = await db
    .select()
    .from(dictionariesTable)
    .where(eq(dictionariesTable.id, params.data.id));

  if (!dict) {
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
    })
  );
});

router.patch("/dictionaries/:id", async (req, res): Promise<void> => {
  const params = UpdateDictionaryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateDictionaryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.processo !== undefined) updates.processo = parsed.data.processo;
  if (parsed.data.categoria !== undefined) updates.categoria = parsed.data.categoria;
  if (parsed.data.tabela !== undefined) updates.tabela = parsed.data.tabela;

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No fields to update" });
    return;
  }

  const [dict] = await db
    .update(dictionariesTable)
    .set(updates)
    .where(eq(dictionariesTable.id, params.data.id))
    .returning();

  if (!dict) {
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
    })
  );
});

router.delete("/dictionaries/:id", async (req, res): Promise<void> => {
  const params = DeleteDictionaryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [dict] = await db
    .delete(dictionariesTable)
    .where(eq(dictionariesTable.id, params.data.id))
    .returning();

  if (!dict) {
    res.status(404).json({ error: "Dictionary not found" });
    return;
  }

  res.sendStatus(204);
});

router.get("/dictionaries/:id/export", async (req, res): Promise<void> => {
  const params = ExportDictionaryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [dict] = await db
    .select()
    .from(dictionariesTable)
    .where(eq(dictionariesTable.id, params.data.id));

  if (!dict) {
    res.status(404).json({ error: "Dictionary not found" });
    return;
  }

  const format = typeof req.query.format === "string" ? req.query.format : "json";
  const fieldsWithSummaries = await getFieldsWithSummaries(dict.id);

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

    const rows = fieldsWithSummaries.map((f) =>
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
      ].join(",")
    );

    const content = [header, ...rows].join("\n");
    const filename = `${dict.tabela}_v${dict.version}.csv`;

    res.json(ExportDictionaryResponse.parse({ format: "csv", filename, content }));
    return;
  }

  const exportData = {
    processo: dict.processo,
    categoria: dict.categoria,
    tabela: dict.tabela,
    version: dict.version,
    exportedAt: new Date().toISOString(),
    campos: fieldsWithSummaries.map((f) => ({
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

  const filename = `${dict.tabela}_v${dict.version}.json`;
  res.json(ExportDictionaryResponse.parse({ format: "json", filename, content: JSON.stringify(exportData, null, 2) }));
});

export default router;
