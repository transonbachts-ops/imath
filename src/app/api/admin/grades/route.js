import pool from '@/lib/db';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'supersecret_smart_edu_key_999';

export const dynamic = 'force-dynamic';

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
        qr.submitted_at,
        'official' as type
      FROM quiz_results qr
      JOIN users u ON qr.student_id = u.id
      JOIN quizzes q ON qr.quiz_id = q.id
      JOIN course_activities ca ON q.activity_id = ca.id
      JOIN course_modules cm ON ca.module_id = cm.id
      JOIN courses c ON cm.course_id = c.id
      ${user.role === 'teacher' ? 'WHERE c.owner_id = ? OR c.id IN (SELECT course_id FROM course_collaborators WHERE user_id = ?)' : ''}

      UNION ALL

      SELECT 
        u.full_name as student_name,
        u.email as student_email,
        CONCAT('Bài tập hằng ngày - Lớp ', d.grade) as activity_name,
        'Kiểm tra mỗi ngày' as course_name,
        d.score,
        d.submitted_at,
        'daily' as type
      FROM daily_quiz_results d
      JOIN users u ON d.student_id = u.id
      ${user.role === 'teacher' ? 'WHERE 1=0' : ''}

      UNION ALL

      SELECT 
        u.full_name as student_name,
        u.email as student_email,
        p.title as activity_name,
        'iMath Studio' as course_name,
        s.score,
        s.created_at as submitted_at,
        'studio' as type
      FROM game_scores s
      JOIN users u ON s.student_id = u.id
      JOIN imath_studio_projects p ON s.project_id = p.id
      ${user.role === 'teacher' ? 'WHERE p.teacher_id = ?' : ''}
    `;

    const args = [];
    if (user.role === 'teacher') {
      args.push(user.userId);
      args.push(user.userId);
      args.push(user.userId);
    }

    const [allGrades] = await pool.query(gradesSql, args);
    allGrades.sort((a,b) => new Date(b.submitted_at) - new Date(a.submitted_at));

    return NextResponse.json({ grades: allGrades });
  } catch(e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
