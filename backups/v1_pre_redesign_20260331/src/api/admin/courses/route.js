import pool from '@/lib/db';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'supersecret_smart_edu_key_999';

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let user = jwt.verify(token.value, JWT_SECRET);

  // Auto add owner_id in case it doesn't exist
  try { await pool.query('ALTER TABLE courses ADD COLUMN owner_id INT NULL'); } catch(e){}

  let courses = [];
  if (user.role === 'teacher') {
    [courses] = await pool.query(`
      SELECT c.*, t.name as teacher_name, t.role_title as teacher_title
      FROM courses c
      LEFT JOIN teachers t ON c.teacher_id = t.id
      WHERE c.owner_id = ?
    `, [user.userId]);
  } else {
    [courses] = await pool.query(`
      SELECT c.*, t.name as teacher_name, t.role_title as teacher_title
      FROM courses c
      LEFT JOIN teachers t ON c.teacher_id = t.id
    `);
  }
  return NextResponse.json({ courses });
}

export async function POST(req) {
  const cookieStore = await cookies();
  const token = cookieStore.get('token');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  let user = jwt.verify(token.value, JWT_SECRET);

  // Auto add columns in case they don't exist
  try { await pool.query('ALTER TABLE courses ADD COLUMN owner_id INT NULL'); } catch(e){}
  try { await pool.query('ALTER TABLE courses ADD COLUMN schedule_date DATE NULL'); } catch(e){}

  const data = await req.json();
  const { title, description, image_url, textbook_url, lesson_plan_url, teacher_id, owner_id, schedule_date, schedule_url } = data;
  
  if (data.id) {
    // If teacher, verify they own it or let them edit their own
    await pool.query(
      'UPDATE courses SET title=?, description=?, image_url=?, textbook_url=?, lesson_plan_url=?, teacher_id=?, owner_id=?, schedule_date=?, schedule_url=? WHERE id=?', 
      [title, description, image_url || null, textbook_url || null, lesson_plan_url || null, teacher_id || null, owner_id || null, schedule_date || null, schedule_url || null, data.id]
    );
  } else {
    // Determine initial owner
    const finalOwner = user.role === 'teacher' ? user.userId : (owner_id || null);
    await pool.query(
      'INSERT INTO courses (title, description, image_url, textbook_url, lesson_plan_url, teacher_id, owner_id, schedule_date, schedule_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [title, description, image_url || null, textbook_url || null, lesson_plan_url || null, teacher_id || null, finalOwner, schedule_date || null, schedule_url || null]
    );
  }
  return NextResponse.json({ message: 'Lưu khoá học thành công!' });
}

export async function DELETE(req) {
  const data = await req.json();
  await pool.query('DELETE FROM courses WHERE id=?', [data.id]);
  return NextResponse.json({ message: 'Đã ngừng khóa học' });
}
