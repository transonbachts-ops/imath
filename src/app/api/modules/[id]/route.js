import pool from '@/lib/db';
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const JWT_SECRET = 'supersecret_smart_edu_key_999';

async function checkAccess() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token');
  if (!token) return null;
  try {
    const user = jwt.verify(token.value, JWT_SECRET);
    if (['admin', 'teacher'].includes(user.role)) return user;
    return null;
  } catch(e) { return null; }
}

async function hasAccessToModule(userId, moduleId, role) {
  if (role === 'admin') return true;
  const [rows] = await pool.query(
    'SELECT c.id as course_id, c.owner_id FROM course_modules m JOIN courses c ON m.course_id = c.id WHERE m.id = ?',
    [moduleId]
  );
  if (rows.length === 0) return false;
  if (rows[0].owner_id == userId) return true;
  
  const [collaborators] = await pool.query('SELECT id FROM course_collaborators WHERE course_id = ? AND user_id = ?', [rows[0].course_id, userId]);
  return collaborators.length > 0;
}

export async function PUT(req, { params }) {
  const { id } = await params;
  const user = await checkAccess();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!await hasAccessToModule(user.userId || user.id, id, user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const data = await req.json();
  const { title, content, order_index } = data;
  
  if (title === "") return NextResponse.json({ error: 'Tiêu đề không được để trống' }, { status: 400 });

  await pool.query(
    'UPDATE course_modules SET title = COALESCE(?, title), content = COALESCE(?, content), order_index = COALESCE(?, order_index) WHERE id = ?',
    [title || null, content || null, order_index || null, id]
  );
  
  return NextResponse.json({ success: true, id, title, content, order_index });
}

export async function DELETE(req, { params }) {
  const { id } = await params;
  const user = await checkAccess();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!await hasAccessToModule(user.userId || user.id, id, user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await pool.query('DELETE FROM course_modules WHERE id = ?', [id]);
  return NextResponse.json({ success: true, id });
}
