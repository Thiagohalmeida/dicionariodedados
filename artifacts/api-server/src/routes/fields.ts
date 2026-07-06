import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, fieldsTable } from "@workspace/db";
import { computeFieldSummary, computeFieldSummariesBatch, getFieldsWithSummaries } from "../lib/summary";
import { insertValidation } from "../lib/validation";
import { FIELD_CLASSIFICATION } from "../lib/constants";
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
  const params = UpdateFieldParams.safeParse(req.params);
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

  const [field] = await db.select().from(fieldsTable).where(eq(fieldsTable.id, params.data.id));
  if (!field) {
    req.log.error({ fieldId: params.data.id }, "Field not found");
    res.status(404).json({ error: "Field not found" });
    return;
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.campoOrigem !== undefined) updates.campoOrigem = parsed.data.campoOrigem;
  if (parsed.data.descricao !== undefined) updates.descricao = parsed.data.descricao;
  if (parsed.data.origem !== undefined) updates.origem = parsed.data.origem;
  if (parsed.data.periodicidade !== undefined) updates.periodicidade = parsed.data.periodicidade;
  if (parsed.data.campoTecnico !== undefined) updates.campoTecnico = parsed.data.campoTecnico;
  if (parsed.data.tipoDado !== undefined) updates.tipoDado = parsed.data.tipoDado;
  if (parsed.data.chave !== undefined) updates.chave = parsed.data.chave;

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
    })
  );
});

router.post("/fields/:id/validate", async (req, res): Promise<void> => {
  const params = SubmitValidationParams.safeParse(req.params);
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

  const [field] = await db.select().from(fieldsTable).where(eq(fieldsTable.id, params.data.id));
  if (!field) {
    req.log.error({ fieldId: params.data.id }, "Field not found");
    res.status(404).json({ error: "Field not found" });
    return;
  }

  const { used, required, correctName, correctOrigin, hasBusinessRule } = parsed.data;
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
    score: String(score),
    comment: parsed.data.comment ?? null,
  });

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
    })
  );
});

router.get("/fields/:id/summary", async (req, res): Promise<void> => {
  const params = GetFieldSummaryParams.safeParse(req.params);
  if (!params.success) {
    req.log.error({ err: params.error }, "Invalid params");
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [field] = await db.select().from(fieldsTable).where(eq(fieldsTable.id, params.data.id));
  if (!field) {
    req.log.error({ fieldId: params.data.id }, "Field not found");
    res.status(404).json({ error: "Field not found" });
    return;
  }

  const summary = await computeFieldSummary(params.data.id);
  res.json(GetFieldSummaryResponse.parse(summary));
});

router.get("/fields/critical", async (req, res): Promise<void> => {
  const parsedQuery = GetCriticalFieldsQueryParams.safeParse(req.query);
  if (!parsedQuery.success) {
    req.log.error({ err: parsedQuery.error }, "Invalid query params");
    res.status(400).json({ error: parsedQuery.error.message });
    return;
  }

  const { page, limit } = parsedQuery.data;

  const allFields = await db.select().from(fieldsTable);

  if (allFields.length === 0) {
    res.json(
      GetCriticalFieldsResponse.parse({
        data: [],
        total: 0,
        page,
        limit,
        totalPages: 1,
      })
    );
    return;
  }

  const fieldIds = allFields.map((f) => f.id);
  const summaries = await computeFieldSummariesBatch(fieldIds);

  const allCritical: unknown[] = [];
  for (const field of allFields) {
    const summary = summaries.get(field.id)!;
    if (summary.classification === FIELD_CLASSIFICATION.CRITICAL) {
      allCritical.push({
        id: field.id,
        dictionaryId: field.dictionaryId,
        campoOrigem: field.campoOrigem,
        descricao: field.descricao,
        origem: field.origem,
        periodicidade: field.periodicidade,
        campoTecnico: field.campoTecnico,
        tipoDado: field.tipoDado,
        chave: field.chave,
        summary,
      });
    }
  }

  const total = allCritical.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const offset = (page - 1) * limit;
  const data = allCritical.slice(offset, offset + limit);

  res.json(
    GetCriticalFieldsResponse.parse({
      data,
      total,
      page,
      limit,
      totalPages,
    })
  );
});

export default router;
