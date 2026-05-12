import pool from '@/lib/db';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const UNIVERSAL_API_KEY = 'sk-9f370baa1366bfe3f73951334c3ecdcada536381c5dbccb1079eb0d8ea14e44d';
const JWT_SECRET = 'supersecret_smart_edu_key_999';

export async function POST(req) {
  const cookieStore = await cookies();
  const token = cookieStore.get('token');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const user = jwt.verify(token.value, JWT_SECRET);
    if (user.role !== 'admin' && user.role !== 'teacher') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { message, analyticsSnapshot, history = [], bot = 'gemini' } = await req.json();

    // ============================================================
    // DEEP DATA FETCH: Lấy dữ liệu phong phú từ Database
    // ============================================================
    let courseFilter = '1=1';
    const args = [];
    if (user.role === 'teacher') {
      courseFilter = 'c.owner_id = ? OR c.id IN (SELECT course_id FROM course_collaborators WHERE user_id = ?)';
      args.push(user.userId, user.userId);
    }

    // 1. Danh sách học sinh + điểm trung bình
    const [students] = await pool.query(`
      SELECT u.id, u.full_name, u.email,
        ROUND(AVG(CASE WHEN qr.score > 100 THEN qr.score/100 WHEN qr.score > 10 THEN qr.score/10 ELSE qr.score END), 1) as avg_quiz_score,
        COUNT(DISTINCT qr.quiz_id) as quizzes_taken
      FROM users u
      LEFT JOIN quiz_results qr ON qr.student_id = u.id
      WHERE u.role = 'student'
      GROUP BY u.id, u.full_name, u.email
      ORDER BY avg_quiz_score DESC
    `);

    // 2. Danh sách khóa học + số lượng học viên
    const [courses] = await pool.query(`
      SELECT c.id, c.title, COUNT(DISTINCT e.user_id) as enrolled_count,
        COUNT(DISTINCT cm.id) as module_count,
        COUNT(DISTINCT ca.id) as activity_count
      FROM courses c
      LEFT JOIN enrollments e ON e.course_id = c.id
      LEFT JOIN course_modules cm ON cm.course_id = c.id
      LEFT JOIN course_activities ca ON ca.module_id = cm.id
      WHERE ${courseFilter}
      GROUP BY c.id, c.title
    `, args);

    // 3. Tiến độ từng học sinh (số bài đã hoàn thành per course)
    const [progressData] = await pool.query(`
      SELECT u.full_name, c.title as course_title,
        COUNT(DISTINCT sp.activity_id) as completed_activities,
        (SELECT COUNT(*) FROM course_activities ca JOIN course_modules cm2 ON ca.module_id = cm2.id WHERE cm2.course_id = c.id) as total_activities
      FROM student_progress sp
      JOIN users u ON sp.student_id = u.id
      JOIN course_activities ca ON sp.activity_id = ca.id
      JOIN course_modules cm ON ca.module_id = cm.id
      JOIN courses c ON cm.course_id = c.id
      WHERE ${courseFilter}
      GROUP BY u.id, c.id
      ORDER BY u.full_name
    `, args);

    // 4. Điểm thi từng học sinh / từng bài quiz
    const [quizScores] = await pool.query(`
      SELECT u.full_name, ca.title as quiz_title, c.title as course_title,
        ROUND(CASE WHEN qr.score > 100 THEN qr.score/100 WHEN qr.score > 10 THEN qr.score/10 ELSE qr.score END, 1) as score,
        DATE(qr.submitted_at) as date
      FROM quiz_results qr
      JOIN users u ON qr.student_id = u.id
      JOIN quizzes q ON qr.quiz_id = q.id
      JOIN course_activities ca ON q.activity_id = ca.id
      JOIN course_modules cm ON ca.module_id = cm.id
      JOIN courses c ON cm.course_id = c.id
      WHERE ${courseFilter}
      ORDER BY qr.submitted_at DESC
      LIMIT 100
    `, args);

    // ============================================================
    // BUILD SYSTEM PROMPT với dữ liệu phong phú
    // ============================================================
    const systemPrompt = `Bạn là Chuyên gia Tư vấn Giáo dục H2bmath (AI Consultant).
Nhiệm vụ: Phân tích dữ liệu học tập và tư vấn sư phạm cho Giáo viên/Quản trị viên.
Phản hồi bằng Tiếng Việt, trình bày rõ ràng, có đầu mục khi cần.

============================
📊 DỮ LIỆU HỆ THỐNG iMATH
============================

🔹 TỔNG QUAN:
- Điểm trung bình toàn hệ thống: ${analyticsSnapshot?.globalAverageScore ?? 'N/A'}/10
- Tỉ lệ học sinh tham gia: ${analyticsSnapshot?.participationRate ?? 'N/A'}%
- Tổng số học sinh: ${students.length}
- Tổng số khóa học: ${courses.length}

🔹 DANH SÁCH HỌC SINH & ĐIỂM TRUNG BÌNH:
${students.map(s => `- ${s.full_name} (${s.email}): TB = ${s.avg_quiz_score ?? 'Chưa thi'}/10, đã làm ${s.quizzes_taken} bài thi`).join('\n')}

🔹 DANH SÁCH KHÓA HỌC:
${courses.map(c => `- [ID:${c.id}] "${c.title}": ${c.enrolled_count} học viên đăng ký, ${c.module_count} chương, ${c.activity_count} bài học`).join('\n')}

🔹 TIẾN ĐỘ HỌC TẬP (từng học sinh / từng khóa):
${progressData.length > 0 
  ? progressData.map(p => `- ${p.full_name} | "${p.course_title}": hoàn thành ${p.completed_activities}/${p.total_activities} bài học`).join('\n')
  : '- Chưa có dữ liệu tiến độ'}

🔹 ĐIỂM THI TRẮC NGHIỆM GẦN ĐÂY (tối đa 100 lượt):
${quizScores.length > 0
  ? quizScores.map(q => `- ${q.full_name} | "${q.quiz_title}" (${q.course_title}): ${q.score}/10 vào ${q.date}`).join('\n')
  : '- Chưa có dữ liệu điểm thi'}

🔹 PHÂN TÍCH LỖI SAI THEO CHỦ ĐỀ (Mistakes Analytics):
${JSON.stringify(analyticsSnapshot?.mistakesAnalytics ?? [], null, 2)}

============================
Khi được hỏi, hãy dùng đúng tên học sinh, tên khóa học từ dữ liệu trên để trả lời cụ thể.
Nếu không có dữ liệu đủ, hãy nói rõ.`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    // Helper: Gọi Gemini qua proxy chung
    const callGemini = async (signal) => {
      const msgs = [
        { role: 'system', content: systemPrompt },
        { role: 'assistant', content: 'Đã rõ. Tôi có đầy đủ dữ liệu và sẵn sàng hỗ trợ bạn phân tích chi tiết.' },
        ...history.map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content })),
        { role: 'user', content: message }
      ];
      try {
        const res = await fetch('https://llm.chiasegpu.vn/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${UNIVERSAL_API_KEY}` },
          body: JSON.stringify({ model: 'deepseek-v4-pro', messages: msgs }),
          signal
        });
        const data = await res.json();
        if (res.ok && data.choices?.[0]?.message?.content) return data.choices[0].message.content;
      } catch (e) { if (e.name === 'AbortError') throw e; }
      return null;
    };

    let aiText = '';
    let usedFallback = false;
    try {
      if (bot === 'openai' || bot === 'claude') {
        // Thử proxy trước
        const proxyModel = 'deepseek-v4-pro';
        try {
          const proxyCtrl = new AbortController();
          const proxyTimeout = setTimeout(() => proxyCtrl.abort(), 20000); // 20s cho proxy
          const response = await fetch('https://llm.chiasegpu.vn/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${UNIVERSAL_API_KEY}` },
            body: JSON.stringify({
              model: proxyModel,
              messages: [
                { role: 'system', content: systemPrompt },
                ...history.map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content })),
                { role: 'user', content: message }
              ]
            }),
            signal: proxyCtrl.signal
          });
          clearTimeout(proxyTimeout);
          const data = await response.json();
          // Nếu proxy trả về lỗi hết tiền hoặc lỗi server -> fallback Gemini
          if (response.ok && data.choices?.[0]?.message?.content) {
            aiText = data.choices[0].message.content;
          } else {
            console.warn(`Proxy ${bot} lỗi (${response.status}), chuyển sang Gemini...`);
            usedFallback = true;
          }
        } catch (proxyErr) {
          console.warn(`Proxy ${bot} timeout/crash, chuyển sang Gemini...`);
          usedFallback = true;
        }

        // Fallback: dùng Gemini nếu proxy thất bại
        if (!aiText) {
          aiText = await callGemini(controller.signal) || '';
          usedFallback = true;
        }
      } else {
        // Mặc định: Gemini trực tiếp
        aiText = await callGemini(controller.signal) || '';
      }

      if (!aiText) {
        return NextResponse.json({ error: 'AI đang bận, vui lòng thử lại sau.' }, { status: 500 });
      }

      // Nếu dùng fallback, thêm chú thích nhỏ cuối tin nhắn
      if (usedFallback && (bot === 'openai' || bot === 'claude')) {
        aiText += `\n\n*(Lưu ý: Mô hình ${bot === 'openai' ? 'GPT/Llama' : 'Claude'} tạm thời không khả dụng. Phản hồi được cung cấp bởi DeepSeek.)*`;
      }

      return NextResponse.json({ reply: aiText });

    } catch (err) {
      if (err.name === 'AbortError') return NextResponse.json({ error: 'Quá thời gian yêu cầu.' }, { status: 504 });
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error) {
    console.error('AI Analytics Chat Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
