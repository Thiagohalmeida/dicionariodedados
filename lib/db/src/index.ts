import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import dns from "dns";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const databaseUrl = process.env.DATABASE_URL;
const isLocalhost =
  databaseUrl.includes("localhost") || databaseUrl.includes("127.0.0.1");

const poolConfig: any = {
  connectionString: databaseUrl,
  ssl: isLocalhost ? false : { rejectUnauthorized: false },
  lookup: (hostname: string, options: any, callback: (err: Error | null, address: string, family: number) => void) => {
    dns.lookup(hostname, { family: 4, ...options }, callback);
  },
};

export const pool = new Pool(poolConfig);
export const db = drizzle(pool, { schema });

export * from "./schema";
