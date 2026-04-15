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

async function hasAccessToActivity(userId, activityId, role) {
  if (role === 'admin') return true;
  const [rows] = await pool.query(
    'SELECT c.id as course_id, c.owner_id FROM course_activities a JOIN course_modules m ON a.module_id = m.id JOIN courses c ON m.course_id = c.id WHERE a.id = ?',
    [activityId]
  );
  if (rows.length === 0) return false;
  if (rows[0].owner_id == userId) return true;
  
  const [collaborators] = await pool.query('SELECT id FROM course_collaborators WHERE course_id = ? AND user_id = ?', [rows[0].course_id, userId]);
  return collaborators.length > 0;
}

export async function GET(req, { params }) {
  const { id } = await params;
  
  const cookieStore = await cookies();
  const token = cookieStore.get('token');
  let user;
  try {
     user = jwt.verify(token.value, JWT_SECRET);
  } catch(e) {
     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [activities] = await pool.query('SELECT * FROM course_activities WHERE id = ?', [id]);
  if (!activities.length) return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
  const activity = activities[0];

  const [progress] = await pool.query('SELECT * FROM student_progress WHERE student_id = ? AND activity_id = ?', [user.userId || user.id, id]);
  
  return NextResponse.json({ activity, isCompleted: progress.length > 0 });
}

export async function PUT(req, { params }) {
  const { id } = await params;
  const user = await checkAccess();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!await hasAccessToActivity(user.userId || user.id, id, user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { title, url, order_index, details, due_date, module_id, type } = await req.json();
  if (!title) return NextResponse.json({ error: 'Missing title' }, { status: 400 });

  let formattedDate = due_date || null;
  if (due_date) {
    const d = new Date(due_date);
    if (!isNaN(d.getTime())) {
      formattedDate = d.toISOString().slice(0, 19).replace('T', ' ');
    }
  }

  await pool.query(
    'UPDATE course_activities SET title = ?, url = ?, order_index = COALESCE(?, order_index), details = ?, due_date = ?, module_id = COALESCE(?, module_id), type = COALESCE(?, type) WHERE id = ?',
    [title, url, order_index, details || '', formattedDate, module_id, type, id]
  );

  
  // Fetch updated activity to return full object
  const [updated] = await pool.query('SELECT * FROM course_activities WHERE id = ?', [id]);
  
  return NextResponse.json({ success: true, ...updated[0] });
}

export async function DELETE(req, { params }) {
  const { id } = await params;
  const user = await checkAccess();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!await hasAccessToActivity(user.userId || user.id, id, user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await pool.query('DELETE FROM course_activities WHERE id = ?', [id]);
  return NextResponse.json({ success: true, id });
}
