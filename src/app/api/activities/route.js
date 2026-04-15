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

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const moduleId = searchParams.get('moduleId');
  const courseId = searchParams.get('courseId');

  if (courseId) {
     const [rows] = await pool.query(`
        SELECT a.* FROM course_activities a 
        JOIN course_modules m ON a.module_id = m.id
        WHERE m.course_id = ?
        ORDER BY a.order_index ASC
     `, [courseId]);
     return NextResponse.json(rows);
  } else if (moduleId) {
     const [rows] = await pool.query('SELECT * FROM course_activities WHERE module_id = ? ORDER BY order_index ASC', [moduleId]);
     return NextResponse.json(rows);
  }
  
  return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
}

export async function POST(req) {
  const user = await checkAccess();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const data = await req.json();
    const { module_id, title, type, url, order_index, details } = data;
    
    if (!module_id || !title || !type) {
      return NextResponse.json({ error: 'Thiếu thông tin bắt buộc (Chương học, Tiêu đề hoặc Loại học liệu)' }, { status: 400 });
    }

    // Ownership check for teachers (including collaborators)
    if (user.role === 'teacher') {
      const [rows] = await pool.query(
        'SELECT c.id as course_id, c.owner_id FROM course_modules m JOIN courses c ON m.course_id = c.id WHERE m.id = ?',
        [module_id]
      );
      if (rows.length === 0) {
        return NextResponse.json({ error: 'Forbidden: Module không tồn tại.' }, { status: 404 });
      }
      
      const isOwner = rows[0].owner_id == (user.userId || user.id);
      
      const [collaborators] = await pool.query('SELECT id FROM course_collaborators WHERE course_id = ? AND user_id = ?', [rows[0].course_id, user.userId || user.id]);
      const isCollaborator = collaborators.length > 0;

      if (!isOwner && !isCollaborator) {
        return NextResponse.json({ error: 'Forbidden: Bạn không có quyền thêm học liệu vào khóa học này.' }, { status: 403 });
      }
    }

    const [res] = await pool.query(
      'INSERT INTO course_activities (module_id, title, type, url, order_index, details, due_date) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [module_id, title, type, url || '', order_index || 0, details || '', data.due_date || null]
    );
    
    return NextResponse.json({ 
      id: Number(res.insertId), 
      module_id: Number(module_id), 
      title, 
      type, 
      url: url || '', 
      order_index: Number(order_index || 0), 
      details: details || '' 
    });
  } catch (err) {
    console.error('Error creating activity:', err);
    return NextResponse.json({ error: 'Lỗi server khi thêm học liệu: ' + err.message }, { status: 500 });
  }
}
