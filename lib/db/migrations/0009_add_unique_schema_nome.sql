-- Add unique constraint to catalog_tables (schema, nome)
ALTER TABLE "catalog_tables" ADD CONSTRAINT "catalog_tables_schema_nome_unique" UNIQUE ("schema", "nome");