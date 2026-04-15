import pool from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  const [rows] = await pool.query("SELECT * FROM course_activities WHERE title LIKE '%Tham khảo Bài 1%' OR url LIKE '%ex%' OR url LIKE '%Ex%'");
  return NextResponse.json({ activities: rows });
}
