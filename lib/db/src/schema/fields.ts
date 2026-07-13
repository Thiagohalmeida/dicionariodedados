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
import { dictionariesTable } from "./dictionaries";

export const formulaTypeEnum = pgEnum("formula_type", [
  "nao",
  "sim",
  "suporte",
]);

export const fieldsTable = pgTable("fields", {
  id: serial("id").primaryKey(),
  dictionaryId: integer("dictionary_id")
    .notNull()
    .references(() => dictionariesTable.id, { onDelete: "cascade" }),
  campoOrigem: text("campo_origem").notNull(),
  descricao: text("descricao").notNull(),
  origem: text("origem").notNull(),
  periodicidade: text("periodicidade").notNull(),
  campoTecnico: text("campo_tecnico").notNull(),
  tipoDado: text("tipo_dado").notNull(),
  chave: boolean("chave").notNull().default(false),
  formula: formulaTypeEnum("formula").notNull().default("nao"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertFieldSchema = createInsertSchema(fieldsTable).omit({
  id: true,
  createdAt: true,
}) as unknown as z.ZodType<any>;
export type InsertField = z.infer<typeof insertFieldSchema>;
export type Field = typeof fieldsTable.$inferSelect;
