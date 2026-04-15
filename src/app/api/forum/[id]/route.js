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

export async function GET(req, { params }) {
  const { id } = await params;
  
  try {
    const [replies] = await pool.query(`
      SELECT r.*, u.full_name as author_name, u.role as author_role
      FROM forum_replies r
      JOIN users u ON r.user_id = u.id
      WHERE r.thread_id = ?
      ORDER BY r.created_at ASC
    `, [id]);
    return NextResponse.json({ replies });
  } catch(err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req, { params }) {
  const { id } = await params;
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { content } = await req.json();
    if (!content) return NextResponse.json({ error: 'Missing content' }, { status: 400 });

    // Check if thread is closed
    const [threads] = await pool.query('SELECT is_closed FROM forum_threads WHERE id = ?', [id]);
    if (threads.length > 0 && threads[0].is_closed) {
      return NextResponse.json({ error: 'This discussion is closed and no longer accepts replies.' }, { status: 403 });
    }

    const [res] = await pool.query(
      'INSERT INTO forum_replies (thread_id, user_id, content) VALUES (?, ?, ?)',
      [id, user.userId || user.id, content]
    );

    return NextResponse.json({ success: true, id: res.insertId });
  } catch(err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
