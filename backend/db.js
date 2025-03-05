const sql = require('mssql');

const sqlConfig = {
    connectionTimeout:30000,requestTimeout:80000,
      server: '192.168.100.9',
      authentication: {
        type: 'default',
        options: {
          userName: 'admin',
          password: 'admin1234',
        },
      },
      options: {
        database: 'MCCMAINDB',
        encrypt: true,
        trustServerCertificate: true,
      },
    };
let pool;

async function getPool() {
  if (!pool) {
    pool = new sql.ConnectionPool(sqlConfig);
    pool.on('error', err => {
      console.error('SQL Pool Error:', err);
      pool = null; // Reset pool on error
    });
    await pool.connect();
  }
  return pool;
}

module.exports = { getPool };
