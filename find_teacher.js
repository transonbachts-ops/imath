const mysql = require('mysql2/promise');
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'smart_edu_db'
});

async function findTeacher() {
  const [rows] = await pool.query('SELECT email FROM users WHERE role="teacher" LIMIT 1');
  console.log(rows[0]);
  process.exit(0);
}
findTeacher();
