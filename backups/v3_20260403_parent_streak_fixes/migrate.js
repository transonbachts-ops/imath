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

  // Add columns to courses if missing
  try { await c.query('ALTER TABLE courses ADD COLUMN schedule_date_end DATE NULL'); } catch(e){}
  try { await c.query('ALTER TABLE courses ADD COLUMN schedule_url VARCHAR(500) NULL'); } catch(e){}
  try { await c.query('ALTER TABLE courses ADD COLUMN lesson_plan_link VARCHAR(500) NULL'); } catch(e){}
  
  // Add details column to course_activities if missing
  try { await c.query('ALTER TABLE course_activities ADD COLUMN details TEXT NULL'); } catch(e) { console.log('details already exists'); }

  // ========================
  // PARENT PORTAL MIGRATIONS
  // ========================
  
  // 0. Expand role ENUM to include 'parent'
  try { 
    await c.query("ALTER TABLE users MODIFY COLUMN role ENUM('student','teacher','admin','parent') DEFAULT 'student'");
    console.log('Role ENUM expanded to include parent');
  } catch(e) { console.log('Role ENUM already updated'); }

  // 1. Add invite_code to users (for students)
  try { await c.query("ALTER TABLE users ADD COLUMN invite_code VARCHAR(20) UNIQUE NULL"); } catch(e) { console.log('invite_code already exists'); }

  // 2. Add updated_at to student_progress
  try { await c.query("ALTER TABLE student_progress ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"); } catch(e) {}

  // 3. Parent-Student link table (1 parent → 1 student only)
  await c.query(`CREATE TABLE IF NOT EXISTS parent_student_links (
    id INT AUTO_INCREMENT PRIMARY KEY,
    parent_id INT NOT NULL UNIQUE,
    student_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_link (parent_id, student_id)
  )`);

  // 4. Parent Messages table (parent <-> teacher)
  await c.query(`CREATE TABLE IF NOT EXISTS parent_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sender_id INT NOT NULL,
    receiver_id INT NOT NULL,
    student_id INT NOT NULL,
    course_id INT,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_conversation (sender_id, receiver_id, student_id)
  )`);

  console.log('Parent Portal migrations complete.');
  
  // Auto-generate invite codes for existing students who don't have one
  const [studentsWithoutCode] = await c.query("SELECT id FROM users WHERE role='student' AND (invite_code IS NULL OR invite_code='')");
  for (const s of studentsWithoutCode) {
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    await c.query('UPDATE users SET invite_code = ? WHERE id = ?', [code, s.id]);
  }
  console.log(`Generated invite codes for ${studentsWithoutCode.length} students.`);

  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
