import pool from '@/lib/db';
import jwt from 'jsonwebtoken';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const GEMINI_API_KEY = 'AIzaSyDirAOnkeRENXcVO9O0PV2Eipn7r-Si_KA';
const JWT_SECRET = 'supersecret_smart_edu_key_999';

export async function GET(req) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token');
    if (!token) return NextResponse.json({ hasAccess: false });
    
    let decoded;
    try { decoded = jwt.verify(token.value, JWT_SECRET); } catch (e) { return NextResponse.json({ hasAccess: false }); }

    // Auto-migrate schema locally gracefully:
    try { await pool.query('ALTER TABLE users ADD COLUMN can_use_ai BOOLEAN DEFAULT FALSE'); } catch(e) {}

    const [users] = await pool.query('SELECT can_use_ai FROM users WHERE id = ?', [decoded.userId]);
    // Always return true for rendering the bubble if logged in, but pass can_use_ai state
    return NextResponse.json({ hasAccess: true, canUseAi: users[0]?.can_use_ai });
  } catch (err) {
    return NextResponse.json({ hasAccess: false });
  }
}

export async function POST(req) {
  try {
    // Graceful check for schema
    try { await pool.query('ALTER TABLE users ADD COLUMN can_use_ai BOOLEAN DEFAULT FALSE'); } catch(e) {}
    
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

    const { message, history = [] } = await req.json();

    // Verify user can use AI
    const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [decoded.userId]);
    if (users.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const user = users[0];
    if (!user.can_use_ai) {
      return NextResponse.json({ error: 'Bạn chưa được cấp quyền sử dụng AI Chatbot.' }, { status: 403 });
    }

    let systemContext = `Bạn là một trợ lý ảo tư vấn học tập thông minh (AI Chatbot) được tích hợp trong nền tảng học Toán trực tuyến H2bmath. Tên của bạn là H2bmath AI. 
Người bạn đang nói chuyện là ${user.full_name} (${user.role === 'student' ? 'Học sinh' : 'Giáo viên'}). Hãy trả lời một cách tự nhiên, thân thiện, và xưng hô phù hợp.\n\n`;

    if (user.role === 'student') {
      // Gather student data
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
              const questionIds = Object.keys(details);
              if (questionIds.length > 0) {
                // Fetch only questions that were WRONG for deep analysis
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
                } else {
                  systemContext += `    (Học sinh làm đúng 100% bài này)\n`;
                }
              }
            } catch(e) {}
          }
        }
      } else {
        systemContext += `- Kết quả thi: Chưa có dữ liệu bài làm bài thi.\n`;
      }
      
      systemContext += `\nHãy sử dụng thông tin CHI TIẾT CÁC CÂU SAI trên để phân tích hổng kiến thức ở đâu, tại sao học sinh chọn sai (nếu có thể suy luận), và tư vấn lộ trình học tập, các dạng bài cần luyện thêm.`;
    } else {
      // Gather teacher stats
      const [totalStudents] = await pool.query("SELECT COUNT(*) as count FROM users WHERE role='student'");
      const [totalCourses] = await pool.query("SELECT COUNT(*) as count FROM courses");
      const [avgScores] = await pool.query("SELECT AVG(score) as avgScore FROM quiz_results");

      let courseFilter = "1=1";
      const params = [];
      if (user.role === 'teacher') {
         courseFilter = "c.owner_id = ?";
         params.push(user.id);
      }

      const [recentMistakes] = await pool.query(`
        SELECT c.title as course_name, u.full_name as student_name, qr.score, qr.details_json, qr.submitted_at
        FROM quiz_results qr
        JOIN quizzes q ON qr.quiz_id = q.id
        JOIN course_activities a ON q.activity_id = a.id
        JOIN course_modules m ON a.module_id = m.id
        JOIN courses c ON m.course_id = c.id
        JOIN users u ON qr.student_id = u.id
        WHERE ${courseFilter}
        ORDER BY qr.submitted_at DESC
        LIMIT 5
      `, params);

      systemContext += `Đây là dữ liệu tổng quan của hệ thống để hỗ trợ giáo viên phân tích:\n`;
      systemContext += `- Tổng số học sinh: ${totalStudents[0].count}\n`;
      systemContext += `- Tổng số khóa học: ${totalCourses[0].count}\n`;
      systemContext += `- Điểm thi trung bình toàn hệ thống: ${avgScores[0].avgScore ? Number(avgScores[0].avgScore).toFixed(2) : 0}\n`;
      
      if (recentMistakes.length > 0) {
        systemContext += `\nDưới đây là dữ liệu CHI TIẾT bài làm 5 học sinh GẦN NHẤT do bạn quản lý:\n`;
        for (const row of recentMistakes) {
           systemContext += `- Học sinh: ${row.student_name} | Khóa: ${row.course_name} | Điểm: ${row.score}/10\n`;
           if (row.details_json) {
             try {
               const details = JSON.parse(row.details_json);
               const wrongIds = Object.keys(details).filter(id => !details[id].isCorrect).slice(0, 5); // top 5 wrong per student
               if (wrongIds.length > 0) {
                 const [questions] = await pool.query('SELECT id, question_text, correct_answer FROM quiz_questions WHERE id IN (?)', [wrongIds]);
                 systemContext += `  Các lỗi sai cụ thể:\n`;
                 questions.forEach(q => {
                   const d = details[q.id];
                   systemContext += `  + Câu: "${q.question_text}" | HS chọn: ${d.studentAnswer || 'N/A'} | Đáp án đúng: ${q.correct_answer} | Tag: ${d.tag || 'Chưa phân loại'}\n`;
                 });
               } else {
                 systemContext += `  + (HS này làm đúng hết cả bài)\n`;
               }
             } catch(e) {}
           } else {
             systemContext += `  + (Dữ liệu bài cũ, không xem được chi tiết từng câu sai)\n`;
           }
        }
      }

      systemContext += `\nVới tư cách trợ lý ảo AI, hãy sử dụng dữ liệu CHI TIẾT về nội dung câu hỏi và các lỗi sai thực tế của học sinh trên để giúp giáo viên phân tích chuyên sâu. Học sinh nào đang gặp khó khăn cụ thể ở câu hỏi nào? Chủ đề kiến thức nào cả lớp đang yếu? Đề xuất chiến lược giảng dạy dựa trên NỘI DUNG CÂU HỎI thực tế.`;
    }

    // Build contents array for Gemini
    const contents = [];
    // Inject system context as the first user message, model acknowledges it
    contents.push({ role: 'user', parts: [{ text: systemContext }] });
    contents.push({ role: 'model', parts: [{ text: 'Đã rõ. Tôi sẽ sử dụng hệ thống dữ liệu này để tư vấn tốt nhất.' }] });

    // Append history
    for (const msg of history) {
      contents.push({ role: msg.role === 'user' ? 'user' : 'model', parts: [{ text: msg.text }] });
    }
    
    // Append current message
    contents.push({ role: 'user', parts: [{ text: message }] });

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents })
    });

    const aiData = await response.json();
    
    if (!response.ok) {
      console.error('Gemini API Error:', aiData);
      return NextResponse.json({ error: 'Lỗi khi gọi API AI.' }, { status: 500 });
    }

    let aiText = '';
    if (aiData.candidates && aiData.candidates.length > 0) {
      aiText = aiData.candidates[0].content.parts[0].text;
    } else {
      aiText = 'Xin lỗi, tôi không thể trả lời lúc này do lỗi hệ thống.';
    }

    return NextResponse.json({ reply: aiText });

  } catch (error) {
    console.error('Chat API Error', error);
    return NextResponse.json({ error: 'Lỗi máy chủ nội bộ!' }, { status: 500 });
  }
}
