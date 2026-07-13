CREATE TYPE "public"."origin_type" AS ENUM('interno', 'externo');
CREATE TYPE "public"."origin_detail" AS ENUM('sap', 'm303m', 'outro_interno', 'fornecedor');

ALTER TABLE "validations" 
  ADD COLUMN "origin_type" "public"."origin_type",
  ADD COLUMN "origin_detail" "public"."origin_detail",
  ADD COLUMN "business_rule_rationale" text;