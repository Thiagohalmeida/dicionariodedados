CREATE TABLE "business_rules" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "field_ids" integer[] NOT NULL,
  "expression" text,
  "sql" text,
  "rule_type" "business_rule_type" DEFAULT 'check' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TYPE "public"."business_rule_type" AS ENUM('constraint', 'generated_column', 'check', 'lookup');