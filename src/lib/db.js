import mysql from 'mysql2/promise';

// Singleton for DB pool to prevent exhausted connections in hot-reload
let pool;

if (process.env.NODE_ENV === 'production') {
  pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'smart_edu_db',
    waitForConnections: true,
    connectionLimit: 100,
    queueLimit: 0
  });
} else {
  if (!global._mysqlPool) {
    global._mysqlPool = mysql.createPool({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'smart_edu_db',
      waitForConnections: true,
      connectionLimit: 100,
      queueLimit: 0
    });
  }
  pool = global._mysqlPool;
}

export async function ensureTeachersTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS teachers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Add columns if missing
    try { await pool.query('ALTER TABLE teachers ADD COLUMN role_title VARCHAR(255)'); } catch(e){}
    try { await pool.query('ALTER TABLE teachers ADD COLUMN bio TEXT'); } catch(e){}
    try { await pool.query('ALTER TABLE teachers ADD COLUMN avatar_url VARCHAR(500)'); } catch(e){}
    try { await pool.query('ALTER TABLE teachers ADD COLUMN fb_url VARCHAR(255)'); } catch(e){}
    try { await pool.query('ALTER TABLE teachers ADD COLUMN twitter_url VARCHAR(255)'); } catch(e){}
    try { await pool.query('ALTER TABLE teachers ADD COLUMN linkedin_url VARCHAR(255)'); } catch(e){}
    
    // Seed placeholders if empty
    const [rows] = await pool.query('SELECT COUNT(*) as count FROM teachers');
    if (rows[0].count === 0) {
      console.log('Seeding default teachers...');
      const placeholders = [
        ['Thầy Trần Sơn Bách', 'PGS. TS, MS, PhD, MBA, FIFA26', 'Là người đã hoàn thiện 6 bài toán Thiên niên kỷ và có kiến thức sâu rộng về Toán học hiện đại. Đặc biệt từ chối nhận giải vì thầy cho rằng giải thưởng không hề công bằng.', 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?q=80&w=300'],
        ['TS. Nguyễn Hoàng Nam', 'Chuyên gia Hình học Phẳng', 'Tác giả của hàng loạt đầu sách luyện thi chuyên Toán nổi tiếng toàn quốc, giúp hàng ngàn học sinh đỗ trường chuyên.', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=300'],
        ['ThS. Lê Thị Mai Anh', 'Giảng viên Giải tích 12', 'Phương pháp dạy dễ hiểu, giúp học sinh nắm chắc kiến thức căn bản trong thời gian ngắn và đạt điểm cao THPTQG.', 'https://images.unsplash.com/photo-1544168190-79c17527004f?q=80&w=300']
      ];
      for (const p of placeholders) {
        await pool.query('INSERT INTO teachers (name, role_title, bio, avatar_url) VALUES (?, ?, ?, ?)', p);
      }
    }
    
    // Additional lazy migrations
    try { await pool.query('ALTER TABLE quizzes ADD COLUMN pass_score FLOAT DEFAULT 0'); } catch(e){}
    try { await pool.query('ALTER TABLE course_activities MODIFY COLUMN type VARCHAR(255)'); } catch(e){}
    try { await pool.query('ALTER TABLE courses ADD COLUMN rules TEXT'); } catch(e){}
    try { await pool.query('ALTER TABLE enrollments ADD COLUMN rules_accepted TINYINT(1) DEFAULT 0'); } catch(e){}
    
    // Create game_scores table
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS game_scores (
          id INT AUTO_INCREMENT PRIMARY KEY,
          student_id INT NOT NULL,
          activity_id INT NULL,
          project_id INT NULL,
          score INT DEFAULT 0,
          details_json JSON NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_activity (activity_id),
          INDEX idx_student (student_id),
          INDEX idx_project (project_id)
        )
      `);
      
      // 2. Add columns to game_scores for analytics if they don't exist
      try {
        const [cols] = await pool.query('SHOW COLUMNS FROM game_scores');
        const colNames = cols.map(c => c.Field);
        
        if (!colNames.includes('details_json')) {
          await pool.query('ALTER TABLE game_scores ADD COLUMN details_json JSON AFTER score');
          console.log('Added details_json to game_scores');
        }
        if (!colNames.includes('project_id')) {
          await pool.query('ALTER TABLE game_scores ADD COLUMN project_id INT AFTER activity_id');
          await pool.query('ALTER TABLE game_scores ADD INDEX (project_id)');
          console.log('Added project_id and index to game_scores');
        }
      } catch (e) {
        console.error('Database migration error:', e.message);
      }
    } catch(e) {}

    // Create imath_studio_projects table
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS imath_studio_projects (
          id INT AUTO_INCREMENT PRIMARY KEY,
          teacher_id INT NULL,
          title VARCHAR(255) DEFAULT 'Chưa đặt tên',
          game_type VARCHAR(50) NOT NULL,
          game_code VARCHAR(50) UNIQUE NOT NULL,
          config_json JSON,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // Lazy migration for existing tables
      try { await pool.query('ALTER TABLE imath_studio_projects ADD COLUMN title VARCHAR(255) DEFAULT "Chưa đặt tên" AFTER teacher_id'); } catch(e){}
    } catch(e) {}
    // Create forum tables
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS forum_threads (
          id INT AUTO_INCREMENT PRIMARY KEY,
          activity_id INT NULL,
          module_id INT NULL,
          user_id INT NOT NULL,
          title VARCHAR(255) NOT NULL,
          content TEXT NOT NULL,
          is_closed TINYINT(1) DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_activity (activity_id),
          INDEX idx_module (module_id),
          INDEX idx_user (user_id)
        )
      `);
      // Lazy migration for is_closed
      try { await pool.query('ALTER TABLE forum_threads ADD COLUMN is_closed TINYINT(1) DEFAULT 0 AFTER content'); } catch(e){}
    } catch(e) {}

    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS forum_replies (
          id INT AUTO_INCREMENT PRIMARY KEY,
          thread_id INT NOT NULL,
          user_id INT NOT NULL,
          content TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_thread (thread_id),
          INDEX idx_user (user_id)
        )
      `);
    } catch(e) {}

    // 5. Course Collaborators table (Multiple teachers per course)
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS course_collaborators (
          id INT AUTO_INCREMENT PRIMARY KEY,
          course_id INT NOT NULL,
          user_id INT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE KEY uq_collaboration (course_id, user_id),
          INDEX idx_course (course_id),
          INDEX idx_user (user_id)
        )
      `);
    } catch(e) {}
    
  } catch (e) {
    console.error('Error ensuring tables:', e.message);
  }
}

export default pool;
