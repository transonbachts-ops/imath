import pool from '@/lib/db';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'supersecret_smart_edu_key_999';

// Auto-create table
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS course_tags (
      id INT AUTO_INCREMENT PRIMARY KEY,
      course_id INT,
      teacher_id INT,
      name VARCHAR(100) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_tag (course_id, teacher_id, name)
    )
  `);
}

export async function GET(req) {
  try {
    await initDB();
    const cookieStore = await cookies();
    const token = cookieStore.get('token');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = jwt.verify(token.value, JWT_SECRET);

    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get('course_id');

    let query = 'SELECT * FROM course_tags WHERE teacher_id = ?';
    let params = [user.userId];

    if (courseId) {
      query = 'SELECT * FROM course_tags WHERE (teacher_id = ? OR course_id = ?) ORDER BY name ASC';
      params = [user.userId, courseId];
    }

    // Admin sees all tags
    if (user.role === 'admin') {
      query = courseId
        ? 'SELECT * FROM course_tags WHERE course_id = ? ORDER BY name ASC'
        : 'SELECT * FROM course_tags ORDER BY name ASC';
      params = courseId ? [courseId] : [];
    }

    const [tags] = await pool.query(query, params);
    return NextResponse.json({ tags });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await initDB();
    const cookieStore = await cookies();
    const token = cookieStore.get('token');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = jwt.verify(token.value, JWT_SECRET);

    const data = await req.json();

    // DELETE a tag
    if (data.action === 'delete') {
      if (user.role === 'admin') {
        await pool.query('DELETE FROM course_tags WHERE id = ?', [data.id]);
      } else {
        await pool.query('DELETE FROM course_tags WHERE id = ? AND teacher_id = ?', [data.id, user.userId]);
      }
      return NextResponse.json({ message: 'Đã xóa tag' });
    }

    // CREATE a tag
    const { name, course_id } = data;
    if (!name?.trim()) return NextResponse.json({ error: 'Tên tag không được trống' }, { status: 400 });

    await pool.query(
      'INSERT IGNORE INTO course_tags (course_id, teacher_id, name) VALUES (?, ?, ?)',
      [course_id || null, user.userId, name.trim()]
    );
    const [rows] = await pool.query('SELECT * FROM course_tags WHERE teacher_id = ? ORDER BY name ASC', [user.userId]);
    return NextResponse.json({ message: 'Tạo tag thành công', tags: rows }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
