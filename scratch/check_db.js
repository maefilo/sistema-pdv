import mysql from 'mysql2';
import dotenv from 'dotenv';
dotenv.config();

const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'mae_filho',
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306,
});

db.connect((err) => {
  if (err) {
    console.error('Connection error:', err);
    process.exit(1);
  }
  db.query('SHOW COLUMNS FROM products;', (err, results) => {
    if (err) console.error(err);
    console.log('PRODUCTS COLUMNS:', results.map(r => r.Field));
    
    db.query('SHOW COLUMNS FROM raw_materials;', (err, results) => {
      if (err) console.error(err);
      console.log('RAW MATERIALS COLUMNS:', results.map(r => r.Field));
      db.end();
    });
  });
});
