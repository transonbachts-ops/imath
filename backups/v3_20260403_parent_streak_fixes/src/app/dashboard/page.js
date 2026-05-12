import pool from '@/lib/db';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import CalendarBoard from './CalendarBoard';
import ThemeToggle from '@/app/components/ThemeToggle';
import UserMenu from '@/app/components/UserMenu';

export default async function Dashboard({ searchParams }) {
  const cookieStore = await cookies();
  const token = cookieStore.get('token');
  const resolvedParams = await searchParams;
  const query = resolvedParams?.q || '';
  
  if (!token) redirect('/login');
  let user = null;
  try { user = jwt.verify(token.value, 'supersecret_smart_edu_key_999'); } catch(e) { redirect('/login'); }

  // 1. Basic course list
  let courses = [];
  if (query) {
    const [rows] = await pool.query('SELECT * FROM courses WHERE title LIKE ? OR description LIKE ?', [`%${query}%`, `%${query}%`]);
    courses = rows;
  } else {
    const [rows] = await pool.query('SELECT * FROM courses');
    courses = rows;
  }

  // 2. Enrollments of current user
  const [myEnrollments] = await pool.query(
    'SELECT c.*, e.status, e.id as enrollment_id FROM courses c JOIN enrollments e ON c.id=e.course_id WHERE e.user_id=?',
    [user.userId]
  );
  const approvedCourses = myEnrollments.filter(e => e.status === 'approved');
  const courseIds = approvedCourses.map(c => c.id);

  // 3. Most recent activity overall
  let [[lastActRow]] = await pool.query(`
    SELECT ca.*, cm.course_id FROM student_progress sp
    JOIN course_activities ca ON sp.activity_id = ca.id
    JOIN course_modules cm ON ca.module_id = cm.id
    WHERE sp.student_id = ? AND (ca.url IS NULL OR (ca.url NOT LIKE '%exemple%' AND ca.url NOT LIKE '%example%'))
    ORDER BY sp.completed_at DESC LIMIT 1
  `, [user.userId]);

  if (!lastActRow && approvedCourses.length > 0) {
      const [[firstAct]] = await pool.query(`
        SELECT ca.*, cm.course_id FROM course_activities ca
        JOIN course_modules cm ON ca.module_id = cm.id
        WHERE cm.course_id = ? AND (ca.url IS NULL OR (ca.url NOT LIKE '%exemple%' AND ca.url NOT LIKE '%example%'))
        ORDER BY cm.order_index, ca.order_index LIMIT 1
     `, [approvedCourses[0].id]);
     lastActRow = firstAct;
  }

  // 4. OPTIMIZED Progress Calculation (Bulk fetch)
  const courseProgressMap = {};
  if (courseIds.length > 0) {
    // 4.1. Bulk counts for progress
    const [stats] = await pool.query(`
      SELECT 
        cm.course_id, 
        COUNT(DISTINCT ca.id) as total_acts,
        COUNT(DISTINCT CASE WHEN sp.student_id IS NOT NULL THEN ca.id END) as done_acts
      FROM course_modules cm
      LEFT JOIN course_activities ca ON cm.id = ca.module_id
      LEFT JOIN student_progress sp ON ca.id = sp.activity_id AND sp.student_id = ?
      WHERE cm.course_id IN (?)
      GROUP BY cm.course_id
    `, [user.userId, courseIds]);

    // 4.2. Bulk fetch activities for "next" logic
    const [allActivities] = await pool.query(`
      SELECT ca.*, cm.course_id 
      FROM course_activities ca 
      JOIN course_modules cm ON ca.module_id = cm.id 
      WHERE cm.course_id IN (?) 
      ORDER BY cm.order_index, ca.order_index
    `, [courseIds]);

    // 4.3. Bulk fetch progress IDs
    const [allProgress] = await pool.query(`
      SELECT sp.activity_id, cm.course_id, sp.completed_at 
      FROM student_progress sp
      JOIN course_activities ca ON sp.activity_id = ca.id
      JOIN course_modules cm ON ca.module_id = cm.id
      WHERE sp.student_id = ? AND cm.course_id IN (?)
      ORDER BY sp.completed_at DESC
    `, [user.userId, courseIds]);

    // Construct the map in memory
    for (const cId of courseIds) {
      const courseStat = stats.find(s => s.course_id === cId) || { total_acts: 0, done_acts: 0 };
      const courseActs = allActivities.filter(a => a.course_id === cId);
      const courseDoneIds = allProgress.filter(p => p.course_id === cId).map(p => p.activity_id);
      
      const total = courseStat.total_acts || 0;
      const done = courseStat.done_acts || 0;
      const pct = total > 0 ? Math.round((done / total) * 100) : 0;

      // Find the most recent or the first uncompleted
      const recentInCourse = allActivities.find(a => a.id === allProgress.find(p => p.course_id === cId)?.activity_id);
      const nextActRaw = courseActs.find(a => !courseDoneIds.includes(a.id));
      const nextAct = recentInCourse || nextActRaw;

      courseProgressMap[cId] = { pct, done, total, nextAct };
    }
  }

  // 5. Fetch Daily Quizzes for current month (for Calendar)
  let dailyQuizList = [];
  try {
     const [dqRows] = await pool.query('SELECT submitted_at, score FROM daily_quiz_results WHERE student_id = ?', [user.userId]);
     dailyQuizList = dqRows.map(d => ({
        date: new Date(new Date(d.submitted_at).getTime() + 7 * 60 * 60 * 1000).toISOString().split('T')[0],
        score: d.score
     }));
  } catch(e) {}

  return (
    <div style={{fontFamily: "'Segoe UI', system-ui, sans-serif", background: 'transparent', minHeight: '100vh'}}>
      {/* NAVBAR */}
      <nav className="glass-panel" style={{color: 'var(--text-primary)', padding: '0 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 75, position: 'sticky', top: 0, zIndex: 100, borderBottom: '1px solid rgba(255,255,255,0.4)', borderRadius: '0 0 24px 24px', margin: '0 10px'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: '40px', height: '100%'}}>
          <Link href="/dashboard" style={{fontSize: 26, fontWeight: 950, color: 'var(--primary)', textDecoration: 'none', letterSpacing: -1.5}}>
            H2bmath<span style={{color: 'var(--secondary)'}}>.</span>
          </Link>
          <div style={{display: 'flex', gap: '25px', fontSize: 14, fontWeight: 700, height: '100%', alignItems: 'center'}}>
             <Link href="/" style={{color: 'var(--text-secondary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 5, opacity: 0.7}} title="Về trang chủ">Về trang chủ</Link>
             <Link href="/dashboard" style={{color: 'var(--primary)', textDecoration: 'none', borderBottom: '3px solid var(--secondary)', height: '100%', display: 'flex', alignItems: 'center', boxSizing: 'border-box', paddingTop: 3}}>Dashboard</Link>
             <Link href="/courses" style={{color: 'var(--text-secondary)', textDecoration: 'none'}}>Khóa học</Link>
             <Link href="/events" style={{color: 'var(--text-secondary)', textDecoration: 'none'}}>Lịch Học</Link>
             <Link href="/documents" style={{color: 'var(--text-secondary)', textDecoration: 'none'}}>Tài liệu</Link>
          </div>
        </div>
         <div style={{display: 'flex', gap: '15px', alignItems: 'center'}}>
            <style dangerouslySetInnerHTML={{__html: `.dash-search::placeholder { color: var(--text-secondary) !important; opacity: 0.6 !important; }`}} />
            <form action="/dashboard" style={{background: 'rgba(255,255,255,0.5)', padding: '0 20px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 10, width: 280, height: 42, border: '1px solid rgba(255,255,255,0.6)', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', transition: 'all 0.3s ease'}}>
              <button type="submit" style={{background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', fontSize: 13, padding: 0, opacity: 0.7}}>🔍</button>
              <input type="text" className="dash-search" name="q" defaultValue={query} placeholder="Tìm kiếm khóa học..." style={{border: 'none', outline: 'none', background: 'transparent', width: '100%', fontSize: 14, color: 'var(--text-primary)', fontWeight: 600}} />
            </form>
            <ThemeToggle />
            <UserMenu user={user} />
         </div>
      </nav>

      {/* WELCOME BANNER */}
      <div style={{background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.85) 0%, rgba(124, 58, 237, 0.7) 100%)', backdropFilter: 'blur(10px)', color: '#fff', padding: '35px 50px', borderBottom: '1px solid rgba(255,255,255,0.2)', margin: '0 10px', borderRadius: 24, boxShadow: '0 10px 40px rgba(79, 70, 229, 0.15)'}}>
        <div style={{maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <div>
            <h1 style={{fontSize: 28, fontWeight: 900, margin: '0 0 8px 0', color: '#ffffff', textShadow: '0 2px 10px rgba(0,0,0,0.1)'}}>
              Chào mừng trở lại, <span style={{color: 'var(--secondary)'}}>{user.full_name}</span>! 👋
            </h1>
            <p style={{color: '#f0f4ff', margin: 0, fontSize: 15, fontWeight: 500}}>Tiếp tục hành trình chinh phục kiến thức của bạn.</p>
          </div>
          {lastActRow && (
            <Link 
              href={lastActRow.type === 'quiz' ? `/course/${lastActRow.course_id}/quiz/${lastActRow.id}` : (lastActRow.url && !/ex[ae]mple/i.test(lastActRow.url) ? lastActRow.url : `/course/${lastActRow.course_id}/learn`)} 
              target={lastActRow.type !== 'quiz' && lastActRow.url && !/ex[ae]mple/i.test(lastActRow.url) ? '_blank' : '_self'}
              style={{background: 'var(--secondary)', color: '#1e293b', padding: '14px 30px', borderRadius: 30, textDecoration: 'none', fontWeight: 800, fontSize: 14, whiteSpace: 'nowrap', boxShadow: '0 8px 25px rgba(251, 191, 36, 0.3)'}}
            >
              ▶ Tiếp Tục Học: {lastActRow.title}
            </Link>
          )}
        </div>
      </div>

      <div style={{maxWidth: 1200, margin: '30px auto', padding: '0 20px'}}>
        
        {/* DAILY QUIZ CTA */}
        <div style={{background: 'linear-gradient(to right, #f39c12, #e67e22)', borderRadius: 12, padding: '25px 30px', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 35, boxShadow: '0 4px 15px rgba(230, 126, 34, 0.3)'}}>
           <div>
              <h2 style={{margin: '0 0 5px 0', fontSize: 24, fontWeight: 900}}>🔥 Bài Toán Hằng Ngày</h2>
              <p style={{margin: 0, opacity: 0.9, fontSize: 15, fontWeight: 600}}>Khởi động tư duy mỗi ngày cùng H2bmath. Bấm vào để làm bài ngay!</p>
           </div>
           <Link href="/daily" style={{background: '#fff', color: '#d35400', padding: '12px 30px', borderRadius: 8, fontWeight: 800, textDecoration: 'none'}}>Vào Phòng Tập</Link>
        </div>

        {/* QUICK STATS ROW */}
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 35}}>
          <div style={{background: 'var(--card-bg)', borderRadius: 12, padding: '24px 28px', boxShadow: '0 2px 12px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: 20}}>
            <div style={{width: 50, height: 50, borderRadius: 12, background: 'linear-gradient(135deg, #003380, #0050c8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24}}>📚</div>
            <div>
              <div style={{fontSize: 28, fontWeight: 900, color: 'var(--primary)'}}>{approvedCourses.length}</div>
              <div style={{color: 'var(--text-secondary)', fontSize: 13}}>Khóa đang theo học</div>
            </div>
          </div>
          <div style={{background: 'var(--card-bg)', borderRadius: 12, padding: '24px 28px', boxShadow: '0 2px 12px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: 20}}>
            <div style={{width: 50, height: 50, borderRadius: 12, background: 'linear-gradient(135deg, #2ecc71, #27ae60)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24}}>✅</div>
            <div>
              <div style={{fontSize: 28, fontWeight: 900, color: '#2ecc71'}}>{myEnrollments.length}</div>
              <div style={{color: 'var(--text-secondary)', fontSize: 13}}>Tổng ghi danh</div>
            </div>
          </div>
          <div style={{background: 'var(--card-bg)', borderRadius: 12, padding: '24px 28px', boxShadow: '0 2px 12px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: 20}}>
            <div style={{width: 50, height: 50, borderRadius: 12, background: 'linear-gradient(135deg, #f39c12, #e67e22)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24}}>📅</div>
            <div>
              <div style={{fontSize: 22, fontWeight: 900, color: '#f39c12'}}>{new Date().toLocaleDateString('vi-VN')}</div>
              <div style={{color: 'var(--text-secondary)', fontSize: 13}}>Hôm nay</div>
            </div>
          </div>
        </div>

        {/* CALENDAR BOARD */}
        <div style={{background: 'var(--card-bg)', borderRadius: 12, padding: 30, boxShadow: '0 2px 12px rgba(0,0,0,0.05)', marginBottom: 35}}>
          <CalendarBoard userId={user.userId} enrolledCourseIds={courseIds} dailyQuizzes={dailyQuizList} />
        </div>

        {/* MY ENROLLED COURSES with REAL progress */}
        {approvedCourses.length > 0 && (
          <div style={{marginBottom: 35}}>
            <h2 style={{fontSize: 22, fontWeight: 800, color: 'var(--primary)', marginBottom: 20}}>📖 Khóa học của tôi</h2>
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20}}>
              {approvedCourses.map(c => {
                const prog = courseProgressMap[c.id] || { pct: 0, done: 0, total: 0 };
                const nextAct = prog.nextAct;
                const continueHref = nextAct
                  ? (nextAct.type === 'quiz' ? `/course/${c.id}/quiz/${nextAct.id}` : (nextAct.url && !/ex[ae]mple/i.test(nextAct.url) ? nextAct.url : `/course/${c.id}/learn`))
                  : `/course/${c.id}/learn`;
                return (
                  <div key={c.id} style={{background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '2px solid #e8f0fe'}}>
                    <div style={{height: 130, backgroundImage: `url(${c.image_url || 'https://placehold.co/400x200/003380/fff?text=Course'})`, backgroundSize: 'cover', backgroundPosition: 'center'}}></div>
                    <div style={{padding: 18}}>
                      <h4 style={{margin: '0 0 12px 0', fontSize: 15, color: '#003380', fontWeight: 700}}>{c.title}</h4>
                      <div style={{display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5}}>
                        <div style={{flex: 1, background: '#e8f0fe', borderRadius: 4, height: 8}}>
                          <div style={{width: `${prog.pct}%`, height: '100%', background: prog.pct >= 70 ? '#2ecc71' : prog.pct >= 30 ? '#f39c12' : '#1a56db', borderRadius: 4, transition: 'width 0.5s'}}></div>
                        </div>
                        <span style={{fontSize: 13, color: '#555', fontWeight: 600, minWidth: 32}}>{prog.pct}%</span>
                      </div>
                      <p style={{fontSize: 12, color: '#999', margin: '0 0 12px 0'}}>{prog.done}/{prog.total} bài hoàn thành</p>
                      <Link href={continueHref} target={nextAct && nextAct.type !== 'quiz' ? '_blank' : '_self'} style={{display: 'inline-block', background: '#1a56db', color: '#fff', padding: '8px 16px', borderRadius: 6, fontSize: 13, fontWeight: 600, textDecoration: 'none'}}>▶ Tiếp tục học</Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ALL COURSES SECTION */}
        <div id="courses-section">
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20}}>
            <h2 style={{fontSize: 22, fontWeight: 800, color: '#003380', margin: 0}}>
              {query ? `Kết quả tìm kiếm: "${query}"` : '🎓 Tất cả Khóa học'}
            </h2>
            <Link href="/courses" style={{color: '#1a56db', fontWeight: 'bold', textDecoration: 'none', fontSize: 14}}>Xem tất cả →</Link>
          </div>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24}}>
            {courses.map(c => (
               <Link href={`/course/${c.id}`} key={c.id} style={{textDecoration: 'none', background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.05)', border: '1px solid #eee', display: 'flex', flexDirection: 'column'}}>
                 <div style={{backgroundImage: `url(${c.image_url || 'https://placehold.co/400x200/003380/fff?text=Course'})`, backgroundSize: 'cover', backgroundPosition: 'center', height: '180px'}}></div>
                 <div style={{padding: '20px', display: 'flex', flexDirection: 'column', flexGrow: 1}}>
                   <p style={{color: '#cc0000', fontSize: 11, marginBottom: 6, fontWeight: 'bold', textTransform: 'uppercase'}}>Khóa học Toán</p>
                   <h3 style={{marginBottom: '12px', color: '#003380', fontSize: '18px', fontWeight: 800, lineHeight: 1.3}}>{c.title}</h3>
                   <p style={{color: '#666', fontSize: '14px', marginBottom: '16px', flexGrow: 1, lineHeight: '1.6'}}>{c.description || 'Chưa có mô tả.'}</p>
                   <div style={{textAlign: 'center'}}>
                      <span style={{background: '#003380', color: '#fff', padding: '10px 30px', fontSize: 13, fontWeight: 'bold', display: 'inline-block', borderRadius: 6}}>
                        Xem thêm →
                      </span>
                   </div>
                 </div>
               </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
