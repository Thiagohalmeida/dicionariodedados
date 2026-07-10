import {
  pgTable,
  text,
  serial,
  timestamp,
  integer,
  boolean,
  numeric,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { fieldsTable } from "./fields";

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
  hasBusinessRule: boolean("has_business_rule").notNull(),
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
);
export type InsertValidation = z.infer<typeof insertValidationSchema>;
export type Validation = typeof validationsTable.$inferSelect;
