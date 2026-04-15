import pool from '@/lib/db';
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const JWT_SECRET = 'supersecret_smart_edu_key_999';

async function getUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token');
  if (!token) return null;
  try {
    return jwt.verify(token.value, JWT_SECRET);
  } catch(e) { return null; }
}

export async function POST(req) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { activity_id, content, file_url } = await req.json();
    const studentId = user.userId || user.id;

    if (!activity_id) return NextResponse.json({ error: 'Missing activity_id' }, { status: 400 });

    // Check if activity exists and is an assignment
    const [activities] = await pool.query('SELECT * FROM course_activities WHERE id = ?', [activity_id]);
    if (!activities.length) return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
    const activity = activities[0];

    // Check if assignment is past due
    if (activity.due_date && new Date() > new Date(activity.due_date)) {
        // We could still allow submission but mark as late, but for now let's just proceed
    }

    // Insert or update submission
    await pool.query(`
      INSERT INTO assignment_submissions (activity_id, student_id, content, file_url)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE content = VALUES(content), file_url = VALUES(file_url), submitted_at = CURRENT_TIMESTAMP
    `, [activity_id, studentId, content || '', file_url || '']);

    // Mark notifications as read for this user and activity
    await pool.query('UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND related_id = ? AND type = "assignment_deadline"', [studentId, activity_id]);

    // Mark as completed in student_progress
    await pool.query('INSERT IGNORE INTO student_progress (student_id, activity_id) VALUES (?, ?)', [studentId, activity_id]);

    return NextResponse.json({ success: true, message: 'Nộp bài thành công!' });
  } catch (err) {
    console.error('Submission error:', err);
    return NextResponse.json({ error: 'Lỗi server khi nộp bài: ' + err.message }, { status: 500 });
  }
}

export async function GET(req) {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const activityId = searchParams.get('activityId');
    const studentId = searchParams.get('studentId') || (user.userId || user.id);

    // If teacher/admin, they can see others' submissions. If student, only their own.
    const targetUserId = (user.role === 'admin' || user.role === 'teacher') ? studentId : (user.userId || user.id);

    try {
        let query = 'SELECT * FROM assignment_submissions WHERE activity_id = ? AND student_id = ?';
        const [rows] = await pool.query(query, [activityId, targetUserId]);
        return NextResponse.json({ submission: rows[0] || null });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
