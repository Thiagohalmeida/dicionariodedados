ALTER TABLE "fields" ADD COLUMN "excluded" boolean DEFAULT false NOT NULL;
ALTER TABLE "fields" ADD COLUMN "custom_internal_platform" text;