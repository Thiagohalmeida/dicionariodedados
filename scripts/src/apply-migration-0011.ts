import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import "dotenv/config";

async function applyMigration() {
  console.log("Aplicando migração 0011: unique constraint on catalog_indicators (domain_id, nome)");
  
  try {
    await db.execute(sql`ALTER TABLE "catalog_indicators" ADD CONSTRAINT "catalog_indicators_domain_id_nome_unique" UNIQUE ("domain_id", "nome")`);
    console.log("Migração aplicada com sucesso!");
  } catch (error: any) {
    if (error.code === '42P16') {
      console.log("Constraint já existe, pulando...");
    } else {
      console.error("Erro ao aplicar migração:", error);
      throw error;
    }
  }
  
  process.exit(0);
}

applyMigration();