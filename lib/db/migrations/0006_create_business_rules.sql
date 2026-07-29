-- Create business_rules table and enum (idempotent)
DO $$
BEGIN
    -- Create enum if not exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'business_rule_type'
    ) THEN
        CREATE TYPE "public"."business_rule_type" AS ENUM('constraint', 'generated_column', 'check', 'lookup');
    END IF;

    -- Create table if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'business_rules'
    ) THEN
        CREATE TABLE "business_rules" (
            "id" serial PRIMARY KEY NOT NULL,
            "name" text NOT NULL,
            "field_ids" integer[] NOT NULL,
            "expression" text,
            "sql" text,
            "rule_type" "business_rule_type" DEFAULT 'check' NOT NULL,
            "created_at" timestamp with time zone DEFAULT now() NOT NULL
        );
    END IF;
END $$;