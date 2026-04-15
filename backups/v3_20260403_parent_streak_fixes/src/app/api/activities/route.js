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

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const moduleId = searchParams.get('moduleId');
  
  // if fetch all for a course: (requires join or parameter)
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
  const admin = await checkAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { module_id, title, type, url, order_index, details } = await req.json();
  if (!module_id || !title || !type) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });

  const [res] = await pool.query(
    'INSERT INTO course_activities (module_id, title, type, url, order_index, details) VALUES (?, ?, ?, ?, ?, ?)',
    [module_id, title, type, url || '', order_index || 0, details || '']
  );
  
  return NextResponse.json({ id: res.insertId, module_id, title, type, url, order_index, details });
}
