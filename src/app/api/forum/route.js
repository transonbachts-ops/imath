import pool, { ensureTeachersTable } from '@/lib/db';
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const JWT_SECRET = 'supersecret_smart_edu_key_999';

async function getUser() {
  await ensureTeachersTable();
  const cookieStore = await cookies();
  const token = cookieStore.get('token');
  if (!token) return null;
  try {
    return jwt.verify(token.value, JWT_SECRET);
  } catch(e) { return null; }
}

export async function GET(req) {
  await ensureTeachersTable();
  const { searchParams } = new URL(req.url);
  const activityId = searchParams.get('activityId');
  const moduleId = searchParams.get('moduleId');
  
  if (!activityId && !moduleId) return NextResponse.json({ error: 'Missing activityId or moduleId' }, { status: 400 });

  try {
    let query = `
      SELECT t.*, u.full_name as author_name, u.role as author_role,
      (SELECT COUNT(*) FROM forum_replies r WHERE r.thread_id = t.id) as reply_count
      FROM forum_threads t
      JOIN users u ON t.user_id = u.id
    `;
    let params = [];

    if (activityId) {
      query += ' WHERE t.activity_id = ?';
      params.push(activityId);
    } else if (moduleId) {
      query += ' WHERE t.module_id = ?';
      params.push(moduleId);
    }

    query += ' ORDER BY t.created_at DESC';

    const [threads] = await pool.query(query, params);
    return NextResponse.json({ threads });
  } catch(err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { activity_id, module_id, title, content } = await req.json();
    if ((!activity_id && !module_id) || !content) return NextResponse.json({ error: 'Missing content or association' }, { status: 400 });

    const [res] = await pool.query(
      'INSERT INTO forum_threads (activity_id, module_id, user_id, title, content) VALUES (?, ?, ?, ?, ?)',
      [activity_id || null, module_id || null, user.userId || user.id, title || '', content]
    );

    return NextResponse.json({ success: true, id: res.insertId });
  } catch(err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { threadId, is_closed } = await req.json();
    if (!threadId) return NextResponse.json({ error: 'Missing threadId' }, { status: 400 });

    // Verify ownership or teacher role
    const [threads] = await pool.query('SELECT user_id FROM forum_threads WHERE id = ?', [threadId]);
    if (!threads.length) return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
    
    const isTeacher = user.role.toLowerCase() === 'teacher' || user.role.toLowerCase() === 'admin';
    const isAuthor = threads[0].user_id === (user.userId || user.id);

    if (!isTeacher && !isAuthor) {
      return NextResponse.json({ error: 'No permission to modify this thread' }, { status: 403 });
    }

    await pool.query('UPDATE forum_threads SET is_closed = ? WHERE id = ?', [is_closed ? 1 : 0, threadId]);
    return NextResponse.json({ success: true });
  } catch(err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
