import pool from '@/lib/db';
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const JWT_SECRET = 'supersecret_smart_edu_key_999';

async function checkAccess() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token');
  if (!token) return null;
  try {
    const user = jwt.verify(token.value, JWT_SECRET);
    if (['admin', 'teacher'].includes(user.role)) return user;
    return null;
  } catch(e) { return null; }
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const courseId = searchParams.get('courseId');
  if (!courseId) return NextResponse.json({ error: 'Missing courseId' }, { status: 400 });
  
  const [rows] = await pool.query('SELECT * FROM course_modules WHERE course_id = ? ORDER BY order_index ASC', [courseId]);
  return NextResponse.json(rows);
}

export async function POST(req) {
  const user = await checkAccess();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { course_id, title, content, order_index } = await req.json();
  if (!course_id || !title) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });

  // Ownership check for teachers (including collaborators)
  if (user.role === 'teacher') {
    const [courses] = await pool.query('SELECT owner_id FROM courses WHERE id = ?', [course_id]);
    const [collaborators] = await pool.query('SELECT id FROM course_collaborators WHERE course_id = ? AND user_id = ?', [course_id, user.userId || user.id]);
    
    const isOwner = courses.length > 0 && courses[0].owner_id == (user.userId || user.id);
    const isCollaborator = collaborators.length > 0;

    if (!isOwner && !isCollaborator) {
      return NextResponse.json({ error: 'Bạn không có quyền chỉnh sửa khóa học này.' }, { status: 403 });
    }
  }

  const [res] = await pool.query(
    'INSERT INTO course_modules (course_id, title, content, order_index) VALUES (?, ?, ?, ?)',
    [course_id, title, content || '', order_index || 0]
  );
  
  return NextResponse.json({ id: res.insertId, course_id, title, content, order_index });
}
