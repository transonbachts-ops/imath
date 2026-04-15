const mysql = require('mysql2/promise');
async function run() {
  const c = await mysql.createConnection({host:'localhost', user:'root', database:'smart_edu_db'});
  const [cols] = await c.query('SHOW COLUMNS FROM teachers');
  console.log(JSON.stringify(cols, null, 2));
  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
