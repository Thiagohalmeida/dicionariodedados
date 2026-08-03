-- Add unique constraint to catalog_requirements (domain_id, assunto)
ALTER TABLE "catalog_requirements" ADD CONSTRAINT "catalog_requirements_domain_id_assunto_unique" UNIQUE ("domain_id", "assunto");