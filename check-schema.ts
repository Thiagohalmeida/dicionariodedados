import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import "dotenv/config";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false,
});

async function checkSchema() {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'fields' 
      ORDER BY ordinal_position
    `);
    console.log("Fields table columns:");
    console.table(result.rows);
    
    const result2 = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'dictionaries' 
      ORDER BY ordinal_position
    `);
    console.log("\nDictionaries table columns:");
    console.table(result2.rows);
  } finally {
    client.release();
    await pool.end();
  }
}

checkSchema().catch(console.error);