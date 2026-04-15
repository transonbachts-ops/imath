import pool from '@/lib/db';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'supersecret_smart_edu_key_999';

export async function GET(req) {
  const cookieStore = await cookies();
  const token = cookieStore.get('token');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const user = jwt.verify(token.value, JWT_SECRET);
    if (user.role !== 'admin' && user.role !== 'teacher') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let studyFilter = "1=1";
    let courseFilter = "1=1";
    const studyArgs = [];
    const courseArgs = [];

    // Filter to only count students who have accounts (this is implicit, but we only join valid users anyway).
    if (user.role === 'teacher') {
       // Teachers only see their courses
       courseFilter = "c.owner_id = ?";
       courseArgs.push(user.userId);
       // Time filtering for a teacher is complex (only time spent on their courses), 
       // but our table user_study_time is global. For this MVP, we will show global time for admins, 
       // but for teachers, we'll still show global time or zero. We'll show global time for now.
    }

    // 1. Total Study Time (Global metric)
    const [timeRows] = await pool.query(`SELECT SUM(minutes) as total_mins FROM user_study_time`);
    const totalStudyTime = timeRows[0]?.total_mins || 0;

    // 2. Hot Activities
    const [hotActivities] = await pool.query(`
      SELECT a.title, COUNT(p.id) as views, c.title as course_name
      FROM student_progress p
      JOIN course_activities a ON p.activity_id = a.id
      JOIN course_modules m ON a.module_id = m.id
      JOIN courses c ON m.course_id = c.id
      WHERE ${courseFilter}
      GROUP BY a.id, c.title
      ORDER BY views DESC
      LIMIT 5
    `, courseArgs);

    // 3. Trend Scores (Last 7 days average score)
    const [trendRows] = await pool.query(`
      SELECT DATE(qr.submitted_at) as date, AVG(qr.score) as avg_score
      FROM quiz_results qr
      JOIN quizzes q ON qr.quiz_id = q.id
      JOIN course_activities a ON q.activity_id = a.id
      JOIN course_modules m ON a.module_id = m.id
      JOIN courses c ON m.course_id = c.id
      WHERE ${courseFilter}
      GROUP BY DATE(qr.submitted_at)
      ORDER BY DATE(qr.submitted_at) ASC
      LIMIT 14
    `, courseArgs);

    // 4. Parse details_json for Mistakes Analytics (Right/Wrong by Tag)
    // We select all details_json for this teacher's courses
    const [results] = await pool.query(`
      SELECT qr.details_json 
      FROM quiz_results qr
      JOIN quizzes q ON qr.quiz_id = q.id
      JOIN course_activities a ON q.activity_id = a.id
      JOIN course_modules m ON a.module_id = m.id
      JOIN courses c ON m.course_id = c.id
      WHERE ${courseFilter} AND qr.details_json IS NOT NULL
    `, courseArgs);

    let tagStats = {};
    for (const r of results) {
       try {
          const details = JSON.parse(r.details_json);
          // details represents { qId: { isCorrect: true, tag: 'Đại số' } }
          Object.values(details).forEach(q => {
             const tag = q.tag || 'Khác';
             if (!tagStats[tag]) tagStats[tag] = { total: 0, correct: 0 };
             tagStats[tag].total++;
             if (q.isCorrect) tagStats[tag].correct++;
          });
       } catch(e) {}
    }

    const mistakesAnalytics = Object.keys(tagStats).map(tag => ({
       tag,
       correctPercent: Math.round((tagStats[tag].correct / tagStats[tag].total) * 100),
       totalAttempts: tagStats[tag].total
    })).sort((a, b) => a.correctPercent - b.correctPercent);

    return NextResponse.json({
      success: true,
      totalStudyTime,
      hotActivities,
      trendScores: trendRows,
      mistakesAnalytics
    });

  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
