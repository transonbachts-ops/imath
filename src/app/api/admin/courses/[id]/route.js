import pool from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(req, { params }) {
  const { id } = await params;
  try {
    const [courses] = await pool.query('SELECT * FROM courses WHERE id=?', [id]);
    if (courses.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const course = courses[0];

    // Fetch modules
    const [modules] = await pool.query('SELECT * FROM course_modules WHERE course_id = ? ORDER BY order_index ASC', [id]);
    
    // Fetch all activities for these modules
    const [activities] = await pool.query(`
      SELECT a.* FROM course_activities a 
      JOIN course_modules m ON a.module_id = m.id 
      WHERE m.course_id = ? 
      ORDER BY a.order_index ASC
    `, [id]);

    return NextResponse.json({ course, modules, activities });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
