const mysql = require('mysql2/promise');
async function run() {
  const c = await mysql.createConnection({host:'localhost', user:'root', database:'smart_edu_db'});
  
  console.log('--- ALL PARENT USERS ---');
  const [parents] = await c.query("SELECT id, full_name, email FROM users WHERE role='parent'");
  console.log(JSON.stringify(parents, null, 2));

  console.log('--- ALL LINKS ---');
  const [links] = await c.query("SELECT * FROM parent_student_links");
  console.log(JSON.stringify(links, null, 2));

  console.log('--- USERS WITH INVITE CODES (STUDENTS) ---');
  const [students] = await c.query("SELECT id, full_name, invite_code FROM users WHERE role='student'");
  console.log(JSON.stringify(students, null, 2));

  process.exit(0);
}
run().catch(e => { console.error(e.message); process.exit(1); });
