import pool from '@/lib/db';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function CourseLearnPage({ params }) {
  const cookieStore = await cookies();
  const token = cookieStore.get('token');
  const { id } = await params;
  
  if (!token) redirect('/login');

  let user = null;
  try { user = jwt.verify(token.value, 'supersecret_smart_edu_key_999'); } catch(e) { redirect('/login'); }

  const [courses] = await pool.query('SELECT * FROM courses WHERE id=?', [id]);
  if (!courses.length) return <div>Khóa học không tồn tại.</div>;
  const course = courses[0];

  // Kiểm tra ghi danh
  const [enrolls] = await pool.query('SELECT * FROM enrollments WHERE user_id=? AND course_id=?', [user.userId, id]);
  if (!enrolls.length && user.role !== 'admin' && user.role !== 'teacher') {
    redirect(`/course/${id}`);
  }
  const enroll = enrolls[0] || { created_at: new Date() };
  const enrollDate = new Date(enroll.created_at).toLocaleDateString('vi-VN');

  // Load modules & activities
  const [courseModules] = await pool.query('SELECT * FROM course_modules WHERE course_id=? ORDER BY order_index ASC', [id]);
  const [courseActivities] = await pool.query(
    'SELECT a.* FROM course_activities a JOIN course_modules m ON a.module_id = m.id WHERE m.course_id=? ORDER BY a.order_index ASC',
    [id]
  );

  // REAL Stats - completed activities
  const [completedRows] = await pool.query(`
    SELECT p.activity_id FROM student_progress p
    JOIN course_activities a ON p.activity_id = a.id
    JOIN course_modules m ON a.module_id = m.id
    WHERE p.student_id = ? AND m.course_id = ?
  `, [user.userId, id]);
  const completedIds = completedRows.map(r => r.activity_id);
  
  const totalActivities = courseActivities.length;
  const completedCount = courseActivities.filter(a => completedIds.includes(a.id)).length;
  const progressPct = totalActivities > 0 ? Math.round((completedCount / totalActivities) * 100) : 0;

  // Type breakdown
  const quizCount = courseActivities.filter(a => a.type === 'quiz').length;
  const resourceCount = courseActivities.filter(a => a.type !== 'quiz').length;

  // Last completed activity for "Tiếp tục học"
  const [lastCompleted] = await pool.query(`
    SELECT pa.activity_id, a.type FROM student_progress pa
    JOIN course_activities a ON pa.activity_id = a.id
    JOIN course_modules m ON a.module_id = m.id
    WHERE pa.student_id = ? AND m.course_id = ?
    ORDER BY pa.completed_at DESC LIMIT 1
  `, [user.userId, id]);
  
  // Find next uncompleted activity, skipping 'exemple' / 'example' urls
  const nextActivity = courseActivities.find(a => !completedIds.includes(a.id) && (!a.url || !/ex[ae]mple/i.test(a.url)));

  const getActivityIcon = (type) => {
    if (type === 'quiz') return '📝';
    if (type === 'resource') return '📕';
    if (type === 'scorm') return '📦';
    return '📄';
  };

  return (
    <div style={{fontFamily: "'Segoe UI', system-ui, sans-serif", background: '#f0f4f8', minHeight: '100vh', display: 'flex'}}>
      
      {/* LEFT SIDEBAR */}
      <div style={{width: 290, flexShrink: 0, background: '#fff', borderRight: '1px solid #e0e0e0', display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh', overflowY: 'auto'}}>
         <div style={{padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid #eee', background: '#003380'}}>
            <Link href="/dashboard" style={{fontWeight: 900, color: '#fff', fontSize: 22, textDecoration: 'none', letterSpacing: -1}}>
               H2bmath<span style={{color: '#ff6b6b'}}>.</span>
            </Link>
         </div>
         
         <div style={{padding: '15px 0'}}>
            <Link href="/dashboard" style={{display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px', color: '#555', textDecoration: 'none', fontSize: 14}}>
              <span style={{fontSize: 16}}>🏠</span> Bảng điều khiển
            </Link>
            <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px', color: '#003380', fontSize: 14, fontWeight: 'bold', background: '#f0f4f8', borderLeft: '3px solid #003380'}}>
               <div style={{display: 'flex', gap: 10, alignItems: 'center'}}>
                 <span style={{fontSize: 16}}>👥</span> Nội dung học tập
               </div>
               <span style={{fontSize: 12}}>▲</span>
            </div>
            
            <div>
               {courseModules.map((m) => {
                  const acts = courseActivities.filter(a => a.module_id === m.id);
                  return (
                    <div key={m.id}>
                       <div style={{padding: '10px 20px 10px 40px', color: '#444', fontSize: 13, fontWeight: 600, background: '#f9fafb', borderTop: '1px solid #f0f0f0', borderBottom: '1px solid #f0f0f0'}}>
                         📂 {m.title}
                       </div>
                       <div style={{paddingLeft: 40}}>
                         {acts.map(act => {
                           const isDone = completedIds.includes(act.id);
                           return (
                             <div key={act.id} style={{padding: '8px 15px 8px 0', fontSize: 13, display: 'flex', gap: 8, alignItems: 'center', borderBottom: '1px solid #f9f9f9'}}>
                               <span style={{color: isDone ? '#2ecc71' : '#aaa', fontSize: 14}}>{isDone ? '✅' : getActivityIcon(act.type)}</span>
                               <Link href={act.type === 'quiz' ? `/course/${id}/quiz/${act.id}` : act.type === 'scorm' ? `/course/${id}/scorm/${act.id}` : (act.url && !/ex[ae]mple/i.test(act.url) ? act.url : '#')} target={act.type === 'quiz' || act.type === 'scorm' || (act.url && /ex[ae]mple/i.test(act.url)) ? '_self' : '_blank'} style={{color: isDone ? '#2ecc71' : '#555', textDecoration: 'none', fontSize: 13}}>
                                  {act.title}
                               </Link>
                             </div>
                           );
                         })}
                         {acts.length === 0 && <div style={{padding: '6px 0', fontSize: 12, color: '#aaa'}}>Chưa có hoạt động</div>}
                       </div>
                    </div>
                  );
               })}
            </div>
         </div>
      </div>

      {/* MAIN CONTENT */}
      <div style={{flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0}}>
         
         {/* TOP NAVBAR */}
         <div style={{background: '#fff', height: 65, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 30px', borderBottom: '1px solid #e0e0e0', position: 'sticky', top: 0, zIndex: 10}}>
            <div style={{display: 'flex', alignItems: 'center', fontSize: 14, color: '#555'}}>
               <Link href="/dashboard" style={{color: '#003380', textDecoration: 'none'}}>🏠 Trang chủ</Link>
               <span style={{margin: '0 8px', color: '#ccc'}}>/</span>
               <span style={{color: '#003380', fontWeight: 600}}>{course.title}</span>
            </div>
            
            <div style={{display: 'flex', alignItems: 'center', gap: 20}}>
               <div style={{background: '#f0f0f0', borderRadius: 6, width: 250, height: 8, position: 'relative'}}>
                  <div style={{background: progressPct >= 70 ? '#2ecc71' : progressPct >= 40 ? '#f39c12' : '#1a56db', width: `${progressPct}%`, height: '100%', borderRadius: 6, transition: 'width 0.5s'}}></div>
                  <span style={{position: 'absolute', top: -18, right: 0, fontSize: 11, color: '#555', fontWeight: 'bold'}}>{progressPct}%</span>
               </div>
               <Link href="/dashboard" style={{fontSize: 13, color: '#555', textDecoration: 'none', background: '#f0f0f0', padding: '6px 12px', borderRadius: 4}}>← Dashboard</Link>
            </div>
         </div>

         {/* DASHBOARD CONTENT */}
         <div style={{padding: '35px 50px', flex: 1}}>
            
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 30}}>
              <div>
                <h1 style={{fontSize: 26, color: '#003380', fontWeight: 800, margin: '0 0 6px 0'}}>{course.title}</h1>
                <p style={{color: '#888', fontSize: 14, margin: 0}}>Đã ghi danh: {enrollDate}</p>
              </div>
              {nextActivity && (
                <Link 
                  href={nextActivity.type === 'quiz' ? `/course/${id}/quiz/${nextActivity.id}` : nextActivity.type === 'scorm' ? `/course/${id}/scorm/${nextActivity.id}` : (nextActivity.url && !/ex[ae]mple/i.test(nextActivity.url) ? nextActivity.url : '#')}
                  target={nextActivity.type === 'quiz' || nextActivity.type === 'scorm' || (nextActivity.url && /ex[ae]mple/i.test(nextActivity.url)) ? '_self' : '_blank'}
                  style={{background: '#003380', color: '#fff', padding: '12px 25px', borderRadius: 8, textDecoration: 'none', fontWeight: 'bold', fontSize: 14, whiteSpace: 'nowrap'}}
                >
                  ▶ Tiếp Tục Học
                </Link>
              )}
            </div>

            {/* REAL STATS GRID */}
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, marginBottom: 30}}>
               
               {/* Activity breakdown card */}
               <div style={{background: '#fff', border: '1px solid #eee', borderRadius: 12, padding: 25, boxShadow: '0 2px 12px rgba(0,0,0,0.04)'}}>
                  <h4 style={{textAlign: 'center', color: '#333', fontSize: 14, marginBottom: 20, fontWeight: 600}}>Tổng hoạt động: <span style={{color: '#003380', fontWeight: 900, fontSize: 18}}>{totalActivities}</span></h4>
                  
                  <div style={{display: 'flex', justifyContent: 'center', marginBottom: 15}}>
                    {totalActivities > 0 ? (
                      <svg width="140" height="140" viewBox="0 0 32 32" style={{transform: 'rotate(-90deg)', borderRadius: '50%'}}>
                        <circle r="16" cx="16" cy="16" fill="#4d94ff" />
                        {quizCount > 0 && (
                          <circle r="16" cx="16" cy="16" fill="transparent" stroke="#ff4d4d" strokeWidth="32"
                            strokeDasharray={`${(quizCount/totalActivities)*100} 100`} />
                        )}
                      </svg>
                    ) : <div style={{width: 140, height: 140, borderRadius: '50%', background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: 12}}>Chưa có</div>}
                  </div>
                  <div style={{display: 'flex', justifyContent: 'center', gap: 15, fontSize: 12, color: '#666'}}>
                    <span style={{display: 'flex', alignItems: 'center', gap: 5}}><span style={{width: 10, height: 10, borderRadius: '50%', background: '#4d94ff'}}></span>Tài liệu ({resourceCount})</span>
                    <span style={{display: 'flex', alignItems: 'center', gap: 5}}><span style={{width: 10, height: 10, borderRadius: '50%', background: '#ff4d4d'}}></span>Quiz ({quizCount})</span>
                  </div>
               </div>

               {/* Completion card */}
               <div style={{background: '#fff', border: '1px solid #eee', borderRadius: 12, padding: 25, boxShadow: '0 2px 12px rgba(0,0,0,0.04)'}}>
                  <h4 style={{textAlign: 'center', color: '#333', fontSize: 14, marginBottom: 20, fontWeight: 600}}>Đã hoàn thành: <span style={{color: '#2ecc71', fontWeight: 900, fontSize: 18}}>{completedCount}/{totalActivities}</span></h4>
                  
                  <div style={{display: 'flex', justifyContent: 'center', marginBottom: 15}}>
                    {totalActivities > 0 ? (
                      <svg width="140" height="140" viewBox="0 0 32 32" style={{transform: 'rotate(-90deg)', borderRadius: '50%'}}>
                        <circle r="16" cx="16" cy="16" fill="#e0e0e0" />
                        {completedCount > 0 && (
                          <circle r="16" cx="16" cy="16" fill="transparent" stroke="#2ecc71" strokeWidth="32"
                            strokeDasharray={`${progressPct} 100`} />
                        )}
                      </svg>
                    ) : <div style={{width: 140, height: 140, borderRadius: '50%', background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: 12}}>Chưa có</div>}
                  </div>
                  <div style={{display: 'flex', justifyContent: 'center', gap: 15, fontSize: 12, color: '#666'}}>
                    <span style={{display: 'flex', alignItems: 'center', gap: 5}}><span style={{width: 10, height: 10, borderRadius: '50%', background: '#2ecc71'}}></span>Đã xong</span>
                    <span style={{display: 'flex', alignItems: 'center', gap: 5}}><span style={{width: 10, height: 10, borderRadius: '50%', background: '#e0e0e0'}}></span>Chưa xong</span>
                  </div>
               </div>

               {/* Info card */}
               <div style={{background: '#fff', border: '1px solid #eee', borderRadius: 12, padding: 25, boxShadow: '0 2px 12px rgba(0,0,0,0.04)'}}>
                  <h4 style={{color: '#333', fontSize: 14, fontWeight: 600, marginBottom: 20}}>📊 Thống kê học tập</h4>
                  <div style={{display: 'flex', flexDirection: 'column', gap: 15}}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 15px', background: '#f8f9fa', borderRadius: 8}}>
                      <span style={{color: '#555', fontSize: 13}}>Tiến độ tổng</span>
                      <span style={{fontWeight: 800, color: '#003380', fontSize: 16}}>{progressPct}%</span>
                    </div>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 15px', background: '#f8f9fa', borderRadius: 8}}>
                      <span style={{color: '#555', fontSize: 13}}>Bài đã hoàn thành</span>
                      <span style={{fontWeight: 800, color: '#2ecc71', fontSize: 16}}>{completedCount}</span>
                    </div>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 15px', background: '#f8f9fa', borderRadius: 8}}>
                      <span style={{color: '#555', fontSize: 13}}>Còn lại</span>
                      <span style={{fontWeight: 800, color: '#e74c3c', fontSize: 16}}>{totalActivities - completedCount}</span>
                    </div>
                  </div>
               </div>
            </div>

            {/* PROGRESS BAR VISUAL */}
            <div style={{background: '#fff', border: '1px solid #eee', borderRadius: 12, padding: '20px 25px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12}}>
                <h4 style={{color: '#333', fontSize: 14, fontWeight: 600, margin: 0}}>Tiến độ khoá học</h4>
                <span style={{color: '#003380', fontWeight: 800, fontSize: 16}}>{progressPct}%</span>
              </div>
              <div style={{background: '#f0f0f0', borderRadius: 8, height: 14, overflow: 'hidden'}}>
                <div style={{width: `${progressPct}%`, height: '100%', background: 'linear-gradient(90deg, #003380, #2ecc71)', borderRadius: 8, transition: 'width 0.5s ease'}}></div>
              </div>
              <p style={{color: '#888', fontSize: 12, margin: '8px 0 0 0'}}>Hoàn thành {completedCount} / {totalActivities} bài học</p>
            </div>
         </div>
      </div>
    </div>
  );
}
