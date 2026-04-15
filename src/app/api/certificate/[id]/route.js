import pool from '@/lib/db';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'supersecret_smart_edu_key_999';

export async function GET(req, { params }) {
    const { id } = await params;
    
    const cookieStore = await cookies();
    const token = cookieStore.get('token');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    let userToken;
    try { 
        userToken = jwt.verify(token.value, JWT_SECRET); 
    } catch(e) { 
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); 
    }

    // 1. Fetch Full User Info (mostly for full name)
    const [users] = await pool.query('SELECT id, full_name, email FROM users WHERE id = ?', [userToken.userId]);
    if (!users.length) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    const user = users[0];

    // 2. Fetch Course Info
    const [courses] = await pool.query('SELECT title FROM courses WHERE id = ?', [id]);
    if (!courses.length) return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    const course = courses[0];

    // 3. Verify Progress is 100% (Security Check)
    // To do this, check all activities in the course and check student_progress.
    const [courseActivities] = await pool.query(`
       SELECT a.id FROM course_activities a 
       JOIN course_modules m ON a.module_id = m.id 
       WHERE m.course_id = ?
    `, [id]);
    
    if (courseActivities.length > 0) {
        const [progressRows] = await pool.query(`
            SELECT p.activity_id FROM student_progress p
            JOIN course_activities a ON p.activity_id = a.id
            JOIN course_modules m ON a.module_id = m.id
            WHERE p.student_id = ? AND m.course_id = ?
        `, [user.id, id]);
        
        const completedIds = progressRows.map(r => r.activity_id);
        const totalActivities = courseActivities.length;
        const completedCount = courseActivities.filter(a => completedIds.includes(a.id)).length;
        
        if (completedCount < totalActivities) {
            // Not 100% completed
            return NextResponse.json({ error: 'You have not completed this course yet' }, { status: 403 });
        }
    }

    return NextResponse.json({ success: true, course, user });
}
