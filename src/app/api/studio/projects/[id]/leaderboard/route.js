import pool from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req, { params }) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'Missing Project ID' }, { status: 400 });

    const [rows] = await pool.query(`
      SELECT g.score, u.full_name as name, u.avatar_url, g.created_at
      FROM game_scores g
      JOIN users u ON g.student_id = u.id
      WHERE g.project_id = ?
      ORDER BY g.score DESC, g.created_at ASC
      LIMIT 20
    `, [id]);

    const leaderboard = rows.map((r, index) => ({
      rank: index + 1,
      name: r.name || 'Người chơi ẩn danh',
      score: r.score,
      avatar: r.avatar_url || 'https://www.gravatar.com/avatar?d=mp',
      date: new Date(r.created_at).toLocaleDateString('vi-VN')
    }));

    return NextResponse.json({ leaderboard });
  } catch (err) {
    console.error('[ProjectLeaderboard] Error:', err);
    return NextResponse.json({ error: err.message, leaderboard: [] }, { status: 500 });
  }
}
