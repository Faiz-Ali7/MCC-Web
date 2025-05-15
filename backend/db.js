const sql = require('mssql');

const sqlConfig = {
  server: '192.168.18.69',
  authentication: {
    type: 'default',
    options: {
      userName: 'admin',
      password: 'admin1234',
    },
  },
  options: {
    database: 'MCCMAINDB',
    encrypt: false, // Change to false if your SQL Server does not use SSL
    trustServerCertificate: true,
    enableArithAbort: true, // Fix for some connection closing issues
  },
  pool: {
    max: 10, // Maximum number of connections
    min: 1,  // Minimum number of connections
    idleTimeoutMillis: 30000, // Close idle connections after 30s
  },
  connectionTimeout: 50000,
  requestTimeout: 600000,
};

let pool;

async function getPool() {
  try {
    if (!pool) {
      pool = new sql.ConnectionPool(sqlConfig);
      pool.on('error', err => {
        console.error('SQL Pool Error:', err);
        pool = null; // Reset pool on error
      });
      await pool.connect();
    }
    return pool;
  } catch (err) {
    console.error('Database Connection Error:', err);
    pool = null;
    throw err;
  }
}

module.exports = { getPool };
