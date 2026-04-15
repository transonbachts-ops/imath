import pool from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(req, { params }) {
  const resolvedParams = await params;
  const { activityId } = resolvedParams;

  try {
    const [rows] = await pool.query('SELECT * FROM course_activities WHERE id = ?', [activityId]);
    if (rows.length === 0) return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
    
    return NextResponse.json({ success: true, activity: rows[0] });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
