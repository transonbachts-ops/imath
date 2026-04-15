import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import pool from '@/lib/db';

const JWT_SECRET = 'supersecret_smart_edu_key_999';

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token');
  
  if (!token) return NextResponse.json({ role: 'guest' });

  try {
    const user = jwt.verify(token.value, JWT_SECRET);
    
    // Live cleanup for the current user's streak
    const vnTime = new Date(new Date().getTime() + 7 * 60 * 60 * 1000);
    const yesterday = new Date(vnTime.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const [uRows] = await pool.query(`
      SELECT id, role, full_name, 
             IF(last_quiz_date < ?, 0, current_streak) as current_streak,
             avatar_url
      FROM users WHERE id = ?
    `, [yesterday, user.userId]);

    if (!uRows.length) return NextResponse.json({ role: 'guest' });
    const u = uRows[0];

    return NextResponse.json({ 
      id: u.id, 
      role: u.role, 
      name: u.full_name, 
      current_streak: u.current_streak,
      avatar_url: u.avatar_url 
    });
  } catch(e) {
    return NextResponse.json({ role: 'guest' });
  }
}
