const mysql = require('mysql2');
const dotenv = require('dotenv');
dotenv.config();

const connection = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'mae_filho',
  port: process.env.DB_PORT || 3306
});

connection.query('DESCRIBE orders', (err, results) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('Columns in orders:', results.map(r => r.Field));
  }
  connection.end();
});
