import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'supersecret_smart_edu_key_999';

export async function GET(req) {
  const cookieStore = await cookies();
  const token = cookieStore.get('token');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  try {
    const user = jwt.verify(token.value, JWT_SECRET);
    const [rows] = await pool.query(
      'SELECT * FROM feedbacks WHERE user_id=? ORDER BY created_at DESC',
      [user.userId]
    );
    return NextResponse.json({ feedbacks: rows });
  } catch(e) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function POST(req) {
  const cookieStore = await cookies();
  const token = cookieStore.get('token');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  try {
    const user = jwt.verify(token.value, JWT_SECRET);
    const { message, rating } = await req.json();
    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'Vui lòng nhập nội dung phản hồi' }, { status: 400 });
    }
    await pool.query('INSERT INTO feedbacks (user_id, message, rating) VALUES (?, ?, ?)', [user.userId, message.trim(), rating || 5]);
    return NextResponse.json({ success: true });
  } catch(e) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
