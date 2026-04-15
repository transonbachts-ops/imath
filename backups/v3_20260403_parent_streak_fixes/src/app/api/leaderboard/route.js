import pool from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const [topStreaks] = await pool.query(
      'SELECT id, full_name, email, current_streak, longest_streak FROM users WHERE current_streak > 0 OR longest_streak > 0 ORDER BY current_streak DESC, longest_streak DESC LIMIT 10'
    );
    
    return NextResponse.json({ success: true, leaderboard: topStreaks });
  } catch(e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
