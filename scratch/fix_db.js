import mysql from 'mysql2';
import dotenv from 'dotenv';
import fs from 'fs';
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
  
  const imagePath = 'C:\\Users\\USER\\.gemini\\antigravity\\brain\\35263d09-5398-4b2a-a3f5-fe81e1906cf6\\media__1778030148551.jpg';
  const base64Image = fs.readFileSync(imagePath, { encoding: 'base64' });
  const dataUri = `data:image/jpeg;base64,${base64Image}`;

  const query = "UPDATE company_info SET logo = ?, name = 'MÃE & FILHO CONFECÇÃO' WHERE `key` = 'singleton'";
  
  db.query(query, [dataUri], (err, results) => {
      if (err) {
          console.error(`Erro ao atualizar: ${err.message}`);
      } else {
          console.log(`Sucesso! Linhas afetadas: ${results.affectedRows}`);
      }
      db.end();
  });
});
