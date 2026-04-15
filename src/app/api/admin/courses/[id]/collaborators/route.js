import pool from '@/lib/db';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'supersecret_smart_edu_key_999';

export async function GET(req, { params }) {
  const { id } = await params;
  try {
    const [rows] = await pool.query(`
      SELECT cc.id, u.id as user_id, u.full_name, u.email 
      FROM course_collaborators cc
      JOIN users u ON cc.user_id = u.id
      WHERE cc.course_id = ?
    `, [id]);
    return NextResponse.json({ collaborators: rows });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req, { params }) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get('token');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  let user = jwt.verify(token.value, JWT_SECRET);

  const { user_email } = await req.json();

  try {
    // Check if requester is owner
    const [course] = await pool.query('SELECT owner_id FROM courses WHERE id = ?', [id]);
    if (course.length === 0) return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    
    // Only owner/collaborator can add collaborators
    if (user.role === 'teacher') {
      const [collab] = await pool.query('SELECT id FROM course_collaborators WHERE course_id = ? AND user_id = ?', [id, user.userId || user.id]);
      if (course[0].owner_id != (user.userId || user.id) && collab.length === 0) {
        return NextResponse.json({ error: 'Bạn không có quyền thêm người cộng tác.' }, { status: 403 });
      }
    }

    // Find user by email
    const [targetUsers] = await pool.query('SELECT id, role FROM users WHERE email = ?', [user_email]);
    if (targetUsers.length === 0) return NextResponse.json({ error: 'Không tìm thấy giáo viên với email này.' }, { status: 404 });
    
    const target = targetUsers[0];
    if (target.role !== 'teacher') return NextResponse.json({ error: 'Người này không phải là giáo viên.' }, { status: 400 });

    await pool.query('INSERT IGNORE INTO course_collaborators (course_id, user_id) VALUES (?, ?)', [id, target.id]);
    
    return NextResponse.json({ message: 'Đã thêm người cộng tác thành công!' });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get('token');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  let user = jwt.verify(token.value, JWT_SECRET);

  const { collaborator_id } = await req.json(); // the primary key id of course_collaborators

  try {
    // Check if requester is owner
    const [course] = await pool.query('SELECT owner_id FROM courses WHERE id = ?', [id]);
    
    // Only owner/collaborator can remove collaborators
    if (user.role === 'teacher') {
      const [collab] = await pool.query('SELECT id FROM course_collaborators WHERE course_id = ? AND user_id = ?', [id, user.userId || user.id]);
      if (course[0].owner_id != (user.userId || user.id) && collab.length === 0) {
        return NextResponse.json({ error: 'Bạn không có quyền xóa người cộng tác.' }, { status: 403 });
      }
    }

    await pool.query('DELETE FROM course_collaborators WHERE id = ? AND course_id = ?', [collaborator_id, id]);
    return NextResponse.json({ message: 'Đã gỡ người cộng tác.' });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
