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

const data = {
  key: 'singleton',
  name: 'Empresa Teste Manual',
  logo: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
};

const keys = Object.keys(data);
const columns = keys.map(k => `\`${k}\``).join(', ');
const placeholders = keys.map(() => '?').join(', ');
const updateKeys = keys.filter(k => k !== 'key');
const setClause = updateKeys.map(k => `\`${k}\`=VALUES(\`${k}\`)`).join(', ');
const values = keys.map(k => data[k]);

const query = `INSERT INTO \`company_info\` (${columns}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${setClause}`;

console.log('Running query:', query);
console.log('Values:', values);

connection.query(query, values, (err, results) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('Results:', results);
  }
  connection.end();
});
