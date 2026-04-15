import pool from '@/lib/db';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'supersecret_smart_edu_key_999';

export async function GET(req, { params }) {
  const { activityId } = await params;
  
  const cookieStore = await cookies();
  const token = cookieStore.get('token');
  let user = null;
  if (token) {
     try { user = jwt.verify(token.value, JWT_SECRET); } catch(e){}
  }

  const [quizzes] = await pool.query('SELECT * FROM quizzes WHERE activity_id=?', [activityId]);
  let quiz = quizzes[0];
  
  if (!quiz) return NextResponse.json({ quiz: null, questions: [], results: [] });

  const [questions] = await pool.query('SELECT * FROM quiz_questions WHERE quiz_id=?', [quiz.id]);
  
  let canEdit = false;
  if (user && (user.role === 'admin' || user.role === 'teacher')) {
     if (user.role === 'admin') canEdit = true;
     else {
        const [cors] = await pool.query('SELECT c.owner_id FROM courses c JOIN course_modules m ON c.id = m.course_id JOIN course_activities a ON m.id = a.module_id WHERE a.id = ?', [activityId]);
        if (cors.length && cors[0].owner_id === user.userId) canEdit = true;
     }
  }

  if (!canEdit) {
     const safeQuestions = questions.map(q => ({
        id: q.id,
        question_text: q.question_text,
        options_json: q.options_json,
        tags: q.tags,
        hint: q.hint,
        image_url: q.image_url || null,
        video_url: q.video_url || null
     }));
     // Fetch the highest score result for student to display initially if needed
     const [myResult] = await pool.query('SELECT * FROM quiz_results WHERE quiz_id=? AND student_id=? ORDER BY score DESC, submitted_at DESC LIMIT 1', [quiz.id, user?.userId || 0]);
     return NextResponse.json({ quiz, questions: safeQuestions, myResult: myResult[0] || null, results: [], canEdit: false });
  }

  // Admin/Owner: return all results with correct answers
  const [results] = await pool.query(`
    SELECT r.*, u.full_name as student_name, u.email as student_email 
    FROM quiz_results r JOIN users u ON r.student_id = u.id 
    WHERE r.quiz_id = ? ORDER BY r.score DESC
  `, [quiz.id]);

  return NextResponse.json({ quiz, questions, results: results || [], canEdit: true });
}

