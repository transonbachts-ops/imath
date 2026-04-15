import pool from '@/lib/db';
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

export async function POST(req) {
  const cookieStore = await cookies();
  const token = cookieStore.get('token');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let user;
  try {
    user = jwt.verify(token.value, 'supersecret_smart_edu_key_999');
  } catch (e) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { courseId } = await req.json();
  if (!courseId) return NextResponse.json({ error: 'Bỏ trống courseId' }, { status: 400 });

  // Init DB
  await pool.query(`
    CREATE TABLE IF NOT EXISTS enrollments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      course_id INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_enrollment (user_id, course_id)
    )
  `);

  try {
    await pool.query('INSERT IGNORE INTO enrollments (user_id, course_id) VALUES (?, ?)', [user.userId, courseId]);
    return NextResponse.json({ message: 'Ghi danh thành công' }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
