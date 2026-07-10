import { db, validationsTable, type InsertValidation } from "@workspace/db";

export async function insertValidation(data: InsertValidation) {
  const [validation] = await db
    .insert(validationsTable)
    .values(data)
    .returning();
  return validation;
}
