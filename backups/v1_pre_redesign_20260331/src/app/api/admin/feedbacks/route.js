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
    if (user.role !== 'admin' && user.role !== 'teacher') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const [feedbacks] = await pool.query(`
      SELECT f.*, COALESCE(u.full_name, 'Học viên (đã xóa)') as full_name, u.email
      FROM feedbacks f
      LEFT JOIN users u ON f.user_id = u.id
      ORDER BY f.created_at DESC
    `);
    return NextResponse.json({ feedbacks });
  } catch(e) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
