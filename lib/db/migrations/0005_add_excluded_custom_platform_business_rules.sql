-- Add new columns to fields table (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'fields' AND column_name = 'excluded'
    ) THEN
        ALTER TABLE "fields" ADD COLUMN "excluded" boolean DEFAULT false NOT NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'fields' AND column_name = 'custom_internal_platform'
    ) THEN
        ALTER TABLE "fields" ADD COLUMN "custom_internal_platform" text;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'fields' AND column_name = 'business_rule_expression'
    ) THEN
        ALTER TABLE "fields" ADD COLUMN "business_rule_expression" text;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'fields' AND column_name = 'business_rule_sql'
    ) THEN
        ALTER TABLE "fields" ADD COLUMN "business_rule_sql" text;
    END IF;
END $$;