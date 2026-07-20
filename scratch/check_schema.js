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

async function checkSchema() {
  try {
    const connection = await mysql.createConnection(dbConfig);
    console.log('Connected to DB');
    const [rows] = await connection.execute('DESCRIBE company_info');
    console.log('Company Info Schema:', rows);
    const [rows2] = await connection.execute('DESCRIBE orders');
    console.log('Orders Schema:', rows2);
    await connection.end();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

checkSchema();
