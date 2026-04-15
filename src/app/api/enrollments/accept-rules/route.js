import pool from '@/lib/db';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'supersecret_smart_edu_key_999';

export async function POST(req) {
  const cookieStore = await cookies();
  const token = cookieStore.get('token');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const user = jwt.verify(token.value, JWT_SECRET);
    const { courseId } = await req.json();

    if (!courseId) return NextResponse.json({ error: 'Missing courseId' }, { status: 400 });

    await pool.query(
      'UPDATE enrollments SET rules_accepted = 1 WHERE user_id = ? AND course_id = ?',
      [user.userId, courseId]
    );

    return NextResponse.json({ success: true, message: 'Nội quy đã được chấp thuận.' });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
