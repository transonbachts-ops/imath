import pool from '@/lib/db';
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const JWT_SECRET = 'supersecret_smart_edu_key_999';

// Check if project belongs to teacher
async function checkOwnership(projectId, teacherId) {
  const [rows] = await pool.query(
    'SELECT id FROM imath_studio_projects WHERE id = ? AND teacher_id = ?',
    [projectId, teacherId]
  );
  return rows.length > 0;
}

export async function GET(req, { params }) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get('token');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = jwt.verify(token.value, JWT_SECRET);

    const [rows] = await pool.query(
      'SELECT id, title, game_type, game_code, config_json, created_at, teacher_id FROM imath_studio_projects WHERE id = ?',
      [id]
    );

    if (rows.length === 0) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

    const project = rows[0];
    
    // Admins see everything, teachers see their own
    if (decoded.role !== 'admin' && project.teacher_id !== decoded.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ project });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get('token');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = jwt.verify(token.value, JWT_SECRET);

    const [p] = await pool.query('SELECT teacher_id FROM imath_studio_projects WHERE id = ?', [id]);
    if (p.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (decoded.role !== 'admin' && p[0].teacher_id !== decoded.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await pool.query('DELETE FROM game_scores WHERE project_id = ?', [id]);
    await pool.query('DELETE FROM imath_studio_projects WHERE id = ?', [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req, { params }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { config_json, title } = body;

    const cookieStore = await cookies();
    const token = cookieStore.get('token');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = jwt.verify(token.value, JWT_SECRET);

    const [p] = await pool.query('SELECT teacher_id FROM imath_studio_projects WHERE id = ?', [id]);
    if (p.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (decoded.role !== 'admin' && p[0].teacher_id !== decoded.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (config_json !== undefined) {
      await pool.query('UPDATE imath_studio_projects SET config_json = ? WHERE id = ?', [JSON.stringify(config_json), id]);
    }
    if (title !== undefined) {
      await pool.query('UPDATE imath_studio_projects SET title = ? WHERE id = ?', [title, id]);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
