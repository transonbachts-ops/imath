const mysql = require('mysql2/promise');

async function run() {
  const c = await mysql.createConnection({host:'localhost', user:'root', database:'smart_edu_db'});
  
  console.log('Starting Course Enhancements migrations (v3)...');

  // 1. Update course_activities: add due_date
  try { 
    await c.query('ALTER TABLE course_activities ADD COLUMN due_date DATETIME NULL'); 
    console.log('Added due_date to course_activities');
  } catch(e) { console.log('due_date already exists'); }

  // 2. Create assignment_submissions
  await c.query(`CREATE TABLE IF NOT EXISTS assignment_submissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    activity_id INT NOT NULL,
    student_id INT NOT NULL,
    file_url VARCHAR(500),
    content TEXT,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    feedback TEXT,
    grade FLOAT,
    UNIQUE KEY uq_sub (activity_id, student_id)
  )`);
  console.log('Table assignment_submissions verified/created.');

  // 3. Create notifications
  await c.query(`CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    parent_id INT NULL,
    title VARCHAR(255),
    message TEXT,
    type VARCHAR(50),
    related_id INT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
  console.log('Table notifications verified/created.');

  // 4. Create forum_threads
  await c.query(`CREATE TABLE IF NOT EXISTS forum_threads (
    id INT AUTO_INCREMENT PRIMARY KEY,
    activity_id INT NOT NULL,
    user_id INT NOT NULL,
    title VARCHAR(255),
    content TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
  console.log('Table forum_threads verified/created.');

  // 5. Create forum_replies
  await c.query(`CREATE TABLE IF NOT EXISTS forum_replies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    thread_id INT NOT NULL,
    user_id INT NOT NULL,
    content TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
  console.log('Table forum_replies verified/created.');

  console.log('Migrations v3 complete.');
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
