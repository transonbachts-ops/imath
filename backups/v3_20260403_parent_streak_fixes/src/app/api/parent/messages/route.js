import pool from '@/lib/db';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'supersecret_smart_edu_key_999';

async function getAuthUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token');
  if (!token) return null;
  try {
    return jwt.verify(token.value, JWT_SECRET);
  } catch(e) { return null; }
}

// GET: Fetch conversation or just unread count
export async function GET(req) {
  const user = await getAuthUser();
  if (!user || !['parent', 'teacher', 'admin'].includes(user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const studentId = searchParams.get('student_id');
  const otherUserId = searchParams.get('other_user_id');

  // Quick unread count mode (for notification badges)
  if (studentId === '0') {
    const [unread] = await pool.query(
      'SELECT COUNT(*) as cnt FROM parent_messages WHERE receiver_id = ? AND is_read = FALSE',
      [user.userId]
    );
    return NextResponse.json({ messages: [], unreadCount: unread[0]?.cnt || 0 });
  }

  try {
    // Mark incoming messages as read
    await pool.query(
      'UPDATE parent_messages SET is_read = TRUE WHERE receiver_id = ? AND sender_id = ? AND student_id = ?',
      [user.userId, otherUserId, studentId]
    );

    let queryOptions = '';
    let queryParams = [];
    const courseId = searchParams.get('course_id');
    
    if (user.role === 'admin') {
      // Allow admin to read ALL messages involving this student and parent (bypassing course_id which might be null for older messages)
      queryOptions = `WHERE pm.student_id = ? AND (pm.sender_id = ? OR pm.receiver_id = ?)`;
      queryParams = [studentId, otherUserId, otherUserId];
    } else {
      queryOptions = `WHERE pm.student_id = ? AND ((pm.sender_id = ? AND pm.receiver_id = ?) OR (pm.sender_id = ? AND pm.receiver_id = ?))`;
      queryParams = [studentId, user.userId, otherUserId, otherUserId, user.userId];
    }

    const [messages] = await pool.query(
      `SELECT pm.*, 
              u.full_name as sender_name, u.avatar_url as sender_avatar, u.role as sender_role
       FROM parent_messages pm
       JOIN users u ON pm.sender_id = u.id
       ${queryOptions}
       ORDER BY pm.created_at ASC`,
      queryParams
    );

    const [unread] = await pool.query(
      'SELECT COUNT(*) as cnt FROM parent_messages WHERE receiver_id = ? AND is_read = FALSE',
      [user.userId]
    );

    return NextResponse.json({ messages, unreadCount: unread[0]?.cnt || 0 });
  } catch(e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST: Send a message
export async function POST(req) {
  const user = await getAuthUser();
  if (!user || !['parent', 'teacher', 'admin'].includes(user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Gracefully add attachment columns if they don't exist
  try { await pool.query('ALTER TABLE parent_messages ADD COLUMN attachment_url VARCHAR(1000) NULL'); } catch(e){}
  try { await pool.query('ALTER TABLE parent_messages ADD COLUMN attachment_type VARCHAR(50) NULL'); } catch(e){}

  try {
    const { receiverId, studentId, courseId, content, attachment_url, attachment_type } = await req.json();
    if (!receiverId || !studentId || (!content?.trim() && !attachment_url)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const [result] = await pool.query(
      'INSERT INTO parent_messages (sender_id, receiver_id, student_id, course_id, content, attachment_url, attachment_type) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [user.userId, receiverId, studentId, courseId || null, content?.trim() || '', attachment_url || null, attachment_type || null]
    );

    const [newMsg] = await pool.query(
      `SELECT pm.*, u.full_name as sender_name, u.avatar_url as sender_avatar, u.role as sender_role
       FROM parent_messages pm JOIN users u ON pm.sender_id = u.id WHERE pm.id = ?`,
      [result.insertId]
    );

    return NextResponse.json({ message: newMsg[0] }, { status: 201 });
  } catch(e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
