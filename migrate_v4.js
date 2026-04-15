const mysql = require('mysql2/promise');

async function run() {
  const c = await mysql.createConnection({host:'localhost', user:'root', database:'smart_edu_db'});
  
  console.log('Starting Module Discussions migrations (v4)...');

  // Update forum_threads: make activity_id NULL, add module_id
  try { 
    await c.query('ALTER TABLE forum_threads MODIFY COLUMN activity_id INT NULL'); 
    console.log('Made activity_id nullable in forum_threads');
  } catch(e) { console.error('Error modifying forum_threads activity_id:', e.message); }

  try { 
    await c.query('ALTER TABLE forum_threads ADD COLUMN module_id INT NULL'); 
    console.log('Added module_id to forum_threads');
  } catch(e) { console.log('module_id already exists in forum_threads'); }

  console.log('Migrations v4 complete.');
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
