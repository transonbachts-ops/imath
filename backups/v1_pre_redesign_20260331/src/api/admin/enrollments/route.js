import pool from '@/lib/db';
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const JWT_SECRET = 'supersecret_smart_edu_key_999';

async function verifyAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token');
  if (!token) return null;
  try {
    const user = jwt.verify(token.value, JWT_SECRET);
    if (user.role === 'admin' || user.role === 'teacher') return user;
    return null;
  } catch(e) {
    return null;
  }
}

export async function GET() {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [rows] = await pool.query(`
    SELECT e.id, e.status, e.created_at, u.full_name as student_name, u.email as student_email, c.title as course_title 
    FROM enrollments e
    JOIN users u ON e.user_id = u.id
    JOIN courses c ON e.course_id = c.id
    ORDER BY e.created_at DESC
  `);
  return NextResponse.json({ enrollments: rows });
}

export async function PUT(req) {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, status } = await req.json();
  if (!id || !['approved', 'rejected', 'pending'].includes(status)) {
    return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
  }

  await pool.query('UPDATE enrollments SET status = ? WHERE id = ?', [status, id]);
  return NextResponse.json({ success: true, id, status });
}
