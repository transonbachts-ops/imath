import pool, { ensureTeachersTable } from '@/lib/db';
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const JWT_SECRET = 'supersecret_smart_edu_key_999';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.json({ error: 'Missing game code' }, { status: 400 });
  }

  try {
    const [rows] = await pool.query('SELECT * FROM imath_studio_projects WHERE game_code = ?', [code]);
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    return NextResponse.json({ game: rows[0] });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token');
    
    // Auth is optional for playing, but required for recording scores
    if (!token) {
        return NextResponse.json({ error: 'Unauthorized to save score' }, { status: 401 });
    }

    const decoded = jwt.verify(token.value, JWT_SECRET);
    const { project_id, score, details } = await req.json();

    if (!project_id) {
        return NextResponse.json({ error: 'Missing project ID' }, { status: 400 });
    }

    // Standardize score to LMS standard (0-10 scale). 
    // Studio games returns points. We assume 0-100 or 0-1000. 
    // If > 100, divide by 100. If > 10, divide by 10.
    let standardizedScore = parseFloat(score || 0);
    if (standardizedScore > 100) standardizedScore = standardizedScore / 100;
    else if (standardizedScore > 10) standardizedScore = standardizedScore / 10;
    
    standardizedScore = Math.min(10, Math.max(0, standardizedScore));
    standardizedScore = parseFloat(standardizedScore.toFixed(1));

    console.log(`[StudioPlay] Recording score: project_id=${project_id}, student_id=${decoded.userId}, original_score=${score}, standardized=${standardizedScore}`);

    await pool.query(
        'INSERT INTO game_scores (student_id, project_id, score, details_json) VALUES (?, ?, ?, ?)',
        [decoded.userId, project_id, standardizedScore, details ? JSON.stringify(details) : null]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[StudioPlay] Error:', error);
    return NextResponse.json({ error: 'Failed to record score' }, { status: 500 });
  }
}
