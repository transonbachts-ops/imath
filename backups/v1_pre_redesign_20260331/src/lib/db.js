import mysql from 'mysql2/promise';

// Singleton for DB pool to prevent exhausted connections in hot-reload
let pool;

if (process.env.NODE_ENV === 'production') {
  pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'smart_edu_db',
    waitForConnections: true,
    connectionLimit: 100,
    queueLimit: 0
  });
} else {
  if (!global._mysqlPool) {
    global._mysqlPool = mysql.createPool({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'smart_edu_db',
      waitForConnections: true,
      connectionLimit: 100,
      queueLimit: 0
    });
  }
  pool = global._mysqlPool;
}

export default pool;
