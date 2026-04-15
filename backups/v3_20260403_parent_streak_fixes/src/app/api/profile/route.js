import pool from '@/lib/db';
import jwt from 'jsonwebtoken';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';

const JWT_SECRET = 'supersecret_smart_edu_key_999';

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const decoded = jwt.verify(token.value, JWT_SECRET);
    
    // Ensure column exists to avoid crash
    try { await pool.query('ALTER TABLE users ADD COLUMN avatar_url VARCHAR(500) NULL'); } catch(e){}

    const [users] = await pool.query('SELECT id, full_name, email, role, avatar_url, created_at, invite_code FROM users WHERE id = ?', [decoded.userId || decoded.id]);
    if (!users.length) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    const user = users[0];

    // Check for link
    let linkedInfo = null;
    if (user.role === 'student') {
      const [links] = await pool.query(
        `SELECT u.full_name FROM parent_student_links psl
         JOIN users u ON psl.parent_id = u.id
         WHERE psl.student_id = ?`,
        [user.id]
      );
      if (links.length > 0) linkedInfo = { role: 'parent', full_name: links[0].full_name };
    } else if (user.role === 'parent') {
      const [links] = await pool.query(
        `SELECT u.full_name FROM parent_student_links psl
         JOIN users u ON psl.student_id = u.id
         WHERE psl.parent_id = ?`,
        [user.id]
      );
      if (links.length > 0) linkedInfo = { role: 'student', full_name: links[0].full_name };
    }

    return NextResponse.json({ user: { ...user, linkedInfo } });
  } catch (e) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
}

export async function PUT(req) {
  const cookieStore = await cookies();
  const token = cookieStore.get('token');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const decoded = jwt.verify(token.value, JWT_SECRET);
    const body = await req.json();
    const { full_name, avatar_url, password } = body;

    // Gracefully check for avatar_url column
    try { await pool.query('ALTER TABLE users ADD COLUMN avatar_url VARCHAR(500) NULL'); } catch(e){}

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      await pool.query('UPDATE users SET full_name = ?, avatar_url = ?, password = ? WHERE id = ?', [full_name, avatar_url, hashedPassword, decoded.userId]);
    } else {
      await pool.query('UPDATE users SET full_name = ?, avatar_url = ? WHERE id = ?', [full_name, avatar_url, decoded.userId]);
    }

    return NextResponse.json({ message: 'Cập nhật hồ sơ thành công!' });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}
