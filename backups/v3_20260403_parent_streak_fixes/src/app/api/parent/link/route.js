import pool from '@/lib/db';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'supersecret_smart_edu_key_999';

export async function POST(req) {
  try {
    const { inviteCode } = await req.json();
    const cookieStore = await cookies();
    const token = cookieStore.get('token');

    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = jwt.verify(token.value, JWT_SECRET);
    if (user.role !== 'parent') return NextResponse.json({ error: 'Unauthorized role' }, { status: 403 });

    if (!inviteCode) return NextResponse.json({ error: 'Invite code required' }, { status: 400 });

    // 1. Find student
    const [students] = await pool.query(
      "SELECT id FROM users WHERE invite_code = ? AND role = 'student'",
      [inviteCode.trim().toUpperCase()]
    );
    if (students.length === 0) return NextResponse.json({ error: 'Invalid invite code' }, { status: 400 });
    const studentId = students[0].id;

    // 2. Check existing link
    const [existing] = await pool.query(
      'SELECT parent_id FROM parent_student_links WHERE student_id = ?',
      [studentId]
    );
    
    if (existing.length > 0) {
      // If already linked to THIS parent, it's a success
      if (existing[0].parent_id === (user.userId || user.id)) {
        return NextResponse.json({ message: 'Đã liên kết thành công' });
      }
      return NextResponse.json({ error: 'Học sinh này đã được liên kết với một tài khoản phụ huynh khác' }, { status: 400 });
    }

    // 3. Create link
    await pool.query(
      'INSERT INTO parent_student_links (parent_id, student_id) VALUES (?, ?)',
      [user.userId || user.id, studentId]
    );

    return NextResponse.json({ message: 'Linked successfully' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
