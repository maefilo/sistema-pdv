import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'mae_filho',
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306,
};

async function updateLiveSchema() {
  try {
    const connection = await mysql.createConnection(dbConfig);
    console.log('Connected to DB');

    // Create services table if not exists
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS services (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        name VARCHAR(255) NOT NULL,
        price DECIMAL(10,2) NOT NULL DEFAULT 0.00
      )
    `);
    console.log('✅ Services table checked/created');

    // Create sections table if not exists
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS sections (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        name VARCHAR(255) NOT NULL
      )
    `);
    console.log('✅ Sections table checked/created');

    // Add section_id to orders if it doesn't exist
    try {
        await connection.execute('ALTER TABLE orders ADD COLUMN section_id VARCHAR(36)');
        console.log('✅ Column section_id added to orders');
    } catch (e) {
        if (e.code === 'ER_DUP_FIELDNAME') {
            console.log('ℹ️ Column section_id already exists in orders');
        } else {
            throw e;
        }
    }

    await connection.end();
  } catch (err) {
    console.error('❌ Error updating live schema:', err.message);
  }
}

updateLiveSchema();
