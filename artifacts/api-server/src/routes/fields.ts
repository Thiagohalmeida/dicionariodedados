import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, fieldsTable, dictionariesTable } from "@workspace/db";
import {
  SubmitValidationParams,
  SubmitValidationBody,
  SubmitValidationResponse,
  GetFieldSummaryParams,
  GetFieldSummaryResponse,
  GetCriticalFieldsResponse,
} from "@workspace/api-zod";
import { computeFieldSummary, getFieldsWithSummaries } from "../lib/summary";
import { insertValidation } from "../lib/validation";

const router: IRouter = Router();

router.post("/fields/:id/validate", async (req, res): Promise<void> => {
  const params = SubmitValidationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = SubmitValidationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [field] = await db.select().from(fieldsTable).where(eq(fieldsTable.id, params.data.id));
  if (!field) {
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
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [field] = await db.select().from(fieldsTable).where(eq(fieldsTable.id, params.data.id));
  if (!field) {
    res.status(404).json({ error: "Field not found" });
    return;
  }

  const summary = await computeFieldSummary(params.data.id);
  res.json(GetFieldSummaryResponse.parse(summary));
});

router.get("/fields/critical", async (_req, res): Promise<void> => {
  const dicts = await db.select().from(dictionariesTable);
  const result: unknown[] = [];

  for (const dict of dicts) {
    const fields = await db.select().from(fieldsTable).where(eq(fieldsTable.dictionaryId, dict.id));
    for (const field of fields) {
      const summary = await computeFieldSummary(field.id);
      if (summary.classification === "critical") {
        result.push({
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
  }

  res.json(GetCriticalFieldsResponse.parse(result));
});

export default router;
