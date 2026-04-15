const mysql = require('mysql2/promise');
async function run() {
  const c = await mysql.createConnection({host:'localhost', user:'root', database:'smart_edu_db'});
  const [cols] = await c.query("SHOW COLUMNS FROM users WHERE Field = 'role'");
  console.log('Role column type:', cols[0].Type);
  if (!cols[0].Type.includes('parent')) {
    console.log('UPDATING ENUM...');
    await c.query("ALTER TABLE users MODIFY COLUMN role ENUM('student','teacher','admin','parent') DEFAULT 'student'");
    console.log('Role ENUM updated.');
  } else {
    console.log('Role ENUM is already correct.');
  }
  process.exit(0);
}
run().catch(e => { console.error(e.message); process.exit(1); });
