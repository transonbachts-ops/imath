import pool from '@/lib/db';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'supersecret_smart_edu_key_999';

export async function GET(req) {
  const url = new URL(req.url);
  const grade = url.searchParams.get('grade');
  
  if (!grade) return NextResponse.json({ error: 'Thiếu thông tin Khối lớp' }, { status: 400 });

  // Add timezone Vietnam (GMT+7)
  const vnTime = new Date(new Date().getTime() + 7 * 60 * 60 * 1000);
  const dtStr = vnTime.toISOString().split('T')[0].replace(/-/g, ''); // "20260403"
  const seed = parseInt(dtStr);
  const seedDate = vnTime.toISOString().split('T')[0];

  try {
    const [questions] = await pool.query('SELECT * FROM question_bank WHERE grade = ? ORDER BY RAND(?) LIMIT 10', [grade, seed]);
    
    // Auth Check to see if they already completed today (Optional but good)
    const cookieStore = await cookies();
    const token = cookieStore.get('token');
    let myResult = null;
    
    if (token) {
      try {
        const user = jwt.verify(token.value, JWT_SECRET);
        const [res] = await pool.query('SELECT * FROM daily_quiz_results WHERE student_id = ? AND date_seed = ?', [user.userId, seedDate]);
        if (res.length > 0) myResult = res[0];
      } catch(e) {}
    }

    const safeQuestions = questions.map(q => ({
       id: q.id,
       question_text: q.question_text,
       options_json: q.options_json,
       tags: q.tags,
       hint: q.hint,
       image_url: q.image_url,
       video_url: q.video_url
    }));

    return NextResponse.json({ questions: safeQuestions, myResult });
  } catch(e) {
     return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req) {
  const cookieStore = await cookies();
  const token = cookieStore.get('token');
  if (!token) return NextResponse.json({ error: 'Vui lòng đăng nhập' }, { status: 401 });
  
  let user;
  try { user = jwt.verify(token.value, JWT_SECRET); } catch(e) { return NextResponse.json({ error: 'Phiên bản lỗi' }, { status: 401 }); }

  const body = await req.json();
  const { grade, answers } = body;

  const vnTime = new Date(new Date().getTime() + 7 * 60 * 60 * 1000);
  const dtStr = vnTime.toISOString().split('T')[0].replace(/-/g, ''); 
  const seed = parseInt(dtStr);
  const seedDate = vnTime.toISOString().split('T')[0];

  try {
    // Check duplication
    const [existing] = await pool.query('SELECT id FROM daily_quiz_results WHERE student_id=? AND date_seed=?', [user.userId, seedDate]);
    if (existing.length) return NextResponse.json({ error: 'Bạn đã hoàn thành thử thách hôm nay rồi!' }, { status: 400 });

    const [questions] = await pool.query('SELECT id, correct_answer, tags FROM question_bank WHERE grade = ? ORDER BY RAND(?) LIMIT 10', [grade, seed]);
    
    let correctCount = 0;
    const details = {};
    
    questions.forEach(q => {
       const studentAns = answers[String(q.id)];
       const isCorrect = studentAns && studentAns.toUpperCase() === q.correct_answer.toUpperCase();
       if (isCorrect) correctCount++;
       details[q.id] = {
         isCorrect: !!isCorrect,
         correctAnswer: q.correct_answer,
         studentAnswer: studentAns || 'N/A',
         tag: q.tags || 'Khác'
       };
    });

    const score = questions.length > 0 ? parseFloat((correctCount / questions.length * 10).toFixed(1)) : 0;

    // Save Daily Score
    await pool.query(
      'INSERT INTO daily_quiz_results (student_id, grade, score, details_json, date_seed) VALUES (?, ?, ?, ?, ?)', 
      [user.userId, grade, score, JSON.stringify(details), seedDate]
    );

    // --- STREAK LOGIC ---
    // Fetch last_quiz_date
    const [uRows] = await pool.query('SELECT current_streak, longest_streak, last_quiz_date FROM users WHERE id=?', [user.userId]);
    const u = uRows[0];
    
    let current_streak = u.current_streak || 0;
    let longest_streak = u.longest_streak || 0;
    let last_date = u.last_quiz_date ? new Date(u.last_quiz_date).toISOString().split('T')[0] : null;

    if (last_date !== seedDate) {
       // Is previous day?
       const yesterday = new Date(vnTime.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
       if (last_date === yesterday) {
          current_streak += 1;
       } else {
          current_streak = 1; // reset or start
       }
       if (current_streak > longest_streak) longest_streak = current_streak;
       
       await pool.query('UPDATE users SET current_streak=?, longest_streak=?, last_quiz_date=? WHERE id=?', [current_streak, longest_streak, seedDate, user.userId]);
    }

    return NextResponse.json({ success: true, score, correct: correctCount, total: questions.length, details, current_streak });

  } catch(e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
