CREATE TYPE "public"."origin_detail" AS ENUM('sap', 'm303m', 'outro_interno', 'fornecedor');--> statement-breakpoint
CREATE TYPE "public"."origin_type" AS ENUM('interno', 'externo');--> statement-breakpoint
ALTER TABLE "validations" ADD COLUMN "origin_type" "origin_type";--> statement-breakpoint
ALTER TABLE "validations" ADD COLUMN "origin_detail" "origin_detail";--> statement-breakpoint
ALTER TABLE "validations" ADD COLUMN "business_rule_rationale" text;