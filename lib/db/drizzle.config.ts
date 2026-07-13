import { defineConfig } from "drizzle-kit";
import { fileURLToPath } from "url";
import path from "path";
import { readFileSync, existsSync } from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env from api-server only in local development (file exists)
// In Render/production, DATABASE_URL comes from environment variables
function loadDotEnv(filePath: string) {
  if (!existsSync(filePath)) return;
  const content = readFileSync(filePath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

// Only load local .env in development (file exists locally)
loadDotEnv(path.resolve(__dirname, "../../artifacts/api-server/.env"));

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL not set. Ensure the database is provisioned and DATABASE_URL environment variable is configured.");
}

const isLocalhost = databaseUrl.includes("localhost") || databaseUrl.includes("127.0.0.1");

export default defineConfig({
  schema: "./src/schema/index.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
    ssl: isLocalhost ? false : { rejectUnauthorized: false },
  },
  schemaFilter: ["public"],
  out: "./migrations",
});
