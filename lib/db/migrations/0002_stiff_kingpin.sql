CREATE TYPE "public"."formula_type" AS ENUM('nao', 'sim', 'suporte');--> statement-breakpoint
ALTER TABLE "fields" ADD COLUMN "formula" "formula_type" DEFAULT 'nao' NOT NULL;