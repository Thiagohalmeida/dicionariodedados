import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import "dotenv/config";

async function applyMigration() {
  console.log("Aplicando migração 0012: unique constraint on catalog_requirements (domain_id, assunto)");
  
  try {
    await db.execute(sql`ALTER TABLE "catalog_requirements" ADD CONSTRAINT "catalog_requirements_domain_id_assunto_unique" UNIQUE ("domain_id", "assunto")`);
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