import pool from '@/lib/db';
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const JWT_SECRET = 'supersecret_smart_edu_key_999';

export async function POST(req) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = jwt.verify(token.value, JWT_SECRET);
    const body = await req.json();
    const { game_type, config_json, title } = body;

    if (!game_type || !config_json) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Generate a unique game code, e.g., MATCH-A1B2
    const randomHex = crypto.randomBytes(2).toString('hex').toUpperCase();
    const game_code = `${game_type.toUpperCase()}-${randomHex}`;

    await pool.query(
      'INSERT INTO imath_studio_projects (teacher_id, title, game_type, game_code, config_json) VALUES (?, ?, ?, ?, ?)',
      [decoded.userId, title || 'Chưa đặt tên', game_type, game_code, JSON.stringify(config_json)]
    );

    return NextResponse.json({ success: true, game_code });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to save project' }, { status: 500 });
  }
}

export async function GET(req) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = jwt.verify(token.value, JWT_SECRET);
    const role = String(decoded.role || '').toLowerCase();
    const isAdmin = role === 'admin';

    // Filter by teacher_id only if not admin
    const [rows] = await pool.query(
      `SELECT id, title, game_type, game_code, config_json, created_at FROM imath_studio_projects 
       ${isAdmin ? '' : 'WHERE teacher_id = ?'} 
       ORDER BY created_at DESC`,
      isAdmin ? [] : [decoded.userId]
    );

    return NextResponse.json({ projects: rows });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
