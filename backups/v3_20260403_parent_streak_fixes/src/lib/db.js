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
    
  } catch (e) {
    console.error('Error ensuring teachers table:', e.message);
  }
}

export default pool;
