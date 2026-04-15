const mysql = require('mysql2/promise');

async function checkParents() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'smart_edu_db'
  });

  try {
    const [rows] = await connection.execute('SELECT id, email, full_name, role FROM users WHERE role = "parent"');
    console.log('--- PHU HUYNH TRONG DATABASE ---');
    console.table(rows);
    
    const [all] = await connection.execute('SELECT role, count(*) as count FROM users GROUP BY role');
    console.log('--- THONG KE USER THEO ROLE ---');
    console.table(all);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

checkParents();
