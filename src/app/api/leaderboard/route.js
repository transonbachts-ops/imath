import pool from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const vnTime = new Date(new Date().getTime() + 7 * 60 * 60 * 1000);
    const yesterday = new Date(vnTime.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const [topStreaks] = await pool.query(`
      SELECT id, full_name, email, 
             IF(last_quiz_date < ?, 0, current_streak) as current_streak, 
             longest_streak 
      FROM users 
      WHERE (current_streak > 0 OR longest_streak > 0)
      ORDER BY current_streak DESC, longest_streak DESC 
      LIMIT 10
    `, [yesterday]);
    
    return NextResponse.json({ success: true, leaderboard: topStreaks });
  } catch(e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
