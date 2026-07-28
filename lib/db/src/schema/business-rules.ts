import {
  pgTable,
  text,
  serial,
  timestamp,
  integer,
  boolean,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { fieldsTable } from "./fields";

export const businessRuleTypeEnum = pgEnum("business_rule_type", [
  "constraint",
  "generated_column",
  "check",
  "lookup",
]);

export const businessRulesTable = pgTable("business_rules", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  fieldIds: integer("field_ids").array().notNull(),
  expression: text("expression"),
  sql: text("sql"),
  ruleType: businessRuleTypeEnum("rule_type").notNull().default("check"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertBusinessRuleSchema = createInsertSchema(businessRulesTable).omit({
  id: true,
  createdAt: true,
}) as unknown as z.ZodType<any>;
export type InsertBusinessRule = z.infer<typeof insertBusinessRuleSchema>;
export type BusinessRule = typeof businessRulesTable.$inferSelect;