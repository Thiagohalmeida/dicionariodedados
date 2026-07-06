import { eq, inArray } from "drizzle-orm";
import { db, fieldsTable, validationsTable } from "@workspace/db";
import {
  FIELD_STATUS,
  FIELD_CLASSIFICATION,
  SCORE_THRESHOLDS,
} from "./constants";

export type FieldStatus = (typeof FIELD_STATUS)[keyof typeof FIELD_STATUS];
export type FieldClassification = (typeof FIELD_CLASSIFICATION)[keyof typeof FIELD_CLASSIFICATION];

export type FieldSummary = {
  fieldId: number;
  totalValidations: number;
  approvedCount: number;
  rejectedCount: number;
  conflictCount: number;
  statusFinal: FieldStatus;
  score: number | null;
  classification: FieldClassification;
  avgUsed: number | null;
  avgRequired: number | null;
  avgCorrectName: number | null;
  avgCorrectOrigin: number | null;
  avgHasBusinessRule: number | null;
};

function classify(score: number | null, totalValidations: number): FieldClassification {
  if (totalValidations === 0 || score === null) return FIELD_CLASSIFICATION.PENDING;
  if (score >= SCORE_THRESHOLDS.RELIABLE) return FIELD_CLASSIFICATION.RELIABLE;
  if (score >= SCORE_THRESHOLDS.ATTENTION) return FIELD_CLASSIFICATION.ATTENTION;
  return FIELD_CLASSIFICATION.CRITICAL;
}

function computeSummaryFromValidations(fieldId: number, validations: typeof import("@workspace/db").validationsTable.$inferSelect[]): FieldSummary {
  if (validations.length === 0) {
    return {
      fieldId,
      totalValidations: 0,
      approvedCount: 0,
      rejectedCount: 0,
      conflictCount: 0,
      statusFinal: FIELD_STATUS.PENDING,
      score: null,
      classification: FIELD_CLASSIFICATION.PENDING,
      avgUsed: null,
      avgRequired: null,
      avgCorrectName: null,
      avgCorrectOrigin: null,
      avgHasBusinessRule: null,
    };
  }

  const scores = validations.map((v) => Number(v.score));
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;

  const avgUsed = validations.filter((v) => v.used).length / validations.length;
  const avgRequired = validations.filter((v) => v.required).length / validations.length;
  const avgCorrectName = validations.filter((v) => v.correctName).length / validations.length;
  const avgCorrectOrigin = validations.filter((v) => v.correctOrigin).length / validations.length;
  const avgHasBusinessRule = validations.filter((v) => v.hasBusinessRule).length / validations.length;

  const approvedCount = validations.filter((v) => Number(v.score) >= SCORE_THRESHOLDS.APPROVE).length;
  const rejectedCount = validations.filter((v) => Number(v.score) < SCORE_THRESHOLDS.APPROVE).length;

  let statusFinal: FieldStatus;
  if (approvedCount > 0 && rejectedCount > 0) {
    statusFinal = FIELD_STATUS.CONFLICT;
  } else if (approvedCount > 0) {
    statusFinal = FIELD_STATUS.APPROVED;
  } else {
    statusFinal = FIELD_STATUS.REJECTED;
  }

  const roundedScore = Math.round(avgScore * 100) / 100;

  return {
    fieldId,
    totalValidations: validations.length,
    approvedCount,
    rejectedCount,
    conflictCount: statusFinal === FIELD_STATUS.CONFLICT ? 1 : 0,
    statusFinal,
    score: roundedScore,
    classification: classify(roundedScore, validations.length),
    avgUsed: Math.round(avgUsed * 100) / 100,
    avgRequired: Math.round(avgRequired * 100) / 100,
    avgCorrectName: Math.round(avgCorrectName * 100) / 100,
    avgCorrectOrigin: Math.round(avgCorrectOrigin * 100) / 100,
    avgHasBusinessRule: Math.round(avgHasBusinessRule * 100) / 100,
  };
}

export async function computeFieldSummariesBatch(fieldIds: number[]): Promise<Map<number, FieldSummary>> {
  if (fieldIds.length === 0) return new Map();

  const validations = await db
    .select()
    .from(validationsTable)
    .where(inArray(validationsTable.fieldId, fieldIds));

  const validationsByField = new Map<number, typeof validations>();
  for (const v of validations) {
    const list = validationsByField.get(v.fieldId) ?? [];
    list.push(v);
    validationsByField.set(v.fieldId, list);
  }

  const result = new Map<number, FieldSummary>();
  for (const fieldId of fieldIds) {
    const fieldValidations = validationsByField.get(fieldId) ?? [];
    result.set(fieldId, computeSummaryFromValidations(fieldId, fieldValidations as any));
  }
  return result;
}

export async function computeFieldSummary(fieldId: number): Promise<FieldSummary> {
  const validations = await db
    .select()
    .from(validationsTable)
    .where(eq(validationsTable.fieldId, fieldId));

  return computeSummaryFromValidations(fieldId, validations as any);
}

export async function getFieldsWithSummaries(dictionaryId: number) {
  const fields = await db
    .select()
    .from(fieldsTable)
    .where(eq(fieldsTable.dictionaryId, dictionaryId));

  if (fields.length === 0) return [];

  const fieldIds = fields.map((f) => f.id);
  const summaries = await computeFieldSummariesBatch(fieldIds);

  return fields.map((f) => ({
    id: f.id,
    dictionaryId: f.dictionaryId,
    campoOrigem: f.campoOrigem,
    descricao: f.descricao,
    origem: f.origem,
    periodicidade: f.periodicidade,
    campoTecnico: f.campoTecnico,
    tipoDado: f.tipoDado,
    chave: f.chave,
    summary: summaries.get(f.id)!,
  }));
}
