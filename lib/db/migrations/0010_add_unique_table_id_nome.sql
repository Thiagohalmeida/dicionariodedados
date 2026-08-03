-- Add unique constraint to catalog_columns (table_id, nome)
ALTER TABLE "catalog_columns" ADD CONSTRAINT "catalog_columns_table_id_nome_unique" UNIQUE ("table_id", "nome");