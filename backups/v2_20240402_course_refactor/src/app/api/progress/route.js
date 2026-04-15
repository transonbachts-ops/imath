import pool from '@/lib/db';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'supersecret_smart_edu_key_999';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const courseId = searchParams.get('courseId');
  if (!courseId) return NextResponse.json({ error: 'Missing courseId' }, { status: 400 });

  const cookieStore = await cookies();
  const token = cookieStore.get('token');
  if (!token) return NextResponse.json({ completed: [] });

  try {
     const user = jwt.verify(token.value, JWT_SECRET);
     // Lấy ds progress của student này trong khoá học
     const [rows] = await pool.query(`
        SELECT p.activity_id FROM student_progress p
        JOIN course_activities a ON p.activity_id = a.id
        JOIN course_modules m ON a.module_id = m.id
        WHERE p.student_id = ? AND m.course_id = ?
     `, [user.userId, courseId]);
     return NextResponse.json({ completed: rows.map(r => r.activity_id) });
  } catch(e) {
     return NextResponse.json({ completed: [] });
  }
}

export async function POST(req) {
  const cookieStore = await cookies();
  const token = cookieStore.get('token');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
     const user = jwt.verify(token.value, JWT_SECRET);
     const { activityId } = await req.json();

     if (user.role === 'student' && activityId) {
        await pool.query(
          'INSERT INTO student_progress (student_id, activity_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP', 
          [user.userId, activityId]
        );
     }
     
     return NextResponse.json({ success: true });
  } catch(e) {
     return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
