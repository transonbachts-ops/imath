const mysql = require('mysql2/promise');

async function run() {
  const c = await mysql.createConnection({host:'localhost', user:'root', database:'smart_edu_db'});
  
  try {
    await c.query('ALTER TABLE users ADD COLUMN can_use_ai BOOLEAN DEFAULT FALSE');
    console.log('Added can_use_ai column.');
  } catch(e) {
    if (e.code === 'ER_DUP_FIELDNAME') {
      console.log('Column can_use_ai already exists.');
    } else {
      console.log('Error adding column:', e.message);
    }
  }
  
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
