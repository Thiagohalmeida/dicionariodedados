import { Request, Response, NextFunction } from "express";
import { db, auditLogsTable, type InsertAuditLog } from "@workspace/db";

interface AuditRequest extends Request {
  auditBody?: unknown;
  auditBefore?: unknown;
}

export function auditMiddleware(action: string, entityType: string) {
  return async (req: AuditRequest, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);

    let responseBody: unknown;
    const startTime = Date.now();

    // Capture response
    res.json = (body: unknown) => {
      responseBody = body;
      return originalJson(body);
    };
    res.send = (body?: unknown) => {
      if (body && !responseBody) responseBody = body;
      return originalSend(body);
    };

    // Store original body for "before" snapshot if needed
    if (["PUT", "PATCH", "DELETE"].includes(req.method)) {
      // We'll fetch the entity before the route handler runs
      // This is a simplified version - in production you might want to fetch the actual entity
      req.auditBody = req.body;
    }

    res.on("finish", async () => {
      // Only audit mutating operations
      if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) return;
      // Skip health check and non-API routes
      if (!req.path.startsWith("/api/")) return;
      // Skip audit logs themselves to avoid infinite loop
      if (req.path.includes("/audit")) return;

      try {
        const userId = (req as any).user?.id; // From auth middleware if available
        const userEmail = (req as any).user?.email;

        // Determine entity ID from params or response
        let entityId = 0;
        const paramId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        if (paramId) {
          entityId = parseInt(paramId, 10);
        } else if (responseBody && typeof responseBody === "object" && "id" in responseBody) {
          entityId = (responseBody as any).id;
        }

        if (!entityId) return;

const userAgentHeader = req.get("user-agent");
            const userAgent = Array.isArray(userAgentHeader) ? userAgentHeader[0] : userAgentHeader ?? "";
            const auditLog: InsertAuditLog = {
              action: action as any,
              entityType,
              entityId,
              userId: userId ?? null,
              userEmail: userEmail ?? null,
              before: req.auditBody ?? null,
              after: responseBody && typeof responseBody === "object" ? responseBody : null,
              metadata: {
                method: req.method,
                path: req.path,
                ip: req.ip ?? "",
                userAgent,
                durationMs: Date.now() - startTime,
                statusCode: res.statusCode,
              },
            };

        await db.insert(auditLogsTable).values(auditLog);
      } catch (err) {
        // Don't throw - audit failures shouldn't break the API
        console.error("Audit log failed:", err);
      }
    });

    next();
  };
}

// Specific middleware for different entity types
export const auditDictionary = auditMiddleware("create", "dictionary");
export const auditField = auditMiddleware("create", "field");
export const auditValidation = auditMiddleware("create", "validation");
export const auditExport = auditMiddleware("export", "dictionary");
export const auditImport = auditMiddleware("import", "dictionary");