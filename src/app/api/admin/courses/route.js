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
      OR c.id IN (SELECT course_id FROM course_collaborators WHERE user_id = ?)
    `, [user.userId, user.userId]);
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

  // Auto add columns (migrated already, but keeping safety check)
  try { await pool.query('ALTER TABLE courses ADD COLUMN owner_id INT NULL'); } catch(e){}
  try { await pool.query('ALTER TABLE courses ADD COLUMN schedule_date DATE NULL'); } catch(e){}

  const data = await req.json();
  const { title, description, image_url, textbook_url, lesson_plan_url, teacher_id, owner_id, schedule_date, schedule_date_end, schedule_url, lesson_plan_link, rules } = data;
  
  if (data.id) {
    // Ownership check for teachers (including collaborators)
    if (user.role === 'teacher') {
      const [courses] = await pool.query('SELECT owner_id FROM courses WHERE id = ?', [data.id]);
      const [collaborators] = await pool.query('SELECT id FROM course_collaborators WHERE course_id = ? AND user_id = ?', [data.id, user.userId || user.id]);
      
      const isOwner = courses.length > 0 && courses[0].owner_id == (user.userId || user.id);
      const isCollaborator = collaborators.length > 0;

      if (!isOwner && !isCollaborator) {
        return NextResponse.json({ error: 'Bạn không có quyền chỉnh sửa khóa học này.' }, { status: 403 });
      }
    }

    await pool.query(
      'UPDATE courses SET title=?, description=?, image_url=?, textbook_url=?, lesson_plan_url=?, teacher_id=?, owner_id=?, schedule_date=?, schedule_date_end=?, schedule_url=?, lesson_plan_link=?, rules=? WHERE id=?', 
      [title, description, image_url || null, textbook_url || null, lesson_plan_url || null, teacher_id || null, owner_id || null, schedule_date || null, schedule_date_end || null, schedule_url || null, lesson_plan_link || null, rules || null, data.id]
    );
  } else {
    const finalOwner = user.role === 'teacher' ? (user.userId || user.id) : (owner_id || null);
    const [result] = await pool.query(
      'INSERT INTO courses (title, description, image_url, textbook_url, lesson_plan_url, teacher_id, owner_id, schedule_date, schedule_date_end, schedule_url, lesson_plan_link, rules) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [title, description, image_url || null, textbook_url || null, lesson_plan_url || null, teacher_id || null, finalOwner, schedule_date || null, schedule_date_end || null, schedule_url || null, lesson_plan_link || null, rules || null]
    );
    return NextResponse.json({ message: 'Lưu khoá học thành công!', id: result.insertId });
  }
  return NextResponse.json({ message: 'Lưu khoá học thành công!' });
}

export async function DELETE(req) {
  const cookieStore = await cookies();
  const token = cookieStore.get('token');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  let user = jwt.verify(token.value, JWT_SECRET);

  const data = await req.json();
  
  // Ownership check for teachers (including collaborators as per user request "Có")
  if (user.role === 'teacher') {
    const [courses] = await pool.query('SELECT owner_id FROM courses WHERE id = ?', [data.id]);
    const [collaborators] = await pool.query('SELECT id FROM course_collaborators WHERE course_id = ? AND user_id = ?', [data.id, user.userId || user.id]);
    
    const isOwner = courses.length > 0 && courses[0].owner_id == (user.userId || user.id);
    const isCollaborator = collaborators.length > 0;

    if (!isOwner && !isCollaborator) {
      return NextResponse.json({ error: 'Bạn không có quyền xóa khóa học này.' }, { status: 403 });
    }
  }

  await pool.query('DELETE FROM courses WHERE id=?', [data.id]);
  return NextResponse.json({ message: 'Đã ngừng khóa học' });
}
