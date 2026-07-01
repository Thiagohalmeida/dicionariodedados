import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, dictionariesTable, fieldsTable } from "@workspace/db";
import { GetDashboardResponse } from "@workspace/api-zod";
import { computeFieldSummary } from "../lib/summary";

const router: IRouter = Router();

router.get("/dashboard", async (_req, res): Promise<void> => {
  const dicts = await db.select().from(dictionariesTable).orderBy(dictionariesTable.createdAt);

  let totalFields = 0;
  let approvedFields = 0;
  let rejectedFields = 0;
  let pendingFields = 0;
  let conflictFields = 0;
  let totalScore = 0;
  let scoredFields = 0;

  const classificationCounts: Record<string, number> = {
    pending: 0,
    reliable: 0,
    attention: 0,
    critical: 0,
  };

  const statusCounts: Record<string, number> = {
    pending: 0,
    in_review: 0,
    validated: 0,
  };

  const dictionaryMetrics: unknown[] = [];

  for (const dict of dicts) {
    statusCounts[dict.status] = (statusCounts[dict.status] ?? 0) + 1;
    const fields = await db.select().from(fieldsTable).where(eq(fieldsTable.dictionaryId, dict.id));
    totalFields += fields.length;

    let dictApproved = 0;
    let dictRejected = 0;
    let dictPending = 0;
    let dictTotalScore = 0;
    let dictScoredFields = 0;

    for (const field of fields) {
      const summary = await computeFieldSummary(field.id);
      classificationCounts[summary.classification] = (classificationCounts[summary.classification] ?? 0) + 1;

      if (summary.statusFinal === "approved") { approvedFields++; dictApproved++; }
      else if (summary.statusFinal === "rejected") { rejectedFields++; dictRejected++; }
      else if (summary.statusFinal === "conflict") { conflictFields++; }
      else { pendingFields++; dictPending++; }

      if (summary.score !== null) {
        totalScore += summary.score;
        scoredFields++;
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
      approvedFields: dictApproved,
      rejectedFields: dictRejected,
      pendingFields: dictPending,
      avgScore: dictScoredFields > 0 ? Math.round((dictTotalScore / dictScoredFields) * 100) / 100 : null,
    });
  }

  const recentDictionaries = dictionaryMetrics.slice(-5).reverse();

  const dictionariesByStatus = Object.entries(statusCounts).map(([status, count]) => ({
    status,
    count,
  }));

  const fieldsByClassification = Object.entries(classificationCounts).map(([classification, count]) => ({
    classification,
    count,
  }));

  res.json(
    GetDashboardResponse.parse({
      totalDictionaries: dicts.length,
      totalFields,
      approvedFields,
      rejectedFields,
      pendingFields,
      conflictFields,
      globalScore: scoredFields > 0 ? Math.round((totalScore / scoredFields) * 100) / 100 : null,
      dictionariesByStatus,
      fieldsByClassification,
      recentDictionaries,
    })
  );
});

export default router;
