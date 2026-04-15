const mysql = require('mysql2/promise');

async function run() {
  const c = await mysql.createConnection({host:'localhost', user:'root', database:'smart_edu_db'});
  
  // 1. users: streaks
  try { await c.query('ALTER TABLE users ADD COLUMN current_streak INT DEFAULT 0'); } catch(e) {}
  try { await c.query('ALTER TABLE users ADD COLUMN longest_streak INT DEFAULT 0'); } catch(e) {}
  try { await c.query('ALTER TABLE users ADD COLUMN last_quiz_date DATE NULL'); } catch(e) {}

  // 2. question_bank
  await c.query(`CREATE TABLE IF NOT EXISTS question_bank (
    id INT AUTO_INCREMENT PRIMARY KEY,
    grade VARCHAR(10) NOT NULL,
    question_text TEXT NOT NULL,
    options_json JSON,
    correct_answer VARCHAR(1) DEFAULT 'A',
    tags VARCHAR(255) DEFAULT '',
    hint TEXT,
    image_url VARCHAR(500),
    video_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);

  // 3. daily_quiz_results
  await c.query(`CREATE TABLE IF NOT EXISTS daily_quiz_results (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    grade VARCHAR(10) NOT NULL,
    score FLOAT DEFAULT 0,
    details_json TEXT,
    date_seed DATE NOT NULL,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_daily_result (student_id, date_seed)
  )`);

  console.log('V2 migrations complete.');
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
