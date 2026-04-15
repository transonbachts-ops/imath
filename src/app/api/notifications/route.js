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

export async function GET(req) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = user.userId || user.id;

  try {
    // 1. Run a 'sweep' for deadlines (simplified logic: check assignments in user's courses)
    // In a real app, this should be a scheduled job, but here we can do it on fetch.
    if (user.role === 'student' || user.role === 'parent') {
        let studentIds = [userId];
        if (user.role === 'parent') {
            const [links] = await pool.query('SELECT student_id FROM parent_student_links WHERE parent_id = ?', [userId]);
            studentIds = links.map(l => l.student_id);
        }

        for (const sid of studentIds) {
            const [assignments] = await pool.query(`
                SELECT a.id, a.title, a.due_date, c.title as course_title, m.course_id
                FROM course_activities a
                JOIN course_modules m ON a.module_id = m.id
                JOIN courses c ON m.course_id = c.id
                JOIN enrollments e ON c.id = e.course_id
                WHERE e.user_id = ? AND a.type = 'assignment' AND a.due_date IS NOT NULL
                AND a.due_date > NOW() AND a.due_date < DATE_ADD(NOW(), INTERVAL 3 DAY)
                AND NOT EXISTS (SELECT 1 FROM assignment_submissions s WHERE s.activity_id = a.id AND s.student_id = ?)
            `, [sid, sid]);

            for (const ass of assignments) {
                // Create student notification
                await pool.query(`
                    INSERT IGNORE INTO notifications (user_id, title, message, type, related_id)
                    SELECT ?, ?, ?, 'assignment_deadline', ?
                    FROM DUAL
                    WHERE NOT EXISTS (SELECT 1 FROM notifications WHERE user_id = ? AND related_id = ? AND type = 'assignment_deadline')
                `, [sid, 'Sắp đến hạn nộp bài!', `Bài tập "${ass.title}" trong khóa học "${ass.course_title}" sắp hết hạn vào ${new Date(ass.due_date).toLocaleString('vi-VN')}.`, ass.id, sid, ass.id]);

                // Create parent notification
                if (user.role === 'student') {
                    const [parents] = await pool.query('SELECT parent_id FROM parent_student_links WHERE student_id = ?', [sid]);
                    for (const p of parents) {
                        await pool.query(`
                            INSERT IGNORE INTO notifications (user_id, parent_id, title, message, type, related_id)
                            SELECT ?, ?, ?, ?, 'assignment_deadline', ?
                            FROM DUAL
                            WHERE NOT EXISTS (SELECT 1 FROM notifications WHERE user_id = ? AND related_id = ? AND type = 'assignment_deadline')
                        `, [p.parent_id, sid, 'Con bạn sắp đến hạn nộp bài!', `Bài tập "${ass.title}" của học sinh trong khóa học "${ass.course_title}" sắp hết hạn vào ${new Date(ass.due_date).toLocaleString('vi-VN')}.`, ass.id, p.parent_id, ass.id]);
                    }
                }
            }
        }
    }

    // 2. Fetch notifications
    let query = 'SELECT * FROM notifications WHERE (user_id = ? OR (parent_id IS NOT NULL AND user_id = ?)) AND is_read = FALSE ORDER BY created_at DESC';
    const [notifications] = await pool.query(query, [userId, userId]);

    return NextResponse.json({ notifications });
  } catch (err) {
    console.error('Notification error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req) {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { id, markAllAsRead } = await req.json();
        if (markAllAsRead) {
            await pool.query('UPDATE notifications SET is_read = TRUE WHERE user_id = ?', [user.userId || user.id]);
        } else if (id) {
            await pool.query('UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?', [id, user.userId || user.id]);
        }
        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
