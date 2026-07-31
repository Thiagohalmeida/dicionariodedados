-- Create catalog_domains table
CREATE TABLE "catalog_domains" (
    "id" serial PRIMARY KEY NOT NULL,
    "assunto" text NOT NULL,
    "owner" text,
    "area_negocio" text,
    "palavras_chave" text[],
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Create catalog_tables table
CREATE TABLE "catalog_tables" (
    "id" serial PRIMARY KEY NOT NULL,
    "domain_id" integer NOT NULL REFERENCES "catalog_domains"("id") ON DELETE CASCADE,
    "schema" text NOT NULL,
    "nome" text NOT NULL,
    "descricao" text,
    "camada" text NOT NULL CHECK ("camada" IN ('RFN', 'RAW')),
    "data_owner" text,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Create catalog_columns table
CREATE TABLE "catalog_columns" (
    "id" serial PRIMARY KEY NOT NULL,
    "table_id" integer NOT NULL REFERENCES "catalog_tables"("id") ON DELETE CASCADE,
    "nome" text NOT NULL,
    "tipo" text NOT NULL,
    "descricao" text,
    "pk" boolean DEFAULT false NOT NULL,
    "obrigatorio" boolean DEFAULT false NOT NULL,
    "confidencialidade" text CHECK ("confidencialidade" IN ('publica', 'interna', 'restrita', 'confidencial')),
    "classificacao_lgpd" text CHECK ("classificacao_lgpd" IN ('pessoal', 'sensivel', 'nao_pessoal', 'anonimizado')),
    "identificavel" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Create catalog_indicators table
CREATE TABLE "catalog_indicators" (
    "id" serial PRIMARY KEY NOT NULL,
    "domain_id" integer NOT NULL REFERENCES "catalog_domains"("id") ON DELETE CASCADE,
    "nome" text NOT NULL,
    "formula" text,
    "meta" text,
    "frequencia" text,
    "homologadores" text[],
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Create catalog_requirements table
CREATE TABLE "catalog_requirements" (
    "id" serial PRIMARY KEY NOT NULL,
    "domain_id" integer NOT NULL REFERENCES "catalog_domains"("id") ON DELETE CASCADE,
    "assunto" text NOT NULL,
    "descricao" text,
    "regras_negocio" text,
    "status" text,
    "data_levantamento" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Create catalog_etl_packages table
CREATE TABLE "catalog_etl_packages" (
    "id" serial PRIMARY KEY NOT NULL,
    "nome" text NOT NULL UNIQUE,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Create catalog_table_etl junction table
CREATE TABLE "catalog_table_etl" (
    "table_id" integer NOT NULL REFERENCES "catalog_tables"("id") ON DELETE CASCADE,
    "etl_package_id" integer NOT NULL REFERENCES "catalog_etl_packages"("id") ON DELETE CASCADE,
    PRIMARY KEY ("table_id", "etl_package_id")
);

-- Add catalog_column_id to fields table
ALTER TABLE "fields" ADD COLUMN "catalog_column_id" integer REFERENCES "catalog_columns"("id") ON DELETE SET NULL;

-- Create indexes for better query performance
CREATE INDEX "idx_catalog_tables_domain_id" ON "catalog_tables"("domain_id");
CREATE INDEX "idx_catalog_columns_table_id" ON "catalog_columns"("table_id");
CREATE INDEX "idx_catalog_indicators_domain_id" ON "catalog_indicators"("domain_id");
CREATE INDEX "idx_catalog_requirements_domain_id" ON "catalog_requirements"("domain_id");
CREATE INDEX "idx_catalog_table_etl_table_id" ON "catalog_table_etl"("table_id");
CREATE INDEX "idx_catalog_table_etl_etl_package_id" ON "catalog_table_etl"("etl_package_id");
CREATE INDEX "idx_fields_catalog_column_id" ON "fields"("catalog_column_id");

-- Create trigram indexes for fuzzy search (requires pg_trgm extension)
-- CREATE EXTENSION IF NOT EXISTS pg_trgm;
-- CREATE INDEX idx_catalog_columns_nome_trgm ON "catalog_columns" USING gin ("nome" gin_trgm_ops);
-- CREATE INDEX idx_catalog_columns_descricao_trgm ON "catalog_columns" USING gin ("descricao" gin_trgm_ops);
-- CREATE INDEX idx_catalog_tables_nome_trgm ON "catalog_tables" USING gin ("nome" gin_trgm_ops);