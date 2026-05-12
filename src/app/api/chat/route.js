import pool from '@/lib/db';
import jwt from 'jsonwebtoken';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const UNIVERSAL_API_KEY = 'sk-9f370baa1366bfe3f73951334c3ecdcada536381c5dbccb1079eb0d8ea14e44d';
const JWT_SECRET = 'supersecret_smart_edu_key_999';

export async function GET(req) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token');
    if (!token) return NextResponse.json({ hasAccess: false });

    let decoded;
    try { decoded = jwt.verify(token.value, JWT_SECRET); } catch (e) { return NextResponse.json({ hasAccess: false }); }

    try { await pool.query('ALTER TABLE users ADD COLUMN can_use_ai BOOLEAN DEFAULT FALSE'); } catch (e) { }

    const [users] = await pool.query('SELECT can_use_ai FROM users WHERE id = ?', [decoded.userId]);
    return NextResponse.json({ hasAccess: true, canUseAi: users[0]?.can_use_ai });
  } catch (err) {
    return NextResponse.json({ hasAccess: false });
  }
}

export async function POST(req) {
  try {
    try { await pool.query('ALTER TABLE users ADD COLUMN can_use_ai BOOLEAN DEFAULT FALSE'); } catch (e) { }

    const cookieStore = await cookies();
    const token = cookieStore.get('token');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let decoded;
    try {
      decoded = jwt.verify(token.value, JWT_SECRET);
    } catch (e) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { message, history = [], bot = 'gemini' } = await req.json();

    const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [decoded.userId]);
    if (users.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const user = users[0];
    if (!user.can_use_ai) {
      return NextResponse.json({ error: 'Bạn chưa được cấp quyền sử dụng AI Chatbot.' }, { status: 403 });
    }

    // Cấp quyền RAG Toàn Diện: Lấy danh sách giới hạn an toàn
    const [studentsResult] = await pool.query("SELECT full_name, email FROM users WHERE role='student' LIMIT 300");
    const [teachersResult] = await pool.query("SELECT full_name, email FROM users WHERE role='teacher' LIMIT 100");
    const [coursesResult] = await pool.query("SELECT c.title, u.full_name as instructor_name FROM courses c LEFT JOIN users u ON c.owner_id = u.id LIMIT 200");
    let minigamesResult = [];
    try { const [res] = await pool.query("SELECT title, game_type FROM imath_studio_projects LIMIT 200"); minigamesResult = res; } catch(e) {}
    let docsResult = [];
    try { const [res] = await pool.query("SELECT title FROM documents LIMIT 100"); docsResult = res; } catch(e) {}

    const listStudents = studentsResult.map(s => typeof s.full_name === 'string' ? s.full_name : 'No Name').join(', ');
    const listTeachers = teachersResult.map(t => typeof t.full_name === 'string' ? t.full_name : 'No Name').join(', ');
    const listCourses = coursesResult.map(c => `${c.title} (GV: ${c.instructor_name || 'Hệ thống'})`).join('; ');
    const listGames = minigamesResult.map(g => `${g.title} (${g.game_type})`).join('; ');
    const listDocs = docsResult.map(d => typeof d.title === 'string' ? d.title : 'Doc').join(', ');

    let systemContext = `Bạn là một trợ lý ảo tư vấn học tập thông minh (AI Chatbot) được tích hợp trong nền tảng học Toán trực tuyến H2bmath. Tên của bạn là H2bmath AI. 
Người bạn đang nói chuyện là ${user.full_name} (${user.role === 'student' ? 'Học sinh' : 'Giáo/Nhân viên'}). Hãy trả lời một cách tự nhiên, thân thiện, và xưng hô phù hợp.

# BẢN ĐỒ TRUY XUẤT DỮ LIỆU HỆ THỐNG IMATH (Được cấp quyền RAG TOÀN DIỆN)
Dưới đây là DỮ LIỆU THẬT đang có trên Website. Hãy dùng thông tin này để trả lời khi người dùng hỏi các câu như "Ai dạy khoá X?", "Hệ thống có game gì?", "Có những học sinh nào?".

1. DATA TỔNG SỐ LƯỢNG:
- Học sinh: ${studentsResult.length} | Giáo viên: ${teachersResult.length} | Khóa học: ${coursesResult.length} | Trò chơi (Minigame): ${minigamesResult.length} | Tài liệu: ${docsResult.length}

2. DANH SÁCH CHI TIẾT (Trút xuất từ SQL Database):
- 👨‍🏫 Danh sách Giáo viên/Nhân sự: ${listTeachers}
- 📚 Danh sách Khóa học đang mở: ${listCourses}
- 🕹️ Danh sách Game / Học liệu tương tác trong Studio: ${listGames || 'Đang chờ giáo viên tạo mới'}
- 📄 Kho tài liệu / Ấn phẩm: ${listDocs || 'Đang chờ upload'}
- 👩‍🎓 Danh sách Học sinh / Học viên: ${listStudents}

`;

    if (user.role === 'student') {
      const [enrollments] = await pool.query(`
        SELECT c.title, e.status, e.created_at
        FROM enrollments e
        JOIN courses c ON e.course_id = c.id
        WHERE e.user_id = ?
      `, [user.id]);

      const [quizResults] = await pool.query(`
        SELECT qr.score, qr.details_json, c.title as course_title, qr.quiz_id, qr.submitted_at
        FROM quiz_results qr
        JOIN quizzes q ON qr.quiz_id = q.id
        JOIN course_activities a ON q.activity_id = a.id
        JOIN course_modules cm ON a.module_id = cm.id
        JOIN courses c ON cm.course_id = c.id
        WHERE qr.student_id = ?
        ORDER BY qr.submitted_at DESC
        LIMIT 5
      `, [user.id]);

      systemContext += `Đây là dữ liệu học tập của học sinh này trên hệ thống:\n`;
      systemContext += `- Khóa học đang tham gia: ${enrollments.map(e => e.title).join(', ') || 'Chưa tham gia khóa nào'}\n`;

      if (quizResults.length > 0) {
        systemContext += `- Kết quả 5 bài thi gần nhất:\n`;
        for (const res of quizResults) {
          systemContext += `  + Khóa: ${res.course_title} | Điểm: ${res.score}/10 | Ngày: ${new Date(res.submitted_at).toLocaleDateString('vi-VN')}\n`;

          if (res.details_json) {
            try {
              const details = JSON.parse(res.details_json);
              const wrongIds = Object.keys(details).filter(id => !details[id].isCorrect);
              if (wrongIds.length > 0) {
                const [questions] = await pool.query('SELECT id, question_text, options_json, correct_answer FROM quiz_questions WHERE id IN (?)', [wrongIds]);
                systemContext += `    Chi tiết các câu sai trong bài này:\n`;
                questions.forEach(q => {
                  const d = details[q.id];
                  systemContext += `    * Câu hỏi: "${q.question_text}"\n`;
                  systemContext += `      - Học sinh chọn: ${d.studentAnswer || 'N/A'}\n`;
                  systemContext += `      - Đáp án đúng: ${q.correct_answer}\n`;
                  systemContext += `      - Dạng toán (Tag): ${d.tag || 'Chưa phân loại'}\n`;
                });
              }
            } catch (e) { }
          }
        }
      }
      systemContext += `\nHãy sử dụng thông tin CHI TIẾT CÁC CÂU SAI trên để tư vấn lộ trình học tập.`;
    } else {
      const [avgScores] = await pool.query("SELECT AVG(score) as avgScore FROM quiz_results");

      let courseFilter = "1=1";
      const params = [];
      if (user.role === 'teacher') {
        courseFilter = "c.owner_id = ?";
        params.push(user.id);
      }

      // Tiến độ hoàn thành từng học sinh / từng khóa (CORE DATA)
      const [progressRows] = await pool.query(`
        SELECT 
          u.full_name as student_name,
          c.title as course_title,
          COUNT(DISTINCT sp.activity_id) as completed,
          (SELECT COUNT(*) FROM course_activities ca 
           JOIN course_modules cm2 ON ca.module_id = cm2.id 
           WHERE cm2.course_id = c.id) as total
        FROM enrollments e
        JOIN users u ON e.user_id = u.id
        JOIN courses c ON e.course_id = c.id
        LEFT JOIN student_progress sp ON sp.student_id = u.id
          AND sp.activity_id IN (
            SELECT ca.id FROM course_activities ca
            JOIN course_modules cm ON ca.module_id = cm.id
            WHERE cm.course_id = c.id
          )
        WHERE ${courseFilter}
        GROUP BY u.id, c.id
        ORDER BY u.full_name, c.title
      `, params);

      // Điểm thi của từng học sinh
      const [allScores] = await pool.query(`
        SELECT u.full_name as student_name, ca.title as quiz_title,
          ROUND(CASE WHEN qr.score > 100 THEN qr.score/100 WHEN qr.score > 10 THEN qr.score/10 ELSE qr.score END, 1) as score,
          DATE(qr.submitted_at) as date
        FROM quiz_results qr
        JOIN users u ON qr.student_id = u.id
        JOIN quizzes q ON qr.quiz_id = q.id
        JOIN course_activities ca ON q.activity_id = ca.id
        JOIN course_modules cm ON ca.module_id = cm.id
        JOIN courses c ON cm.course_id = c.id
        WHERE ${courseFilter}
        ORDER BY qr.submitted_at DESC LIMIT 100
      `, params);

      systemContext += `\n📊 THỐNG KÊ CHI TIẾT (Dành cho Giáo viên/Quản trị):\n`;
      systemContext += `- Điểm TB toàn hệ thống: ${avgScores[0].avgScore ? Number(avgScores[0].avgScore).toFixed(2) : 0}/10\n`;

      // Phân tích tiến độ: ai chưa hoàn thành
      if (progressRows.length > 0) {
        systemContext += `\n📋 TIẾN ĐỘ HỌC TẬP (Hoàn thành bài/Tổng bài):\n`;
        const incomplete = progressRows.filter(r => r.total > 0 && r.completed < r.total);
        const complete   = progressRows.filter(r => r.total > 0 && r.completed >= r.total);
        const notStarted = progressRows.filter(r => r.completed === 0);

        systemContext += `- Học sinh CHƯA hoàn thành khóa học: ${incomplete.length} trường hợp\n`;
        systemContext += `- Học sinh ĐÃ hoàn thành: ${complete.length} trường hợp\n`;
        systemContext += `- Chưa bắt đầu học (0 bài): ${notStarted.length} trường hợp\n`;

        systemContext += `\nChi tiết từng học sinh:\n`;
        for (const r of progressRows) {
          const pct = r.total > 0 ? Math.round((r.completed / r.total) * 100) : 0;
          const status = r.completed >= r.total && r.total > 0 ? '✅ Hoàn thành' : `⏳ ${pct}%`;
          systemContext += `- ${r.student_name} | "${r.course_title}": ${r.completed}/${r.total} bài — ${status}\n`;
        }
      }

      if (allScores.length > 0) {
        systemContext += `\n🎯 ĐIỂM THI GẦN ĐÂY:\n`;
        for (const s of allScores.slice(0, 30)) {
          systemContext += `- ${s.student_name} | ${s.quiz_title}: ${s.score}/10 (${s.date})\n`;
        }
      }
    }

    // Helper: Safely call proxy và trả về text content, hoặc null nếu lỗi
    const callProxy = async (apiKey, model, msgs, signal) => {
      try {
        const res = await fetch('https://llm.chiasegpu.vn/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
          body: JSON.stringify({ model, messages: msgs }),
          signal
        });
        const text = await res.text(); // Đọc text để tránh crash khi proxy trả HTML
        if (!res.ok) {
          console.warn(`Proxy lỗi ${res.status}:`, text.substring(0, 100));
          return null;
        }
        const data = JSON.parse(text); // Có thể lỗi nếu là HTML → null
        return data?.choices?.[0]?.message?.content || null;
      } catch (e) {
        console.warn('Proxy fail, chuyển fallback Gemini:', e.message);
        return null;
      }
    };

    // Helper: Gọi OpenClaw (chạy trên laptop cục bộ)
    const callOpenClaw = async (msgs, signal) => {
      try {
        const openClawUrl = 'http://127.0.0.1:18789/v1/chat/completions'; 
        
        const res = await fetch(openClawUrl, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': 'Bearer 5db77e802d67b87adac923ea3d53c7f0ecbc3c71f62cd846'
          },
          body: JSON.stringify({ 
            model: 'openclaw', // OpenClaw tự map với agent nội bộ
            messages: msgs 
          }),
          signal
        });
        
        const text = await res.text();
        if (!res.ok) {
          console.warn(`OpenClaw lỗi ${res.status}:`, text.substring(0, 100));
          return null;
        }
        const data = JSON.parse(text);
        
        // Trả về text. Giả định OpenClaw dùng chuẩn output giống OpenAI
        return data?.choices?.[0]?.message?.content || null;
      } catch (e) {
        console.warn('OpenClaw fail:', e.message);
        return null;
      }
    };

    // Helper: Gọi Gemini qua proxy chung
    const callGemini = async (ctx, hist, msg, signal) => {
      const geminiModels = ['deepseek-v4-pro'];
      for (const modelName of geminiModels) {
        try {
          const msgs = [
            { role: 'system', content: ctx },
            ...hist.map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text || m.content || '' })),
            { role: 'user', content: msg }
          ];
          const text = await callProxy(UNIVERSAL_API_KEY, modelName, msgs, signal);
          if (text) return text;
        } catch (e) { if (e.name === 'AbortError') throw e; continue; }
      }
      return null;
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 120s timeout

    let aiText = '';
    let usedFallback = false;
    try {
      const msgs = [
        { role: 'system', content: systemContext },
        ...history.map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text || m.content || '' })),
        { role: 'user', content: message }
      ];

      if (bot === 'openclaw') {
        aiText = await callOpenClaw(msgs, controller.signal);
        if (!aiText) { usedFallback = true; aiText = await callGemini(systemContext, history, message, controller.signal); }
      } else if (bot === 'openai') {
        aiText = await callProxy(UNIVERSAL_API_KEY, 'deepseek-v4-pro', msgs, controller.signal);
        if (!aiText) { usedFallback = true; aiText = await callGemini(systemContext, history, message, controller.signal); }
      } else if (bot === 'claude') {
        aiText = await callProxy(UNIVERSAL_API_KEY, 'deepseek-v4-pro', msgs, controller.signal);
        if (!aiText) { usedFallback = true; aiText = await callGemini(systemContext, history, message, controller.signal); }
      } else {
        // Mặc định, bạn có thể đổi thành gọi OpenClaw làm mặc định luôn bằng cách:
        // aiText = await callOpenClaw(msgs, controller.signal);
        // Nhưng tạm thời vẫn để Gemini nếu bot không phải 'openclaw'
        aiText = await callOpenClaw(msgs, controller.signal); 
        if (!aiText) { usedFallback = true; aiText = await callGemini(systemContext, history, message, controller.signal); }
      }

      if (!aiText) aiText = 'Dịch vụ AI đang bận, vui lòng thử lại sau.';
      if (usedFallback) aiText += `\n\n*(Lưu ý: Mô hình ${bot === 'openai' ? 'GPT/Llama' : 'Claude'} tạm thời không khả dụng. Phản hồi bởi DeepSeek.)*`;

      return NextResponse.json({ reply: aiText });
    } catch (error) {
      if (error.name === 'AbortError') return NextResponse.json({ error: 'Quá thời gian xử lý.' }, { status: 504 });
      console.error(error);
      return NextResponse.json({ error: 'Lỗi AI.' }, { status: 500 });
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Lỗi hệ thống.' }, { status: 500 });
  }
}
