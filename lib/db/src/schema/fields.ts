import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { dictionariesTable } from "./dictionaries";

export const fieldsTable = pgTable("fields", {
  id: serial("id").primaryKey(),
  dictionaryId: integer("dictionary_id").notNull().references(() => dictionariesTable.id, { onDelete: "cascade" }),
  campoOrigem: text("campo_origem").notNull(),
  descricao: text("descricao").notNull(),
  origem: text("origem").notNull(),
  periodicidade: text("periodicidade").notNull(),
  campoTecnico: text("campo_tecnico").notNull(),
  tipoDado: text("tipo_dado").notNull(),
  chave: boolean("chave").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertFieldSchema = createInsertSchema(fieldsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertField = z.infer<typeof insertFieldSchema>;
export type Field = typeof fieldsTable.$inferSelect;
