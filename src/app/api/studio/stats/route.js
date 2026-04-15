import pool, { ensureTeachersTable } from '@/lib/db';
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const JWT_SECRET = 'supersecret_smart_edu_key_999';
export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    await ensureTeachersTable();
    const cookieStore = await cookies();
    const token = cookieStore.get('token');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = jwt.verify(token.value, JWT_SECRET);
    const role = String(decoded.role || '').toLowerCase();
    const isAdmin = role === 'admin';
    const userId = decoded.userId;

    console.log(`[StudioStats] Debug: UserID=${userId}, Role=${role}, IsAdmin=${isAdmin}`);

    // --- AUTO-REPAIR SECTION: Fix orphaned scores ---
    try {
      // Find scores where project_id IS NULL and try to link via activity code
      const [orphanedScoreRows] = await pool.query(`
        SELECT s.id, a.details as code
        FROM game_scores s
        JOIN course_activities a ON s.activity_id = a.id
        WHERE s.project_id IS NULL AND a.details IS NOT NULL AND a.details != ''
      `);
      
      if (orphanedScoreRows.length > 0) {
        console.log(`[StudioStats] Auto-repair: Found ${orphanedScoreRows.length} orphaned scores.`);
        for (const row of orphanedScoreRows) {
           const [p] = await pool.query('SELECT id FROM imath_studio_projects WHERE UPPER(TRIM(game_code)) = UPPER(TRIM(?))', [row.code]);
           if (p.length > 0) {
              await pool.query('UPDATE game_scores SET project_id = ? WHERE id = ?', [p[0].id, row.id]);
           }
        }
      }
    } catch (repairErr) {
      console.error('[StudioStats] Auto-repair error (ignored):', repairErr);
    }
    // ------------------------------------------------

    // 1. Basic Stats
    const statsQuery = isAdmin 
      ? `SELECT 
            (SELECT COUNT(*) FROM imath_studio_projects) as totalGames,
            COUNT(s.id) as totalPlays,
            COUNT(DISTINCT s.student_id) as uniqueStudents
         FROM game_scores s` 
      : `SELECT 
            (SELECT COUNT(*) FROM imath_studio_projects WHERE teacher_id = ?) as totalGames,
            COUNT(s.id) as totalPlays,
            COUNT(DISTINCT s.student_id) as uniqueStudents
         FROM imath_studio_projects p
         LEFT JOIN game_scores s ON p.id = s.project_id
         WHERE p.teacher_id = ?`;

    const statsArgs = isAdmin ? [] : [userId, userId];
    const [statsRows] = await pool.query(statsQuery, statsArgs);
    const stats = statsRows[0];

    // 3. Score Distribution Analysis
    const [scoreRows] = await pool.query(`
      SELECT 
        CASE 
          WHEN s.score >= 8 THEN 'Giỏi'
          WHEN s.score >= 5 THEN 'Khá/Trung bình'
          ELSE 'Yếu'
        END as level,
        COUNT(*) as count
      FROM game_scores s
      JOIN imath_studio_projects p ON s.project_id = p.id
      ${isAdmin ? '' : 'WHERE p.teacher_id = ?'}
      GROUP BY level
    `, isAdmin ? [] : [userId]);

    // 4. Most Missed Questions Analysis
    const [detailRows] = await pool.query(`
      SELECT s.details_json, p.title as game_title
      FROM game_scores s
      JOIN imath_studio_projects p ON s.project_id = p.id
      WHERE ${isAdmin ? '1=1' : 'p.teacher_id = ?'} AND s.details_json IS NOT NULL
    `, isAdmin ? [] : [userId]);

    const mistakeMap = {};
    detailRows.forEach(row => {
      let details;
      try {
        details = typeof row.details_json === 'string' ? JSON.parse(row.details_json) : row.details_json;
      } catch(e) { return; }
      
      if (details.mistakes && Array.isArray(details.mistakes)) {
        details.mistakes.forEach(m => {
          const key = `${row.game_title}: ${m.problem || ''} (Cần: ${m.expected || ''})`;
          mistakeMap[key] = (mistakeMap[key] || 0) + 1;
        });
      }
    });

    const topMistakes = Object.entries(mistakeMap)
      .map(([question, count]) => ({ question, count }))
      .sort((a,b) => b.count - a.count)
      .slice(0, 5);

    // 2. Recent Play History (last 50 entries)
    const [historyRows] = await pool.query(`
      SELECT 
        s.score,
        s.created_at,
        u.full_name as student_name,
        p.title as game_title,
        p.game_type
      FROM game_scores s
      JOIN users u ON s.student_id = u.id
      JOIN imath_studio_projects p ON s.project_id = p.id
      ${isAdmin ? '' : 'WHERE p.teacher_id = ?'}
      ORDER BY s.created_at DESC
      LIMIT 50
    `, isAdmin ? [] : [userId]);

    return NextResponse.json({
      totalGames: stats?.totalGames || 0,
      totalPlays: stats?.totalPlays || 0,
      uniqueStudents: stats?.uniqueStudents || 0,
      avgEngagement: stats?.totalGames > 0 ? (stats.totalPlays / stats.totalGames).toFixed(1) : '0',
      history: historyRows || [],
      scoreDistribution: scoreRows || [],
      topMistakes: topMistakes || []
    });
  } catch (error) {
    console.error('[StudioStats] Global Error:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics', message: error.message }, { status: 500 });
  }
}
 
