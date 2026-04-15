import pool from '@/lib/db';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'supersecret_smart_edu_key_999';

export async function POST(req) {
  try {
    // 1. Auto-migrate schema locally gracefully:
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS user_study_time (
          user_id INT NOT NULL,
          study_date DATE NOT NULL,
          minutes INT DEFAULT 1,
          PRIMARY KEY (user_id, study_date),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);
    } catch (e) {
      console.error('Time DB Init Error:', e.message);
    } // ignore if exists or fails on bad permissions

    const cookieStore = await cookies();
    const token = cookieStore.get('token');
    if (!token) return NextResponse.json({ success: false, reason: 'No token' });

    let decoded;
    try {
      decoded = jwt.verify(token.value, JWT_SECRET);
    } catch (e) {
      return NextResponse.json({ success: false, reason: 'Invalid token' });
    }

    if (!decoded.userId || decoded.role !== 'student') {
        return NextResponse.json({ success: true, reason: 'Not a student, skipped' });
    }

    // 2. Insert or increment minutes for today
    const { increment = 1 } = await req.json().catch(() => ({ increment: 1 }));

    await pool.query(`
      INSERT INTO user_study_time (user_id, study_date, minutes)
      VALUES (?, CURDATE(), ?)
      ON DUPLICATE KEY UPDATE minutes = minutes + ?
    `, [decoded.userId, increment, increment]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Track Time API Error', error);
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}
