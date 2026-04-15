import pool from '@/lib/db';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'supersecret_smart_edu_key_999';

export async function POST(req) {
    const cookieStore = await cookies();
    const token = cookieStore.get('token');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    let user;
    try { 
        user = jwt.verify(token.value, JWT_SECRET); 
    } catch(e) { 
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); 
    }

    try {
        const body = await req.json();
        const { activityId } = body;
        
        if (!activityId) return NextResponse.json({ error: 'Missing activityId' }, { status: 400 });

        await pool.query('INSERT IGNORE INTO student_progress (student_id, activity_id) VALUES (?, ?)', [user.userId, activityId]);
        
        return NextResponse.json({ success: true });
    } catch (e) {
        console.error('Completion API Error:', e.message);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
