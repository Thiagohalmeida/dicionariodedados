import {
  pgTable,
  text,
  serial,
  timestamp,
  integer,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const dictionaryStatusEnum = pgEnum("dictionary_status", [
  "pending",
  "in_review",
  "validated",
]);

export const dictionariesTable = pgTable("dictionaries", {
  id: serial("id").primaryKey(),
  processo: text("processo").notNull(),
  categoria: text("categoria").notNull(),
  tabela: text("tabela").notNull(),
  version: integer("version").notNull().default(1),
  parentId: integer("parent_id"),
  status: dictionaryStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertDictionarySchema = createInsertSchema(
  dictionariesTable,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}) as unknown as z.ZodType<any>;
export type InsertDictionary = z.infer<typeof insertDictionarySchema>;
export type Dictionary = typeof dictionariesTable.$inferSelect;
