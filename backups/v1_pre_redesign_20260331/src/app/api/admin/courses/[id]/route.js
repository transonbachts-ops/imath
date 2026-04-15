import pool from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(req, { params }) {
  const { id } = await params;
  try {
    const [courses] = await pool.query('SELECT * FROM courses WHERE id=?', [id]);
    if (courses.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ course: courses[0] });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
