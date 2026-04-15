import pool from '@/lib/db';
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const JWT_SECRET = 'supersecret_smart_edu_key_999';
async function checkAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token');
  if (!token) return null;
  try {
    const user = jwt.verify(token.value, JWT_SECRET);
    if (user.role === 'admin') return user;
    return null;
  } catch(e) { return null; }
}

export async function PUT(req, { params }) {
  const { id } = await params;
  const admin = await checkAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { title, url, order_index, details } = await req.json();
  if (!title) return NextResponse.json({ error: 'Missing title' }, { status: 400 });

  await pool.query(
    'UPDATE course_activities SET title = ?, url = ?, order_index = COALESCE(?, order_index), details = ? WHERE id = ?',
    [title, url, order_index, details || '', id]
  );
  
  return NextResponse.json({ success: true, id, title, url, order_index, details });
}

export async function DELETE(req, { params }) {
  const { id } = await params;
  const admin = await checkAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await pool.query('DELETE FROM course_activities WHERE id = ?', [id]);
  return NextResponse.json({ success: true, id });
}
