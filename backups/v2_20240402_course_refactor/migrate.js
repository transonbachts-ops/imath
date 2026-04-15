const mysql = require('mysql2/promise');

async function run() {
  const c = await mysql.createConnection({host:'localhost', user:'root', database:'smart_edu_db'});
  
  // Add columns if missing
  try { await c.query('ALTER TABLE quizzes ADD COLUMN activity_id INT NULL'); } catch(e) { console.log('activity_id already exists'); }
  try { await c.query('ALTER TABLE quizzes ADD COLUMN time_limit INT DEFAULT 15'); } catch(e) { console.log('time_limit already exists'); }
  
  // Create quiz_questions if missing 
  await c.query(`CREATE TABLE IF NOT EXISTS quiz_questions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    quiz_id INT NOT NULL,
    question_text TEXT NOT NULL,
    options_json JSON,
    correct_answer VARCHAR(1) DEFAULT 'A'
  )`);

  // Create quiz_results
  await c.query(`CREATE TABLE IF NOT EXISTS quiz_results (
    id INT AUTO_INCREMENT PRIMARY KEY,
    quiz_id INT NOT NULL,
    student_id INT NOT NULL,
    score FLOAT DEFAULT 0,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_result (quiz_id, student_id)
  )`);

  // Create student_progress if missing
  await c.query(`CREATE TABLE IF NOT EXISTS student_progress (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    activity_id INT NOT NULL,
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_prog (student_id, activity_id)
  )`);

  // Activity 4 = Bài Thi Thử Năng Lực Demo
  const actId = 4;
  const [existing] = await c.query('SELECT * FROM quizzes WHERE activity_id=?', [actId]);
  if (!existing.length) {
    const [qres] = await c.query(
      'INSERT INTO quizzes (activity_id, time_limit, course_id, question, option_a, option_b, option_c, correct_option) VALUES (?,?,?,?,?,?,?,?)',
      [actId, 30, 1, '', '', '', '', 'a']
    );
    const quizId = qres.insertId;
    const qs = [
      { q: 'Tính giới hạn: lim(n→∞) n/(n+1)', opts: {A:'0', B:'1', C:'Vô cùng', D:'1/2'}, ans: 'B' },
      { q: 'Đạo hàm của f(x) = x² là:', opts: {A:'x', B:'2x', C:'x²', D:'2x+1'}, ans: 'B' },
      { q: 'Giải PT x²-5x+6=0, nghiệm là:', opts: {A:'x=2 hoặc x=3', B:'x=1 hoặc x=6', C:'x=-2 hoặc x=-3', D:'x=5'}, ans: 'A' }
    ];
    for (const qd of qs) {
      await c.query('INSERT INTO quiz_questions (quiz_id, question_text, options_json, correct_answer) VALUES (?,?,?,?)',
        [quizId, qd.q, JSON.stringify(qd.opts), qd.ans]);
    }
    console.log('CREATED mock test quiz: ' + quizId);
  } else {
    console.log('Quiz already exists for activity 4');
  }

  const [cols] = await c.query('SHOW COLUMNS FROM quizzes');
  console.log('QUIZ_COLS:', cols.map(x => x.Field).join(', '));
  
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
