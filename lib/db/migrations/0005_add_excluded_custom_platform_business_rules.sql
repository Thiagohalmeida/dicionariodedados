ALTER TABLE "fields" ADD COLUMN "excluded" boolean DEFAULT false NOT NULL;
ALTER TABLE "fields" ADD COLUMN "custom_internal_platform" text;
ALTER TABLE "fields" ADD COLUMN "business_rule_expression" text;
ALTER TABLE "fields" ADD COLUMN "business_rule_sql" text;