export async function POST(req, { params }) {
   const { activityId } = await params;
   
   try { await pool.query('ALTER TABLE quiz_questions ADD COLUMN tags VARCHAR(255) DEFAULT ""'); } catch(e){}
   try { await pool.query('ALTER TABLE quiz_questions ADD COLUMN hint TEXT DEFAULT ""'); } catch(e){}
   try { await pool.query('ALTER TABLE quiz_questions ADD COLUMN image_url VARCHAR(500) DEFAULT NULL'); } catch(e){}
   try { await pool.query('ALTER TABLE quiz_questions ADD COLUMN video_url VARCHAR(500) DEFAULT NULL'); } catch(e){}
   try { await pool.query('ALTER TABLE quiz_results ADD COLUMN details_json TEXT'); } catch(e){}
   
   const cookieStore = await cookies();
   const token = cookieStore.get('token');
   if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
   let user;
   try { user = jwt.verify(token.value, JWT_SECRET); } catch(e) { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

   let body;
   try { body = await req.json(); } catch(e) { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

   // -- TEACHER/ADMIN SAVING QUIZ --
   if (body.action === 'save_quiz') {
      let canEdit = false;
      if (user.role === 'admin') canEdit = true;
      else if (user.role === 'teacher') {
         const [cors] = await pool.query('SELECT c.owner_id FROM courses c JOIN course_modules m ON c.id = m.course_id JOIN course_activities a ON m.id = a.module_id WHERE a.id = ?', [activityId]);
         if (cors.length && cors[0].owner_id === user.userId) canEdit = true;
      }
      if (!canEdit) return NextResponse.json({ error: 'Bạn không có quyền thay đổi bài kiểm tra này!' }, { status: 403 });

      const { time_limit, questions } = body;
      
      if (!questions || !Array.isArray(questions)) {
        return NextResponse.json({ error: 'Câu hỏi không hợp lệ' }, { status: 400 });
      }

      let quizId;
      const [existing] = await pool.query('SELECT id FROM quizzes WHERE activity_id=?', [activityId]);
      if (existing.length) {
         quizId = existing[0].id;
         await pool.query('UPDATE quizzes SET time_limit=? WHERE id=?', [time_limit || 15, quizId]);
      } else {
         // Insert with all required columns
         const [res] = await pool.query(
           'INSERT INTO quizzes (activity_id, time_limit, course_id, question, option_a, option_b, option_c, correct_option) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
           [activityId, time_limit || 15, null, '', '', '', '', 'a']
         );
         quizId = res.insertId;
      }

      // Delete old questions
      await pool.query('DELETE FROM quiz_questions WHERE quiz_id=?', [quizId]);

      // Insert new questions
      let inserted = 0;
      for (const q of questions) {
         if (!q.question_text || !q.question_text.trim()) continue;
         const options = q.options || { A: '', B: '', C: '', D: '' };
         await pool.query(
           'INSERT INTO quiz_questions (quiz_id, question_text, options_json, correct_answer, tags, hint, image_url, video_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
           [quizId, q.question_text, JSON.stringify(options), q.correct_answer || 'A', q.tags || '', q.hint || '', q.image_url || null, q.video_url || null]
         );
         inserted++;
      }

      return NextResponse.json({ success: true, quizId, inserted });
   }

   // -- STUDENT SUBMITTING QUIZ --
   if (body.action === 'submit_quiz') {
      const { answers } = body;
      
      if (!answers || typeof answers !== 'object') {
        return NextResponse.json({ error: 'Không có câu trả lời' }, { status: 400 });
      }

      const [quizzes] = await pool.query('SELECT id FROM quizzes WHERE activity_id=?', [activityId]);
      if (!quizzes.length) return NextResponse.json({ error: 'Không tìm thấy đề thi' }, { status: 404 });
      const quizId = quizzes[0].id;

      const [questions] = await pool.query('SELECT id, correct_answer, tags FROM quiz_questions WHERE quiz_id=?', [quizId]);
      
      if (questions.length === 0) {
        return NextResponse.json({ error: 'Đề thi chưa có câu hỏi' }, { status: 400 });
      }
      
      let correctCount = 0;
      const details = {}; // Stores which questions were right/wrong with their tag
      
      questions.forEach(q => {
         const studentAns = answers[String(q.id)];
         const isCorrect = studentAns && studentAns.toUpperCase() === q.correct_answer.toUpperCase();
         if (isCorrect) correctCount++;
         details[q.id] = {
           isCorrect: !!isCorrect,
           correctAnswer: q.correct_answer,
           studentAnswer: studentAns || 'N/A',
           tag: q.tags || 'Khác' // fallback tag
         };
      });

      const score = parseFloat((correctCount / questions.length * 10).toFixed(1));

      try {
        // We REMOVED the DELETE clause to support multiple attempts!
        await pool.query('INSERT INTO quiz_results (quiz_id, student_id, score, details_json) VALUES (?, ?, ?, ?)', 
           [quizId, user.userId, score, JSON.stringify(details)]);
      } catch(e) {
        console.error('quiz_results error:', e.message);
        return NextResponse.json({ error: 'Lỗi lưu điểm: ' + e.message }, { status: 500 });
      }
      
      try {
        await pool.query('INSERT IGNORE INTO student_progress (student_id, activity_id) VALUES (?, ?)', [user.userId, activityId]);
      } catch(e) {}

      return NextResponse.json({ success: true, score, correct: correctCount, total: questions.length, details });
   }

   return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
