import {
  pgTable,
  text,
  serial,
  timestamp,
  integer,
  boolean,
  numeric,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { fieldsTable } from "./fields";

export const originTypeEnum = pgEnum("origin_type", [
  "interno",
  "externo",
]);

export const originDetailEnum = pgEnum("origin_detail", [
  "sap",
  "m303m",
  "outro_interno",
  "fornecedor",
]);

export const validationsTable = pgTable("validations", {
  id: serial("id").primaryKey(),
  fieldId: integer("field_id")
    .notNull()
    .references(() => fieldsTable.id, { onDelete: "cascade" }),
  validatorName: text("validator_name").notNull(),
  used: boolean("used").notNull(),
  required: boolean("required").notNull(),
  correctName: boolean("correct_name").notNull(),
  correctOrigin: boolean("correct_origin").notNull(),
  originType: originTypeEnum("origin_type"),
  originDetail: originDetailEnum("origin_detail"),
  hasBusinessRule: boolean("has_business_rule").notNull(),
  businessRuleRationale: text("business_rule_rationale"),
  score: numeric("score", { precision: 5, scale: 2 }).notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertValidationSchema = createInsertSchema(validationsTable).omit(
  {
    id: true,
    createdAt: true,
  },
) as unknown as z.ZodType<any>;
export type InsertValidation = z.infer<typeof insertValidationSchema>;
export type Validation = typeof validationsTable.$inferSelect;
