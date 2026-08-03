-- Add unique constraint to catalog_indicators (domain_id, nome)
ALTER TABLE "catalog_indicators" ADD CONSTRAINT "catalog_indicators_domain_id_nome_unique" UNIQUE ("domain_id", "nome");