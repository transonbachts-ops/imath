import pool from '@/lib/db';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'supersecret_smart_edu_key_999';

async function getParentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token');
  if (!token) return null;
  try {
    const user = jwt.verify(token.value, JWT_SECRET);
    if (user.role !== 'parent') return null;
    return user;
  } catch(e) { return null; }
}

export async function GET() {
  const parent = await getParentUser();
     if (!parent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
    try {
      const parentId = parent.userId || parent.id;
      console.log('--- Parent Dashboard Debug ---');
      console.log('Parent object from JWT:', JSON.stringify(parent));
      console.log('Derived parentId:', parentId);
  
      // 1. Get linked student
      const [links] = await pool.query(
        `SELECT u.id, u.full_name, u.email, u.avatar_url, u.invite_code
         FROM parent_student_links psl 
         JOIN users u ON psl.student_id = u.id 
         WHERE psl.parent_id = ?`,
        [parentId]
      );
      console.log('Linked student count:', links.length);
      
      if (!links.length) {
        console.log('No linked student found for parentId:', parentId);
      return NextResponse.json({
        student: null,
        courses: [],
        quizScores: [],
        alerts: [],
        unreadMessages: 0
      });
    }
    const student = links[0];

    let courses = [], quizScores = [], alerts = [];
    
    // 2. Get enrollments for this student
    try {
      let [enrollments] = await pool.query(
        `SELECT e.course_id, c.title as course_title, c.image_url, c.teacher_id,
                t.name as teacher_name, t.avatar_url as teacher_avatar, u.id as teacher_user_id
         FROM enrollments e
         JOIN courses c ON e.course_id = c.id
         LEFT JOIN teachers t ON c.teacher_id = t.id
         LEFT JOIN users u ON (u.role = 'teacher' AND c.owner_id = u.id)
         WHERE e.user_id = ? AND e.status = 'approved'`,
        [student.id]
      );

      // Fallback receiver ID so parent chat always works
      const [admins] = await pool.query('SELECT id FROM users WHERE role = "admin" ORDER BY id LIMIT 1');
      const adminId = admins[0]?.id || null;
      enrollments = enrollments.map(enr => ({
        ...enr,
        teacher_user_id: enr.teacher_user_id || adminId
      }));

      // 3. For each course, get progress %
      courses = await Promise.all(enrollments.map(async (enr) => {
        const [totalActs] = await pool.query(
          `SELECT COUNT(*) as total FROM course_activities a
           JOIN course_modules m ON a.module_id = m.id
           WHERE m.course_id = ?`,
          [enr.course_id]
        );
        const [doneActs] = await pool.query(
          `SELECT COUNT(*) as done FROM student_progress sp
           JOIN course_activities a ON sp.activity_id = a.id
           JOIN course_modules m ON a.module_id = m.id
           WHERE sp.student_id = ? AND m.course_id = ?`,
          [student.id, enr.course_id]
        );
        const total = totalActs[0]?.total || 0;
        const done = doneActs[0]?.done || 0;
        const pct = total > 0 ? Math.round((done / total) * 100) : 0;

        return {
          ...enr,
          total_activities: total,
          done_activities: done,
          progress_pct: pct
        };
      }));
    } catch(e) {
      console.error('Error fetching enrollments/progress:', e);
    }

    // 4. Get recent quiz scores (last 10 + daily)
    try {
      const [scores] = await pool.query(
        `SELECT qr.score, qr.submitted_at, ca.title as quiz_name, c.title as course_name, qr.details_json, 'official' as type
         FROM quiz_results qr
         JOIN quizzes q ON qr.quiz_id = q.id
         JOIN course_activities ca ON q.activity_id = ca.id
         JOIN course_modules cm ON ca.module_id = cm.id
         JOIN courses c ON cm.course_id = c.id
         WHERE qr.student_id = ?
         ORDER BY qr.submitted_at DESC LIMIT 10`,
        [student.id]
      );
      
      for (const score of scores) {
         if (score.details_json) {
            try {
               let details = JSON.parse(score.details_json);
               const qIds = Object.keys(details);
               if (qIds.length > 0) {
                 const [questions] = await pool.query('SELECT id, question_text, options_json FROM quiz_questions WHERE id IN (?)', [qIds]);
                 questions.forEach(q => {
                   if (details[q.id]) {
                     details[q.id].question_text = q.question_text;
                     details[q.id].options_json = q.options_json;
                   }
                 });
                 score.details_json = JSON.stringify(details);
               }
            } catch(e) {}
         }
      }
      
      const [dailyScores] = await pool.query(
         `SELECT score, submitted_at, CONCAT('Bài tập hằng ngày - Lớp ', grade) as quiz_name, 'Kiểm tra mỗi ngày' as course_name, details_json, 'daily' as type
          FROM daily_quiz_results 
          WHERE student_id = ?
          ORDER BY submitted_at DESC LIMIT 10`,
         [student.id]
      );

      for (const score of dailyScores) {
         if (score.details_json) {
            try {
               let details = JSON.parse(score.details_json);
               const qIds = Object.keys(details);
               if (qIds.length > 0) {
                 const [questions] = await pool.query('SELECT id, question_text, options_json FROM question_bank WHERE id IN (?)', [qIds]);
                 questions.forEach(q => {
                   if (details[q.id]) {
                     details[q.id].question_text = q.question_text;
                     details[q.id].options_json = q.options_json;
                   }
                 });
                 score.details_json = JSON.stringify(details);
               }
            } catch(e) {}
         }
      }

      quizScores = [...scores, ...dailyScores].sort((a,b) => new Date(b.submitted_at) - new Date(a.submitted_at)).slice(0, 15);
    } catch(e) {
      console.error('Error fetching quiz scores:', e);
    }

    // 5. Generate alerts
    try {
      for (const score of quizScores) {
        if (score.score < 50) {
          alerts.push({
            type: 'low_score',
            icon: '⚠️',
            severity: 'warning',
            message: `${student.full_name} đạt ${score.score}% trong bài "${score.quiz_name}" - Cần ôn tập thêm.`,
            course: score.course_name,
            time: score.submitted_at
          });
        }
      }
      // Alert: progress < 30% after enrolling
      for (const cp of courses) {
        if (cp.total_activities > 0 && cp.progress_pct < 30) {
          alerts.push({
            type: 'low_progress',
            icon: '📚',
            severity: 'info',
            message: `${student.full_name} mới hoàn thành ${cp.progress_pct}% nội dung khóa "${cp.course_title}".`,
            course: cp.course_title,
            time: null
          });
        }
      }
    } catch(e) {
      console.error('Error generating alerts:', e);
    }

    // 6. Get unread messages count
    const [unread] = await pool.query(
      'SELECT COUNT(*) as cnt FROM parent_messages WHERE receiver_id = ? AND is_read = FALSE',
      [parent.userId || parent.id]
    );

    return NextResponse.json({
      student,
      courses,
      quizScores,
      alerts,
      unreadMessages: unread[0]?.cnt || 0
    });
  } catch(e) {
    console.error(e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
