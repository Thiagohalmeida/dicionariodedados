CREATE TYPE "public"."dictionary_status" AS ENUM('pending', 'in_review', 'validated');--> statement-breakpoint
CREATE TYPE "public"."audit_action" AS ENUM('create', 'update', 'delete', 'validate', 'export', 'import');--> statement-breakpoint
CREATE TABLE "dictionaries" (
	"id" serial PRIMARY KEY NOT NULL,
	"processo" text NOT NULL,
	"categoria" text NOT NULL,
	"tabela" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"parent_id" integer,
	"status" "dictionary_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fields" (
	"id" serial PRIMARY KEY NOT NULL,
	"dictionary_id" integer NOT NULL,
	"campo_origem" text NOT NULL,
	"descricao" text NOT NULL,
	"origem" text NOT NULL,
	"periodicidade" text NOT NULL,
	"campo_tecnico" text NOT NULL,
	"tipo_dado" text NOT NULL,
	"chave" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "validations" (
	"id" serial PRIMARY KEY NOT NULL,
	"field_id" integer NOT NULL,
	"validator_name" text NOT NULL,
	"used" boolean NOT NULL,
	"required" boolean NOT NULL,
	"correct_name" boolean NOT NULL,
	"correct_origin" boolean NOT NULL,
	"has_business_rule" boolean NOT NULL,
	"score" numeric(5, 2) NOT NULL,
	"comment" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"action" "audit_action" NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" integer NOT NULL,
	"user_id" text,
	"user_email" text,
	"before" jsonb,
	"after" jsonb,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "storage_objects" (
	"id" serial PRIMARY KEY NOT NULL,
	"bucket" text NOT NULL,
	"path" text NOT NULL,
	"original_name" text,
	"content_type" text,
	"size" integer NOT NULL,
	"uploaded_by" text,
	"dictionary_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fields" ADD CONSTRAINT "fields_dictionary_id_dictionaries_id_fk" FOREIGN KEY ("dictionary_id") REFERENCES "public"."dictionaries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "validations" ADD CONSTRAINT "validations_field_id_fields_id_fk" FOREIGN KEY ("field_id") REFERENCES "public"."fields"("id") ON DELETE cascade ON UPDATE no action;