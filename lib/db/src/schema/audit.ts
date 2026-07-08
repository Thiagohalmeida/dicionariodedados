import { pgTable, text, serial, timestamp, integer, jsonb, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const auditActionEnum = pgEnum("audit_action", ["create", "update", "delete", "validate", "export", "import"]);

export const auditLogsTable = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  action: auditActionEnum("action").notNull(),
  entityType: text("entity_type").notNull(), // "dictionary", "field", "validation", "file"
  entityId: integer("entity_id").notNull(),
  userId: text("user_id"), // Supabase auth user ID (nullable for anonymous)
  userEmail: text("user_email"),
  before: jsonb("before"), // JSON snapshot before change
  after: jsonb("after"), // JSON snapshot after change
  metadata: jsonb("metadata"), // Additional context (IP, user agent, etc.)
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAuditLogSchema = createInsertSchema(auditLogsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogsTable.$inferSelect;

export const storageObjectsTable = pgTable("storage_objects", {
  id: serial("id").primaryKey(),
  bucket: text("bucket").notNull(),
  path: text("path").notNull(),
  originalName: text("original_name"),
  contentType: text("content_type"),
  size: integer("size").notNull(),
  uploadedBy: text("uploaded_by"),
  dictionaryId: integer("dictionary_id"), // Link to dictionary if applicable
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertStorageObjectSchema = createInsertSchema(storageObjectsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertStorageObject = z.infer<typeof insertStorageObjectSchema>;
export type StorageObject = typeof storageObjectsTable.$inferSelect;