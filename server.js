import express from 'express';
import cors from 'cors';
import mysql from 'mysql2';
import dotenv from 'dotenv';
import crypto from 'crypto';

// Inicializa as variáveis de ambiente do arquivo .env (importante para rodar localmente)
dotenv.config();

// Log de diagnóstico
console.log('--- Diagnóstico de Variáveis de Ambiente ---');
const variaveisEsperadas = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'DB_PORT', 'DB_SSL', 'PORT'];
variaveisEsperadas.forEach(v => {
  console.log(`${v}: ${process.env[v] ? 'ENCONTRADA ✅' : 'NÃO ENCONTRADA ❌'}`);
});
console.log('-------------------------------------------');

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '50mb' }));

// Função auxiliar para limpar strings (remove aspas duplas, simples e curvas + espaços)
const cleanEnvVar = (val) => {
    if (!val) return '';
    return val.toString().trim().replace(/["'“”]/g, '');
};

const dbConfig = {
  host: cleanEnvVar(process.env.DB_HOST || 'localhost'),
  user: cleanEnvVar(process.env.DB_USER || 'root'),
  password: cleanEnvVar(process.env.DB_PASSWORD || ''),
  database: cleanEnvVar(process.env.DB_NAME || 'mae_filho'),
  port: process.env.DB_PORT ? parseInt(cleanEnvVar(process.env.DB_PORT)) : 4000,
};

console.log(`Debug Usuário: Tamanho=${dbConfig.user.length}, Começa com=${dbConfig.user.substring(0, 3)}...`);

if (process.env.DB_SSL === 'true') {
  dbConfig.ssl = { 
    rejectUnauthorized: false // Mais seguro para conexões em nuvem que podem não ter o certificado CA instalado no servidor do Render
  };
}

const db = mysql.createPool({
  ...dbConfig,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  decimalNumbers: true
});

// Teste de conexão inicial
console.log(`Tentando conectar ao banco em ${dbConfig.host}:${dbConfig.port}...`);
db.getConnection((err, connection) => {
  if (err) {
    console.error('❌ Erro crítico de conexão ao MySQL:', err.message);
    if (err.code === 'ECONNREFUSED') {
      console.error(`Dica: Verifique se a porta ${dbConfig.port} é a correta para o host ${dbConfig.host}.`);
    }
    if (err.code === 'HANDSHAKE_SSL_ERROR') console.error('Dica: Problema no SSL. Tente mudar rejectUnauthorized no código.');
    return;
  }
  console.log('✅ Conexão estabelecida com o Pool do MySQL!');
  connection.release();
});

// Auth Route
app.post('/api/auth/login', (req, res) => {
   const { email, password } = req.body;
   db.query('SELECT * FROM `users` WHERE `username` = ? AND `password` = ?', [email, password], (err, results) => {
       if (err) return res.status(500).json({error: err});
       if (results.length > 0) {
           res.json({ user: results[0] });
       } else {
           res.status(401).json({error: {message: 'Credenciais inválidas'}});
       }
   });
});

// GET Genérico para todas as tabelas
app.get('/api/:table', (req, res) => {
  const table = req.params.table;
  const allowedTables = ['company_info', 'user_permissions', 'users', 'products', 'raw_materials', 'clients', 'orders', 'services', 'sections'];
  if (!allowedTables.includes(table)) return res.status(403).json({error: 'Tabela inválida'});
  
  let orderQuery = '';
  if (['products', 'clients', 'raw_materials', 'services', 'sections'].includes(table)) {
    orderQuery = ' ORDER BY `name` ASC';
  } else if (table === 'orders') {
    orderQuery = ' ORDER BY `created_at` DESC';
  }

  db.query(`SELECT * FROM \`${table}\`${orderQuery}`, (err, results) => {
    if (err) {
      console.error(`Erro na tabela ${table}:`, err);
      return res.status(500).json({error: err, detail: err.message});
    }
    res.json(results);
  });
});

// Rota de Upsert (Para company_info, permissões e atualizações de usuários)
app.post('/api/:table/upsert', (req, res) => {
    const table = req.params.table;
    const data = req.body;
    
    Object.keys(data).forEach(k => {
      if (typeof data[k] === 'object' && data[k] !== null) {
        data[k] = JSON.stringify(data[k]);
      }
    });

    const keys = Object.keys(data);
    const columns = keys.map(k => `\`${k}\``).join(', ');
    const placeholders = keys.map(() => '?').join(', ');
    
    // Exclude the primary key (key or id) from the update clause to avoid issues in some MySQL versions
    const pk = (table === 'company_info' || table === 'user_permissions') ? 'key' : 'id';
    const updateKeys = keys.filter(k => k !== pk);
    const setClause = updateKeys.map(k => `\`${k}\`=VALUES(\`${k}\`)`).join(', ');
    
    const values = keys.map(k => data[k]);
    
    // Constrói explicitamente a cláusula UPDATE sem depender da função VALUES(), que está depreciada no MySQL 8.0.20+
    // Nota: Isso requer que os valores sejam repetidos na query ou usar um alias.
    // Por simplicidade e compatibilidade, usaremos a sintaxe de alias se suportada, mas por enquanto vamos apenas melhorar o log.
    
    const query = `INSERT INTO \`${table}\` (${columns}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${setClause || '`name`=`name`'}`;

    db.query(query, values, (err, results) => {
        if (err) {
            console.error(`❌ Erro no upsert da tabela ${table}:`, err.message);
            console.error(`Dados enviados:`, JSON.stringify(data).substring(0, 500) + '...');
            
            // Helpful error messages
            if (err.code === 'ER_NET_PACKET_TOO_LARGE') {
                console.error('Dica: O arquivo (logo) é muito grande para a configuração atual do MySQL (max_allowed_packet).');
            }

            return res.status(500).json({
                error: {
                    message: err.message,
                    code: err.code,
                    errno: err.errno
                }, 
                detail: err.message
            });
        }
        res.json(results);
    });
});

// POST Genérico
app.post('/api/:table', (req, res) => {
  const table = req.params.table;
  const data = req.body;
  
  // Garantir que um ID seja gerado se não vier no request e se não for uma tabela de chave singleton
  if (!data.id && table !== 'company_info' && table !== 'user_permissions') {
    data.id = crypto.randomUUID();
  }

  Object.keys(data).forEach(key => {
    if (typeof data[key] === 'object' && data[key] !== null) {
      data[key] = JSON.stringify(data[key]);
    }
  });
  
  db.query(`INSERT INTO \`${table}\` SET ?`, data, (err, results) => {
    if (err) return res.status(500).json({error: err});
    res.json({ id: data.id || results.insertId, ...data });
  });
});

// PUT Genérico
app.put('/api/:table/:id', (req, res) => {
    const table = req.params.table;
    const id = req.params.id;
    const data = req.body;
    const pk = (table === 'company_info' || table === 'user_permissions') ? 'key' : 'id';
    
    Object.keys(data).forEach(k => {
      if (typeof data[k] === 'object' && data[k] !== null) {
        data[k] = JSON.stringify(data[k]);
      }
    });

    db.query(`UPDATE \`${table}\` SET ? WHERE \`${pk}\` = ?`, [data, id], (err, results) => {
        if (err) return res.status(500).json({error: err});
        res.json(results);
    });
});

// DELETE Genérico
app.delete('/api/:table/:id', (req, res) => {
    const table = req.params.table;
    const id = req.params.id;
    const pk = (table === 'company_info' || table === 'user_permissions') ? 'key' : 'id';

    db.query(`DELETE FROM \`${table}\` WHERE \`${pk}\` = ?`, [id], (err, results) => {
        if (err) return res.status(500).json({error: err});
        res.json(results);
    });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 API rodando na porta HTTP ${PORT}`);
});
