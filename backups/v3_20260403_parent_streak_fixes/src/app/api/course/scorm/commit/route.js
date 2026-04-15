import pool from '@/lib/db';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'supersecret_smart_edu_key_999';

export async function POST(req) {
  const cookieStore = await cookies();
  const token = cookieStore.get('token');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let user;
  try {
    user = jwt.verify(token.value, JWT_SECRET);
  } catch (err) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  const { activityId, score, status, successStatus, suspendData, isManualComplete } = await req.json();

  if (!activityId) return NextResponse.json({ error: 'Missing activityId' }, { status: 400 });

  try {
    // Determine completion (be lenient with strings)
    const combinedStatus = ((status || '') + (successStatus || '')).toLowerCase();
    const isCompleted = 
      isManualComplete || // MANUAL OVERRIDE
      combinedStatus.includes('passed') || 
      combinedStatus.includes('completed') || 
      combinedStatus.includes('succeeded') ||
      status === '1' || status === 1;

    // 1. Mark as completed in student_progress if status matches
    if (isCompleted) {
      await pool.query(
        'INSERT IGNORE INTO student_progress (student_id, activity_id, completed_at) VALUES (?, ?, NOW())',
        [user.userId, activityId]
      );

      // --- STREAK LOGIC ---
      const vnTime = new Date(new Date().getTime() + 7 * 60 * 60 * 1000);
      const seedDate = vnTime.toISOString().split('T')[0];
      const yesterday = new Date(vnTime.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const [uRows] = await pool.query('SELECT current_streak, longest_streak, last_quiz_date FROM users WHERE id=?', [user.userId]);
      const u = uRows[0];
      
      let cur = u.current_streak || 0;
      let lon = u.longest_streak || 0;
      let last = u.last_quiz_date ? new Date(u.last_quiz_date).toISOString().split('T')[0] : null;

      if (last !== seedDate) {
        if (last === yesterday) cur += 1;
        else cur = 1;

        if (cur > lon) lon = cur;
        await pool.query('UPDATE users SET current_streak=?, longest_streak=?, last_quiz_date=? WHERE id=?', [cur, lon, seedDate, user.userId]);
      }
    }

    // 2. We could store detailed SCORM data in a new table if needed, 
    // but for now, the primary goal is marking completion.
    
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
