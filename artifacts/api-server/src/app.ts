import express, {
  type Express,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

// CORS: support wildcard subdomains for Vercel preview deployments
// ALLOWED_ORIGINS can contain wildcards like "https://*.vercel.app"
const allowedOriginsRaw = process.env.ALLOWED_ORIGINS;
if (allowedOriginsRaw && allowedOriginsRaw.trim().length > 0) {
  const allowedPatterns = allowedOriginsRaw
    .split(",")
    .map((o) => o.trim().replace(/\/$/, ""))
    .filter(Boolean);
  
  const corsOptions: cors.CorsOptions = {
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);
      
      const normalizedOrigin = origin.replace(/\/$/, "");
      
      for (const pattern of allowedPatterns) {
        if (pattern === normalizedOrigin) {
          return callback(null, true);
        }
        // Support wildcard subdomains like https://*.vercel.app
        if (pattern.includes("*")) {
          const regex = new RegExp("^" + pattern.replace(/\./g, "\\.").replace(/\*/g, ".*") + "$");
          if (regex.test(normalizedOrigin)) {
            return callback(null, true);
          }
        }
      }
      
      callback(new Error(`CORS blocked: ${normalizedOrigin}`), false);
    },
    credentials: true,
  };
  app.use(cors(corsOptions));
} else {
  // Dev mode: permissive CORS
  app.use(cors());
}
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// Global error handler: converts thrown errors into JSON 500s with pino logging
// deno-fmt-ignore
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err }, "Unhandled error");
  if (res.headersSent) return;
  res.status(500).json({ error: err.message || "Erro interno do servidor" });
});

export default app;
