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
        SELECT qr.score, c.title as course_title
        FROM quiz_results qr
        JOIN quizzes q ON qr.quiz_id = q.id
        JOIN course_activities a ON q.activity_id = a.id
        JOIN course_modules cm ON a.module_id = cm.id
        JOIN courses c ON cm.course_id = c.id
        WHERE qr.student_id = ?
        GROUP BY qr.id
      `, [user.id]);

      systemContext += `Đây là dữ liệu học tập của học sinh này trên hệ thống:\n`;
      systemContext += `- Khóa học đang tham gia: ${enrollments.map(e => e.title).join(', ') || 'Chưa tham gia khóa nào'}\n`;
      systemContext += `- Kết quả thi (số điểm/100 hoặc tỉ lệ đúng): ${quizResults.map(q => q.score + ' (' + q.course_title + ')').join(', ') || 'Chưa có điểm thi'}\n`;
      systemContext += `\nHãy sử dụng thông tin này để phân tích điểm mạnh, điểm yếu, và tư vấn lộ trình học phù hợp nếu học sinh hỏi về kết quả của họ.`;
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

      const [courseScores] = await pool.query(`
        SELECT c.title as course_name, u.full_name as student_name, qr.score
        FROM quiz_results qr
        JOIN quizzes q ON qr.quiz_id = q.id
        JOIN course_activities a ON q.activity_id = a.id
        JOIN course_modules m ON a.module_id = m.id
        JOIN courses c ON m.course_id = c.id
        JOIN users u ON qr.student_id = u.id
        WHERE ${courseFilter}
        ORDER BY c.title, qr.score DESC
        LIMIT 50
      `, params);

      systemContext += `Đây là dữ liệu tổng quan của hệ thống để hỗ trợ giáo viên phân tích:\n`;
      systemContext += `- Tổng số học sinh: ${totalStudents[0].count}\n`;
      systemContext += `- Tổng số khóa học: ${totalCourses[0].count}\n`;
      systemContext += `- Điểm thi trung bình toàn hệ thống: ${avgScores[0].avgScore ? Number(avgScores[0].avgScore).toFixed(2) : 0}\n`;
      
      if (courseScores.length > 0) {
        systemContext += `\nDưới đây là dữ liệu ĐIỂM SỐ CHI TIẾT của các học sinh trong khoá học do bạn quản lý:\n`;
        courseScores.forEach(row => {
           systemContext += `- Khóa học: ${row.course_name} | Học sinh: ${row.student_name} | Điểm: ${row.score}/10\n`;
        });
      } else {
        systemContext += `\nHiện tại chưa có học sinh nào làm bài kiểm tra.\n`;
      }

      systemContext += `\nVới tư cách trợ lý ảo AI, hãy sử dụng tất cả dữ liệu thực tế trên để giúp giáo viên phân tích chuyên sâu xem học sinh nào điểm kém, điểm cao, liệt kê dữ liệu ra nếu được yêu cầu, và đề xuất phương pháp giảng dạy.`;
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
