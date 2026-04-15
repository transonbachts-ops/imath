import pool from '@/lib/db';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'supersecret_smart_edu_key_999';

export async function GET() {
  const [teachers] = await pool.query('SELECT * FROM teachers ORDER BY id');
  return NextResponse.json({ teachers });
}

export async function POST(req) {
  const cookieStore = await cookies();
  const token = cookieStore.get('token');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const user = jwt.verify(token.value, JWT_SECRET);
    if (user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const data = await req.json();
    if (data.id) {
      await pool.query(
        'UPDATE teachers SET name=?, role_title=?, bio=?, avatar_url=? WHERE id=?', 
        [data.name, data.role_title || '', data.bio || '', data.avatar_url || '', data.id]
      );
    } else {
      await pool.query(
        'INSERT INTO teachers (name, role_title, bio, avatar_url) VALUES (?, ?, ?, ?)', 
        [data.name, data.role_title || '', data.bio || '', data.avatar_url || '']
      );
    }
    return NextResponse.json({ success: true });
  } catch(e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  const cookieStore = await cookies();
  const token = cookieStore.get('token');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const user = jwt.verify(token.value, JWT_SECRET);
    if (user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const { id } = await req.json();
    await pool.query('DELETE FROM teachers WHERE id=?', [id]);
    return NextResponse.json({ success: true });
  } catch(e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
