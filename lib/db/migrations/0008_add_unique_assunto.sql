-- Add unique constraint to catalog_domains.assunto
ALTER TABLE "catalog_domains" ADD CONSTRAINT "catalog_domains_assunto_unique" UNIQUE ("assunto");