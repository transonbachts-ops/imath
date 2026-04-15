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
        `SELECT s.id, s.title, s.zoom_link, s.start_time as date, s.target_students, s.course_id, "zoom" as type, c.title as course_title
         FROM live_sessions s LEFT JOIN courses c ON s.course_id = c.id 
         WHERE s.course_id IN (${placeholders}) OR s.course_id IS NULL OR s.course_id = 0`,
        enrolledCourseIds
      );
      const [a] = await pool.query(
        `SELECT a.id, a.title, a.description, a.due_date as date, a.target_students, a.course_id, "assignment" as type, c.title as course_title
         FROM assignments a LEFT JOIN courses c ON a.course_id = c.id 
         WHERE a.course_id IN (${placeholders}) OR a.course_id IS NULL OR a.course_id = 0`,
        enrolledCourseIds
      );
      sessions = s;
      assignments = a;
    }
  } else if (user && user.role === 'teacher') {
    // Teacher: show events for courses they own OR courses where they are the assigned teacher
    const [s] = await pool.query(
      `SELECT s.id, s.title, s.zoom_link, s.start_time as date, s.target_students, s.course_id, "zoom" as type, c.title as course_title 
       FROM live_sessions s LEFT JOIN courses c ON s.course_id = c.id 
       WHERE s.course_id IS NULL OR s.course_id = 0 OR s.course_id IN (SELECT id FROM courses WHERE owner_id = ? OR teacher_id = ? OR id IN (SELECT course_id FROM course_collaborators WHERE user_id = ?))`, 
      [user.userId, user.userId, user.userId]
    );
    const [a] = await pool.query(
      `SELECT a.id, a.title, a.description, a.due_date as date, a.target_students, a.course_id, "assignment" as type, c.title as course_title 
       FROM assignments a LEFT JOIN courses c ON a.course_id = c.id 
       WHERE a.course_id IS NULL OR a.course_id = 0 OR a.course_id IN (SELECT id FROM courses WHERE owner_id = ? OR teacher_id = ? OR id IN (SELECT course_id FROM course_collaborators WHERE user_id = ?))`, 
      [user.userId, user.userId, user.userId]
    );
    sessions = s;
    assignments = a;
  } else {
    // Admin: show all
    const [s] = await pool.query(
      'SELECT s.id, s.title, s.zoom_link, s.start_time as date, s.target_students, s.course_id, "zoom" as type, c.title as course_title FROM live_sessions s LEFT JOIN courses c ON s.course_id = c.id'
    );
    const [a] = await pool.query(
      'SELECT a.id, a.title, a.description, a.due_date as date, a.target_students, a.course_id, "assignment" as type, c.title as course_title FROM assignments a LEFT JOIN courses c ON a.course_id = c.id'
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
    const eventId = data.id;

    if (user.role === 'teacher') {
      // Check ownership in both tables
      const [sess] = await pool.query('SELECT teacher_id FROM live_sessions WHERE id=?', [eventId]);
      const [asgn] = await pool.query('SELECT teacher_id FROM assignments WHERE id=?', [eventId]);
      
      const teacherOwns = (sess.length && sess[0].teacher_id === user.userId) || 
                          (asgn.length && asgn[0].teacher_id === user.userId);
                          
      if (!teacherOwns) return NextResponse.json({ error: 'Không thể xóa lịch của người khác' }, { status: 403 });
    }

    await pool.query('DELETE FROM live_sessions WHERE id=?', [eventId]);
    await pool.query('DELETE FROM assignments WHERE id=?', [eventId]);
    
    return NextResponse.json({ message: 'Đã xóa thành công!' });
  } catch(e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
export async function PUT(req) {
  const cookieStore = await cookies();
  const token = cookieStore.get('token');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  try {
    const user = jwt.verify(token.value, JWT_SECRET);
    if (user.role === 'student') return NextResponse.json({ error: 'Không có quyền!' }, { status: 403 });

    const data = await req.json();
    const eventId = data.id;
    const courseId = data.course_id || null;

    if (user.role === 'teacher') {
      // Check ownership
      let ownerId = null;
      if (data.type === 'zoom') {
        const [rows] = await pool.query('SELECT teacher_id FROM live_sessions WHERE id=?', [eventId]);
        if (rows.length) ownerId = rows[0].teacher_id;
      } else {
        const [rows] = await pool.query('SELECT teacher_id FROM assignments WHERE id=?', [eventId]);
        if (rows.length) ownerId = rows[0].teacher_id;
      }
      if (ownerId !== user.userId) return NextResponse.json({ error: 'Không thể sửa lịch của người khác' }, { status: 403 });
    }

    if (data.type === 'zoom') {
      await pool.query(
        'UPDATE live_sessions SET title=?, zoom_link=?, start_time=?, course_id=? WHERE id=?',
        [data.title, data.zoom_link, data.date, courseId, eventId]
      );
    } else {
      await pool.query(
        'UPDATE assignments SET title=?, due_date=?, course_id=? WHERE id=?',
        [data.title, data.date, courseId, eventId]
      );
    }
    
    return NextResponse.json({ message: 'Cập nhật thành công!' });
  } catch(e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
