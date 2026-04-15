import pool from '@/lib/db';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'supersecret_smart_edu_key_999';

export async function GET(req) {
  const cookieStore = await cookies();
  const token = cookieStore.get('token');
  let user = null;
  if (token) {
    try { user = jwt.verify(token.value, JWT_SECRET); } catch(e){}
  }

  // Add course_id to tables if not exists
  try { await pool.query('ALTER TABLE live_sessions ADD COLUMN IF NOT EXISTS course_id INT NULL'); } catch(e){}
  try { await pool.query('ALTER TABLE assignments ADD COLUMN IF NOT EXISTS course_id INT NULL'); } catch(e){}

  let sessions = [], assignments = [];

  if (user && user.role === 'student') {
    // Get enrolled + approved course IDs
    const [enrolled] = await pool.query(
      'SELECT course_id FROM enrollments WHERE user_id=? AND status="approved"',
      [user.userId]
    );
    const enrolledCourseIds = enrolled.map(e => e.course_id);

    if (enrolledCourseIds.length > 0) {
      const placeholders = enrolledCourseIds.map(() => '?').join(',');
      // Show events for enrolled courses OR events with no course (global)
      const [s] = await pool.query(
        `SELECT id, title, zoom_link, start_time as date, target_students, course_id, "zoom" as type 
         FROM live_sessions WHERE course_id IN (${placeholders}) OR course_id IS NULL`,
        enrolledCourseIds
      );
      const [a] = await pool.query(
        `SELECT id, title, description, due_date as date, target_students, course_id, "assignment" as type 
         FROM assignments WHERE course_id IN (${placeholders}) OR course_id IS NULL`,
        enrolledCourseIds
      );
      sessions = s;
      assignments = a;
    }
  } else if (user && user.role === 'teacher') {
    // Teacher: show events only for their courses
    const [s] = await pool.query(
      'SELECT id, title, zoom_link, start_time as date, target_students, course_id, "zoom" as type FROM live_sessions WHERE course_id IN (SELECT id FROM courses WHERE owner_id = ?)', [user.userId]
    );
    const [a] = await pool.query(
      'SELECT id, title, description, due_date as date, target_students, course_id, "assignment" as type FROM assignments WHERE course_id IN (SELECT id FROM courses WHERE owner_id = ?)', [user.userId]
    );
    sessions = s;
    assignments = a;
  } else {
    // Admin: show all
    const [s] = await pool.query(
      'SELECT id, title, zoom_link, start_time as date, target_students, course_id, "zoom" as type FROM live_sessions'
    );
    const [a] = await pool.query(
      'SELECT id, title, description, due_date as date, target_students, course_id, "assignment" as type FROM assignments'
    );
    sessions = s;
    assignments = a;
  }

  // Add unique prefix type to avoid id collision
  const allEvents = [
    ...sessions.map(e => ({ ...e, uniqueKey: `zoom_${e.id}` })),
    ...assignments.map(e => ({ ...e, uniqueKey: `asgn_${e.id}` }))
  ];

  // Sort by date
  allEvents.sort((a, b) => new Date(a.date) - new Date(b.date));

  return NextResponse.json({ events: allEvents });
}

export async function POST(req) {
  const cookieStore = await cookies();
  const token = cookieStore.get('token');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  try {
    const user = jwt.verify(token.value, JWT_SECRET);
    if (user.role === 'student') return NextResponse.json({ error: 'Chỉ Giáo Viên mới được giao bài!' }, { status: 403 });

    const data = await req.json();
    const courseId = data.course_id || null;

    if (data.type === 'zoom') {
      await pool.query(
        'INSERT INTO live_sessions (title, zoom_link, start_time, duration_minutes, teacher_id, target_students, course_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [data.title, data.zoom_link, data.date, data.duration || 60, user.userId, '', courseId]
      );
    } else {
      await pool.query(
        'INSERT INTO assignments (title, description, due_date, teacher_id, target_students, course_id) VALUES (?, ?, ?, ?, ?, ?)',
        [data.title, data.description || '', data.date, user.userId, '', courseId]
      );
    }
    return NextResponse.json({ message: 'Tạo Lịch Trình thành công!' });
  } catch(e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  const cookieStore = await cookies();
  const token = cookieStore.get('token');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  try {
    const user = jwt.verify(token.value, JWT_SECRET);
    if (user.role === 'student') return NextResponse.json({ error: 'Không có quyền!' }, { status: 403 });

    const data = await req.json();
    await pool.query('DELETE FROM live_sessions WHERE id=?', [data.id]);
    await pool.query('DELETE FROM assignments WHERE id=?', [data.id]);
    
    return NextResponse.json({ message: 'Đã xóa thành công!' });
  } catch(e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
