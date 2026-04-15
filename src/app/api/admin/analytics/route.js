import pool from '@/lib/db';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'supersecret_smart_edu_key_999';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const cookieStore = await cookies();
  const token = cookieStore.get('token');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const user = jwt.verify(token.value, JWT_SECRET);
    if (user.role !== 'admin' && user.role !== 'teacher') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let courseFilter = "1=1";
    let studioFilter = "1=1";
    const courseArgs = [];
    const studioArgs = [];

    if (user.role === 'teacher') {
       courseFilter = "c.owner_id = ? OR c.id IN (SELECT course_id FROM course_collaborators WHERE user_id = ?)";
       studioFilter = "p.teacher_id = ?";
       courseArgs.push(user.userId);
       courseArgs.push(user.userId);
       studioArgs.push(user.userId);
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
      LIMIT 20
    `, courseArgs);

    // 3. Trend Scores (UNIFIED: Quizzes + Studio)
    const [trendRows] = await pool.query(`
      SELECT date, AVG(normalized_score) as avg_score FROM (
        SELECT DATE(qr.submitted_at) as date, 
               CASE WHEN qr.score > 100 THEN qr.score/100 WHEN qr.score > 10 THEN qr.score/10 ELSE qr.score END as normalized_score
        FROM quiz_results qr
        JOIN quizzes q ON qr.quiz_id = q.id
        JOIN course_activities ca ON q.activity_id = ca.id
        JOIN course_modules cm ON ca.module_id = cm.id
        JOIN courses c ON cm.course_id = c.id
        WHERE ${courseFilter}
        
        UNION ALL
        
        SELECT DATE(s.created_at) as date, 
               CASE WHEN s.score > 100 THEN s.score/100 WHEN s.score > 10 THEN s.score/10 ELSE s.score END as normalized_score
        FROM game_scores s
        JOIN imath_studio_projects p ON s.project_id = p.id
        WHERE ${studioFilter}
      ) combined_trends
      GROUP BY date
      ORDER BY date ASC
      LIMIT 14
    `, [...courseArgs, ...studioArgs]);

    // 4. Parse details_json for Mistakes Analytics (Right/Wrong by Tag)
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
          Object.values(details).forEach(q => {
             const tag = q.tag || 'Khác';
             if (!tagStats[tag]) tagStats[tag] = { total: 0, correct: 0 };
             tagStats[tag].total++;
             if (q.isCorrect) tagStats[tag].correct++;
          });
       } catch(e) {}
    }

    const getAdvice = (tag, percent) => {
       if (percent >= 80) return "Học sinh đang nắm rất tốt phần này. Có thể thử thách các dạng toán nâng cao hơn.";
       if (percent >= 50) return `Học sinh có kiến thức cơ bản về ${tag} nhưng còn mắc lỗi logic. Cần luyện tập thêm các bài toán vận dụng.`;
       return `⚠️ Cảnh báo: Đây là mảng kiến thức hổng lớn. Giáo viên nên dành thời gian ôn tập lại lý thuyết căn bản cho phần ${tag}.`;
    };

    const mistakesAnalytics = Object.keys(tagStats).map(tag => {
       const percent = Math.round((tagStats[tag].correct / tagStats[tag].total) * 100);
       return {
          tag,
          correctPercent: percent,
          totalAttempts: tagStats[tag].total,
          category: percent < 50 ? 'Yếu' : percent < 70 ? 'Trung bình' : percent < 90 ? 'Khá' : 'Tốt',
          advice: getAdvice(tag, percent)
       };
    }).sort((a, b) => a.correctPercent - b.correctPercent);

    // 5. Global Average Score (Quizzes + Studio Games)
    const [avgRows] = await pool.query(`
      SELECT AVG(normalized_score) as global_avg FROM (
        SELECT CASE WHEN score > 100 THEN score/100 WHEN score > 10 THEN score/10 ELSE score END as normalized_score FROM quiz_results
        UNION ALL
        SELECT CASE WHEN score > 100 THEN score/100 WHEN score > 10 THEN score/10 ELSE score END as normalized_score FROM game_scores
      ) combined_scores
    `);
    const globalAverageScore = parseFloat(avgRows[0]?.global_avg || 0).toFixed(1);

    // 6. Participation Rate (Quizzes + Studio Games)
    const [totalStudentsRows] = await pool.query('SELECT COUNT(*) as cnt FROM users WHERE role = "student"');
    const [activeStudentsRows] = await pool.query(`
      SELECT COUNT(DISTINCT student_id) as cnt FROM (
        SELECT student_id FROM quiz_results
        UNION
        SELECT student_id FROM game_scores
      ) combined_active
    `);
    const totalStudentsCount = totalStudentsRows[0]?.cnt || 1;
    const activeStudentsCount = activeStudentsRows[0]?.cnt || 0;
    const participationRate = Math.round((activeStudentsCount / totalStudentsCount) * 100);

    // 7. Top Students (UNIFIED: Quizzes + Studio)
    const [topStudents] = await pool.query(`
      SELECT id, full_name, avatar_url, AVG(normalized_score) as avg_score, COUNT(normalized_score) as total_tests FROM (
        SELECT u.id, u.full_name, u.avatar_url, 
               CASE WHEN qr.score > 100 THEN qr.score/100 WHEN qr.score > 10 THEN qr.score/10 ELSE qr.score END as normalized_score
        FROM quiz_results qr
        JOIN users u ON qr.student_id = u.id
        UNION ALL
        SELECT u.id, u.full_name, u.avatar_url, 
               CASE WHEN s.score > 100 THEN s.score/100 WHEN s.score > 10 THEN s.score/10 ELSE s.score END as normalized_score
        FROM game_scores s
        JOIN users u ON s.student_id = u.id
      ) combined_students
      GROUP BY id, full_name, avatar_url
      HAVING total_tests >= 1
      ORDER BY avg_score DESC
      LIMIT 5
    `);

    // 8. Score Distribution (Phổ điểm)
    const [distRows] = await pool.query(`
      SELECT bucket, COUNT(*) as count FROM (
        SELECT ROUND(CASE WHEN score > 100 THEN score/100 WHEN score > 10 THEN score/10 ELSE score END) as bucket FROM quiz_results
        UNION ALL
        SELECT ROUND(CASE WHEN score > 100 THEN score/100 WHEN score > 10 THEN score/10 ELSE score END) as bucket FROM game_scores
      ) all_dist
      WHERE bucket BETWEEN 1 AND 10
      GROUP BY bucket
      ORDER BY bucket
    `);

    const scoreDistribution = Array.from({ length: 10 }, (_, i) => ({
      score: i + 1,
      count: distRows.find(r => parseInt(r.bucket) === (i + 1))?.count || 0
    }));

    return NextResponse.json({
      success: true,
      trendScores: trendRows,
      mistakesAnalytics,
      globalAverageScore,
      participationRate,
      topStudents,
      scoreDistribution
    });

  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
