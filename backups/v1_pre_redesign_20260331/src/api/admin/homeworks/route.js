import pool from '@/lib/db';
import { NextResponse } from 'next/server';

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS personal_homework (
      id INT AUTO_INCREMENT PRIMARY KEY,
      student_id INT NOT NULL,
      admin_id INT,
      title VARCHAR(255) NOT NULL,
      content TEXT,
      deadline DATE,
      status VARCHAR(50) DEFAULT 'Chưa Nộp',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

export async function GET() {
  try {
    await initDB();
    const [rows] = await pool.query(`
      SELECT hw.*, u.full_name, u.email 
      FROM personal_homework hw
      JOIN users u ON hw.student_id = u.id
      ORDER BY hw.created_at DESC
    `);
    return NextResponse.json({ homeworks: rows }, { status: 200 });
  } catch(e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await initDB();
    const { student_id, title, content, deadline } = await req.json();
    await pool.query(
      'INSERT INTO personal_homework (student_id, title, content, deadline) VALUES (?, ?, ?, ?)',
      [student_id, title, content, deadline]
    );
    return NextResponse.json({ message: 'Đã giao bài tập thành công' }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { id } = await req.json();
    await pool.query('DELETE FROM personal_homework WHERE id = ?', [id]);
    return NextResponse.json({ message: 'Đã thu hồi bài tập' }, { status: 200 });
  } catch(e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
