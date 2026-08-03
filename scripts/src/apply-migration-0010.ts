import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import "dotenv/config";

async function applyMigration() {
  console.log("Aplicando migração 0010: unique constraint on catalog_columns (table_id, nome)");
  
  try {
    await db.execute(sql`ALTER TABLE "catalog_columns" ADD CONSTRAINT "catalog_columns_table_id_nome_unique" UNIQUE ("table_id", "nome")`);
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