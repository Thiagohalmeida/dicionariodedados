import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, dictionariesTable, fieldsTable } from "@workspace/db";
import { GetDashboardResponse } from "@workspace/api-zod";
import { computeFieldSummariesBatch, type FieldSummary } from "../lib/summary";
import {
  FIELD_STATUS,
  FIELD_CLASSIFICATION,
  DICTIONARY_STATUS,
} from "../lib/constants";

const router: IRouter = Router();

function getEmptyDashboardResponse() {
  return GetDashboardResponse.parse({
    totalDictionaries: 0,
    totalFields: 0,
    approvedFields: 0,
    rejectedFields: 0,
    pendingFields: 0,
    conflictFields: 0,
    globalScore: null,
    dictionariesByStatus: [],
    fieldsByClassification: [],
    recentDictionaries: [],
  });
}

function initClassificationCounts(): Record<string, number> {
  return {
    [FIELD_CLASSIFICATION.PENDING]: 0,
    [FIELD_CLASSIFICATION.RELIABLE]: 0,
    [FIELD_CLASSIFICATION.ATTENTION]: 0,
    [FIELD_CLASSIFICATION.CRITICAL]: 0,
  };
}

function initStatusCounts(): Record<string, number> {
  return {
    [DICTIONARY_STATUS.PENDING]: 0,
    [DICTIONARY_STATUS.IN_REVIEW]: 0,
    [DICTIONARY_STATUS.VALIDATED]: 0,
  };
}

// Shared tally function - counts fields by status final
function tallyByStatus(
  fields: typeof fieldsTable.$inferSelect[],
  allSummaries: Map<number, FieldSummary>
): {
  approvedFields: number;
  rejectedFields: number;
  pendingFields: number;
  conflictFields: number;
} {
  let approvedFields = 0;
  let rejectedFields = 0;
  let pendingFields = 0;
  let conflictFields = 0;

  for (const field of fields) {
    const summary = allSummaries.get(field.id)!;
    if (summary.statusFinal === FIELD_STATUS.APPROVED) {
      approvedFields++;
    } else if (summary.statusFinal === FIELD_STATUS.REJECTED) {
      rejectedFields++;
    } else if (summary.statusFinal === FIELD_STATUS.CONFLICT) {
      conflictFields++;
    } else {
      pendingFields++;
    }
  }

  return { approvedFields, rejectedFields, pendingFields, conflictFields };
}

function processFieldSummaries(
  fields: typeof fieldsTable.$inferSelect[],
  allSummaries: Map<number, FieldSummary>
) {
  const classificationCounts = initClassificationCounts();
  let totalFields = 0;
  let totalScore = 0;
  let scoredFields = 0;

  for (const field of fields) {
    totalFields++;
    const summary = allSummaries.get(field.id)!;
    classificationCounts[summary.classification] = (classificationCounts[summary.classification] ?? 0) + 1;

    if (summary.score !== null) {
      totalScore += summary.score;
      scoredFields++;
    }
  }

  const statusCounts = tallyByStatus(fields, allSummaries);

  return {
    totalFields,
    ...statusCounts,
    totalScore,
    scoredFields,
    classificationCounts,
  };
}

function processDictionaryMetrics(
  dicts: typeof dictionariesTable.$inferSelect[],
  fieldsByDict: Map<number, typeof fieldsTable.$inferSelect[]>,
  allSummaries: Map<number, FieldSummary>
) {
  const statusCounts = initStatusCounts();
  const dictionaryMetrics: Array<{
    id: number;
    processo: string;
    categoria: string;
    tabela: string;
    version: number;
    parentId: number | null;
    status: string;
    createdAt: string;
    totalFields: number;
    approvedFields: number;
    rejectedFields: number;
    pendingFields: number;
    avgScore: number | null;
  }> = [];

  for (const dict of dicts) {
    statusCounts[dict.status] = (statusCounts[dict.status] ?? 0) + 1;
    const fields = fieldsByDict.get(dict.id) ?? [];

    const fieldStatusCounts = tallyByStatus(fields, allSummaries);
    let dictTotalScore = 0;
    let dictScoredFields = 0;

    for (const field of fields) {
      const summary = allSummaries.get(field.id)!;
      if (summary.score !== null) {
        dictTotalScore += summary.score;
        dictScoredFields++;
      }
    }

    dictionaryMetrics.push({
      id: dict.id,
      processo: dict.processo,
      categoria: dict.categoria,
      tabela: dict.tabela,
      version: dict.version,
      parentId: dict.parentId ?? null,
      status: dict.status,
      createdAt: dict.createdAt.toISOString(),
      totalFields: fields.length,
      approvedFields: fieldStatusCounts.approvedFields,
      rejectedFields: fieldStatusCounts.rejectedFields,
      pendingFields: fieldStatusCounts.pendingFields,
      avgScore: dictScoredFields > 0 ? Math.round((dictTotalScore / dictScoredFields) * 100) / 100 : null,
    });
  }

  return { statusCounts, dictionaryMetrics };
}

router.get("/dashboard", async (_req, res): Promise<void> => {
  const dicts = await db.select().from(dictionariesTable).orderBy(desc(dictionariesTable.createdAt));

  if (dicts.length === 0) {
    res.json(getEmptyDashboardResponse());
    return;
  }

  const allFields = await db.select().from(fieldsTable);

  const fieldsByDict = new Map<number, typeof allFields>();
  const allFieldIds: number[] = [];

  for (const f of allFields) {
    const list = fieldsByDict.get(f.dictionaryId) ?? [];
    list.push(f);
    fieldsByDict.set(f.dictionaryId, list);
    allFieldIds.push(f.id);
  }

  const allSummaries = await computeFieldSummariesBatch(allFieldIds);

  const globalStats = processFieldSummaries(allFields, allSummaries);

  const { statusCounts, dictionaryMetrics } = processDictionaryMetrics(dicts, fieldsByDict, allSummaries);

  const recentDictionaries = dictionaryMetrics.slice(-5).reverse();

  const dictionariesByStatus = Object.entries(statusCounts).map(([status, count]) => ({
    status,
    count,
  }));

  const fieldsByClassification = Object.entries(globalStats.classificationCounts).map(([classification, count]) => ({
    classification,
    count,
  }));

  res.json(
    GetDashboardResponse.parse({
      totalDictionaries: dicts.length,
      totalFields: globalStats.totalFields,
      approvedFields: globalStats.approvedFields,
      rejectedFields: globalStats.rejectedFields,
      pendingFields: globalStats.pendingFields,
      conflictFields: globalStats.conflictFields,
      globalScore: globalStats.scoredFields > 0 ? Math.round((globalStats.totalScore / globalStats.scoredFields) * 100) / 100 : null,
      dictionariesByStatus,
      fieldsByClassification,
      recentDictionaries,
    })
  );
});

export default router;