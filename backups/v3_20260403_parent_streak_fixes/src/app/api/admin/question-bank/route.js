import pool from '@/lib/db';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'supersecret_smart_edu_key_999';

async function verifyAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token');
  if (!token) return null;
  try {
    const user = jwt.verify(token.value, JWT_SECRET);
    if (user.role === 'admin' || user.role === 'teacher') return user;
    return null;
  } catch(e) { return null; }
}

export async function GET(req) {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const grade = url.searchParams.get('grade');
  const action = url.searchParams.get('action');

  if (action === 'random') {
     const count = parseInt(url.searchParams.get('count')) || 10;
     if (!grade) return NextResponse.json({ error: 'Grade required' }, { status: 400 });
     const [questions] = await pool.query('SELECT * FROM question_bank WHERE grade = ? ORDER BY RAND() LIMIT ?', [grade, count]);
     return NextResponse.json({ questions });
  }

  let query = 'SELECT * FROM question_bank ORDER BY created_at DESC';
  let params = [];
  if (grade) {
    query = 'SELECT * FROM question_bank WHERE grade = ? ORDER BY created_at DESC';
    params = [grade];
  }

  const [questions] = await pool.query(query, params);
  return NextResponse.json({ questions });
}

export async function POST(req) {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { grade, question_text, options_json, correct_answer, tags, hint, image_url, video_url } = body;

  const [res] = await pool.query(
    'INSERT INTO question_bank (grade, question_text, options_json, correct_answer, tags, hint, image_url, video_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [grade, question_text, JSON.stringify(options_json || {}), correct_answer || 'A', tags || '', hint || '', image_url || null, video_url || null]
  );

  return NextResponse.json({ success: true, id: res.insertId });
}

export async function PUT(req) {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { id, grade, question_text, options_json, correct_answer, tags, hint, image_url, video_url } = body;

  await pool.query(
    'UPDATE question_bank SET grade=?, question_text=?, options_json=?, correct_answer=?, tags=?, hint=?, image_url=?, video_url=? WHERE id=?',
    [grade, question_text, JSON.stringify(options_json || {}), correct_answer || 'A', tags || '', hint || '', image_url || null, video_url || null, id]
  );

  return NextResponse.json({ success: true });
}

export async function DELETE(req) {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  await pool.query('DELETE FROM question_bank WHERE id=?', [body.id]);

  return NextResponse.json({ success: true });
}
