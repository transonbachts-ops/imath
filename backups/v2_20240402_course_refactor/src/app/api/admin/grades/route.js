import pool from '@/lib/db';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'supersecret_smart_edu_key_999';

export async function GET(req) {
  const cookieStore = await cookies();
  const token = cookieStore.get('token');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const user = jwt.verify(token.value, JWT_SECRET);
    if (user.role !== 'admin' && user.role !== 'teacher') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    
    let gradesSql = `
      SELECT 
        u.full_name as student_name,
        u.email as student_email,
        ca.title as activity_name,
        c.title as course_name,
        qr.score,
        qr.submitted_at
      FROM quiz_results qr
      JOIN users u ON qr.student_id = u.id
      JOIN quizzes q ON qr.quiz_id = q.id
      JOIN course_activities ca ON q.activity_id = ca.id
      JOIN course_modules cm ON ca.module_id = cm.id
      JOIN courses c ON cm.course_id = c.id
    `;
    const args = [];
    if (user.role === 'teacher') {
      gradesSql += ' WHERE c.owner_id = ? ';
      args.push(user.userId);
    }
    gradesSql += ' ORDER BY qr.submitted_at DESC';

    const [grades] = await pool.query(gradesSql, args);
    
    return NextResponse.json({ grades });
  } catch(e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
