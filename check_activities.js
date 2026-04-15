const mysql = require('mysql2/promise');

async function check() {
  try {
    const c = await mysql.createConnection({host:'localhost', user:'root', database:'smart_edu_db'});
    const [rows] = await c.query("SELECT id, module_id, title, type, url FROM course_activities WHERE url LIKE '%exemple%'");
    console.log(JSON.stringify(rows, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
