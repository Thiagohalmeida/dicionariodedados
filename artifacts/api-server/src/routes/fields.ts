import { Router, type IRouter } from "express";
import { eq, inArray, sql, desc, count } from "drizzle-orm";
import { db, fieldsTable, validationsTable, dictionariesTable } from "@workspace/db";
import {
  computeFieldSummary,
  computeFieldSummariesBatch,
  getFieldsWithSummaries,
} from "../lib/summary";
import { insertValidation } from "../lib/validation";
import { FIELD_CLASSIFICATION, SCORE_THRESHOLDS, DICTIONARY_STATUS } from "../lib/constants";
import {
  SubmitValidationParams,
  SubmitValidationBody,
  SubmitValidationResponse,
  GetFieldSummaryParams,
  GetFieldSummaryResponse,
  GetCriticalFieldsQueryParams,
  GetCriticalFieldsResponse,
  UpdateFieldParams,
  UpdateFieldBody,
  UpdateFieldResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.patch("/fields/:id", async (req, res): Promise<void> => {
  const params = UpdateFieldParams.safeParse({
    id: parseInt(req.params.id as string, 10),
  });
  if (!params.success) {
    req.log.error({ err: params.error }, "Invalid params");
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateFieldBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.error({ err: parsed.error }, "Invalid body");
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [field] = await db
    .select()
    .from(fieldsTable)
    .where(eq(fieldsTable.id, params.data.id));
  if (!field) {
    req.log.error({ fieldId: params.data.id }, "Field not found");
    res.status(404).json({ error: "Field not found" });
    return;
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.campoOrigem !== undefined)
    updates.campoOrigem = parsed.data.campoOrigem;
  if (parsed.data.descricao !== undefined)
    updates.descricao = parsed.data.descricao;
  if (parsed.data.origem !== undefined) updates.origem = parsed.data.origem;
  if (parsed.data.periodicidade !== undefined)
    updates.periodicidade = parsed.data.periodicidade;
  if (parsed.data.campoTecnico !== undefined)
    updates.campoTecnico = parsed.data.campoTecnico;
  if (parsed.data.tipoDado !== undefined)
    updates.tipoDado = parsed.data.tipoDado;
  if (parsed.data.chave !== undefined) updates.chave = parsed.data.chave;
  if (parsed.data.excluded !== undefined)
    updates.excluded = parsed.data.excluded;
  if (parsed.data.customInternalPlatform !== undefined)
    updates.customInternalPlatform = parsed.data.customInternalPlatform;

  if (Object.keys(updates).length === 0) {
    req.log.error({ fieldId: params.data.id }, "No fields to update");
    res.status(400).json({ error: "No fields to update" });
    return;
  }

  const [updated] = await db
    .update(fieldsTable)
    .set(updates)
    .where(eq(fieldsTable.id, params.data.id))
    .returning();

  res.json(
    UpdateFieldResponse.parse({
      id: updated.id,
      dictionaryId: updated.dictionaryId,
      campoOrigem: updated.campoOrigem,
      descricao: updated.descricao,
      origem: updated.origem,
      periodicidade: updated.periodicidade,
      campoTecnico: updated.campoTecnico,
      tipoDado: updated.tipoDado,
      chave: updated.chave,
    }),
  );
});

router.post("/fields/:id/validate", async (req, res): Promise<void> => {
  // Coerce params from strings to numbers
  const params = SubmitValidationParams.safeParse({
    id: parseInt(req.params.id as string, 10),
  });
  if (!params.success) {
    req.log.error({ err: params.error }, "Invalid params");
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = SubmitValidationBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.error({ err: parsed.error }, "Invalid body");
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [field] = await db
    .select()
    .from(fieldsTable)
    .where(eq(fieldsTable.id, params.data.id));
  if (!field) {
    req.log.error({ fieldId: params.data.id }, "Field not found");
    res.status(404).json({ error: "Field not found" });
    return;
  }

  const { used, required, correctName, correctOrigin, hasBusinessRule, originType, originDetail, businessRuleRationale } =
    parsed.data;
  const score =
    (used ? 20 : 0) +
    (required ? 20 : 0) +
    (correctName ? 20 : 0) +
    (correctOrigin ? 20 : 0) +
    (hasBusinessRule ? 20 : 0);

  const validation = await insertValidation({
    fieldId: field.id,
    validatorName: parsed.data.validatorName,
    used,
    required,
    correctName,
    correctOrigin,
    hasBusinessRule,
    originType: originType ?? null,
    originDetail: originDetail ?? null,
    businessRuleRationale: businessRuleRationale ?? null,
    score: String(score),
    comment: parsed.data.comment ?? null,
  });

  // Update dictionary status after validation
  const [dict] = await db
    .select()
    .from(dictionariesTable)
    .where(eq(dictionariesTable.id, field.dictionaryId));
  
  if (dict && dict.status === DICTIONARY_STATUS.PENDING) {
    // First validation: move from pending to in_review
    await db
      .update(dictionariesTable)
      .set({ status: DICTIONARY_STATUS.IN_REVIEW })
      .where(eq(dictionariesTable.id, field.dictionaryId));
  } else if (dict && dict.status === DICTIONARY_STATUS.IN_REVIEW) {
    // Check if all fields now have validations
    const allFields = await db
      .select({ id: fieldsTable.id })
      .from(fieldsTable)
      .where(eq(fieldsTable.dictionaryId, field.dictionaryId));
    
    const fieldIds = allFields.map(f => f.id);
    const validatedFields = await db
      .select({ fieldId: validationsTable.fieldId })
      .from(validationsTable)
      .where(inArray(validationsTable.fieldId, fieldIds));
    
    const validatedFieldIds = new Set(validatedFields.map(v => v.fieldId));
    const allValidated = fieldIds.every(id => validatedFieldIds.has(id));
    
    if (allValidated && fieldIds.length > 0) {
      await db
        .update(dictionariesTable)
        .set({ status: DICTIONARY_STATUS.VALIDATED })
        .where(eq(dictionariesTable.id, field.dictionaryId));
    }
  }

  res.status(201).json(
    SubmitValidationResponse.parse({
      id: validation.id,
      fieldId: validation.fieldId,
      validatorName: validation.validatorName,
      used: validation.used,
      required: validation.required,
      correctName: validation.correctName,
      correctOrigin: validation.correctOrigin,
      hasBusinessRule: validation.hasBusinessRule,
      score: Number(validation.score),
      comment: validation.comment ?? null,
      createdAt: validation.createdAt.toISOString(),
    }),
  );
});

router.get("/fields/:id/summary", async (req, res): Promise<void> => {
  const params = GetFieldSummaryParams.safeParse({
    id: parseInt(req.params.id as string, 10),
  });
  if (!params.success) {
    req.log.error({ err: params.error }, "Invalid params");
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [field] = await db
    .select()
    .from(fieldsTable)
    .where(eq(fieldsTable.id, params.data.id));
  if (!field) {
    req.log.error({ fieldId: params.data.id }, "Field not found");
    res.status(404).json({ error: "Field not found" });
    return;
  }

  const summary = await computeFieldSummary(params.data.id);
  res.json(GetFieldSummaryResponse.parse(summary));
});

router.get("/fields/critical", async (req, res): Promise<void> => {
  // Coerce query params from strings to numbers
  const query = {
    page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
    limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
  };
  const parsedQuery = GetCriticalFieldsQueryParams.safeParse(query);
  if (!parsedQuery.success) {
    req.log.error({ err: parsedQuery.error }, "Invalid query params");
    res.status(400).json({ error: parsedQuery.error.message });
    return;
  }

  const { page, limit } = parsedQuery.data;
  const offset = (page - 1) * limit;

  // Get total count of critical fields
  // Critical = avg score < ATTENTION (only fields WITH validations)
  // Fields without validations are "pending", not "critical"
  const [{ count: totalCount }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(fieldsTable)
    .innerJoin(validationsTable, eq(validationsTable.fieldId, fieldsTable.id))
    .where(
      sql`
        (
          SELECT AVG(score)::numeric
          FROM ${validationsTable}
          WHERE ${validationsTable}.field_id = ${fieldsTable}.id
        ) < ${SCORE_THRESHOLDS.ATTENTION}
      `,
    );

  // Ensure totalCount is a number (Drizzle may return string)
  const total = Number(totalCount);

  // If no critical fields, return empty
  if (total === 0) {
    res.json(
      GetCriticalFieldsResponse.parse({
        data: [],
        total: 0,
        page,
        limit,
        totalPages: 1,
      }),
    );
    return;
  }

  // Get critical fields with summaries using DB-level pagination
  const criticalFields = await db
    .select({
      id: fieldsTable.id,
      dictionaryId: fieldsTable.dictionaryId,
      campoOrigem: fieldsTable.campoOrigem,
      descricao: fieldsTable.descricao,
      origem: fieldsTable.origem,
      periodicidade: fieldsTable.periodicidade,
      campoTecnico: fieldsTable.campoTecnico,
      tipoDado: fieldsTable.tipoDado,
      chave: fieldsTable.chave,
    })
    .from(fieldsTable)
    .innerJoin(validationsTable, eq(validationsTable.fieldId, fieldsTable.id))
    .where(
      sql`
        (
          SELECT AVG(score)::numeric
          FROM ${validationsTable}
          WHERE ${validationsTable}.field_id = ${fieldsTable}.id
        ) < ${SCORE_THRESHOLDS.ATTENTION}
      `,
    )
    .groupBy(fieldsTable.id)
    .orderBy(fieldsTable.campoOrigem)
    .limit(limit)
    .offset(offset);

  // Fetch summaries for the paginated critical fields
  const fieldIds = criticalFields.map((f) => f.id);
  const summaries = await computeFieldSummariesBatch(fieldIds);

  const data = criticalFields.map((field) => ({
    ...field,
    summary: summaries.get(field.id)!,
  }));

  const totalPages = Math.max(1, Math.ceil(total / limit));

  res.json(
    GetCriticalFieldsResponse.parse({
      data,
      total,
      page,
      limit,
      totalPages,
    }),
  );
});

export default router;
