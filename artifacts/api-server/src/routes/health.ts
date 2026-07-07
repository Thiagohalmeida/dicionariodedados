import { Router, type IRouter, type Request, type Response } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { pool } from "@workspace/db";

const router: IRouter = Router();

router.get("/healthz", async (_req: Request, res: Response) => {
  let dbStatus = "ok";
  try {
    await pool.query("SELECT 1");
  } catch {
    dbStatus = "down";
  }

  const status = dbStatus === "ok" ? "ok" : "degraded";
  const data = HealthCheckResponse.parse({ status, database: dbStatus });
  res.status(status === "ok" ? 200 : 503).json(data);
});

export default router;
