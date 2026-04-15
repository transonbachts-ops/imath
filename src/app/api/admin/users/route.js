import pool from '@/lib/db';
import jwt from 'jsonwebtoken';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const JWT_SECRET = 'supersecret_smart_edu_key_999';

// Middleware logic
async function checkAdminStatus() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token');
  if (!token) return null;

  try {
    const user = jwt.verify(token.value, JWT_SECRET);
    if (user.role !== 'admin') return null;
    return user;
  } catch(e) {
    return null;
  }
}

export async function GET() {
  const adminUser = await checkAdminStatus();
  if (!adminUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  // Fetch using graceful try-catch in case can_use_ai does not exist
  let users = [];
  try {
    const [rows] = await pool.query('SELECT id, full_name, email, role, created_at, can_use_ai FROM users');
    users = rows;
  } catch(e) {
    const [rows] = await pool.query('SELECT id, full_name, email, role, created_at FROM users');
    users = rows.map(u => ({...u, can_use_ai: false}));
  }
  return NextResponse.json({ users }, { status: 200 });
}

export async function PUT(req) {
  const adminUser = await checkAdminStatus();
  if (!adminUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  const body = await req.json();

  if (body.update_ai_only) {
    try { await pool.query('ALTER TABLE users ADD COLUMN can_use_ai BOOLEAN DEFAULT FALSE'); } catch(e){}
    await pool.query('UPDATE users SET can_use_ai = ? WHERE id = ?', [body.can_use_ai ? 1 : 0, body.id]);
    return NextResponse.json({ message: 'Cập nhật quyền AI thành công' });
  }

  const { id, role } = body;
  if (!['student', 'teacher', 'admin', 'parent'].includes(role)) {
    return NextResponse.json({ error: 'Role is invalid' }, { status: 400 });
  }

  await pool.query('UPDATE users SET role = ? WHERE id = ?', [role, id]);
  return NextResponse.json({ message: 'Cập nhật phân quyền thành công' });
}

export async function DELETE(req) {
  const adminUser = await checkAdminStatus();
  if (!adminUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  const { id } = await req.json();
  await pool.query('DELETE FROM users WHERE id = ?', [id]);
  return NextResponse.json({ message: 'Xóa người dùng thành công' });
}
