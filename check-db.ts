import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

async function checkDB() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL not set');
    process.exit(1);
  }
  
  console.log('Connecting to:', connectionString.replace(/:.*@/, ':****@'));
  
  // Try with SSL
  const client = postgres(connectionString + '?sslmode=require', { max: 1 });
  
  try {
    // Test connection
    const result = await client`SELECT version()`;
    console.log('Connected! PostgreSQL version:', result[0].version);
    
    // Check tables
    const tables = await client`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    console.log('Tables:', tables.map(t => t.table_name).join(', '));
    
    // Check dictionaries
    const dicts = await client`SELECT * FROM dictionaries`;
    console.log('Dictionaries:', dicts.length);
    
    // Check fields
    const fields = await client`SELECT * FROM fields`;
    console.log('Fields:', fields.length);
    
    // Check validations
    const validations = await client`SELECT * FROM validations`;
    console.log('Validations:', validations.length);
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

checkDB();