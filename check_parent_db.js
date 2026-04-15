const mysql = require('mysql2/promise');
async function run() {
  const c = await mysql.createConnection({host:'localhost', user:'root', database:'smart_edu_db'});
  
  // Expand the ENUM to include 'parent'
  await c.query("ALTER TABLE users MODIFY COLUMN role ENUM('student','teacher','admin','parent') DEFAULT 'student'");
  console.log('✅ Role ENUM updated to include parent');
  
  // Verify
  const [cols] = await c.query("SHOW COLUMNS FROM users WHERE Field = 'role'");
  console.log('New role column:', cols[0].Type);
  
  process.exit(0);
}
run().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
