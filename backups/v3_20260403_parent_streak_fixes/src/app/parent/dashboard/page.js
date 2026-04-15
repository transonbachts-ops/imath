'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
export default function ParentDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [viewingDetails, setViewingDetails] = useState(null);
  useEffect(() => {
    // Auth check
    fetch('/api/me').then(r => r.json()).then(me => {
      if (!me || me.role !== 'parent') {
        router.push('/parent/login');
        return;
      }
      loadDashboard();
    });
  }, []);

  const loadDashboard = async () => {
    try {
      const res = await fetch('/api/parent/dashboard');
      if (!res.ok) { setError('Không tải được dữ liệu.'); setLoading(false); return; }
      const d = await res.json();
      setData(d);
    } catch(e) { setError(e.message); }
    setLoading(false);
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/parent/login');
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#f0f4ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ textAlign: 'center', color: '#003380' }}>
        <div style={{ fontSize: 40, marginBottom: 15 }}>👨‍👩‍👧</div>
        <div style={{ fontWeight: 700 }}>Đang tải thông tin học sinh...</div>
      </div>
    </div>
  );

  const { student, courses = [], quizScores = [], alerts = [], unreadMessages = 0 } = data || {};

  if (!student && data !== null) {
    return (
      <div style={{ padding: 40, fontFamily: 'Inter, system-ui, sans-serif', minHeight: '100vh', background: '#f0f4ff' }}>
        <div style={{ maxWidth: 500, margin: '60px auto', background: '#fff', padding: 40, borderRadius: 24, boxShadow: '0 10px 40px rgba(0,0,0,0.05)', textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 20 }}>🔗</div>
          <h2 style={{ fontSize: 24, fontWeight: 900, color: '#003380', marginBottom: 15 }}>Chưa liên kết học sinh</h2>
          <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.6, marginBottom: 30 }}>Bạn cần liên kết tài khoản với con mình bằng **Mã mời** (Invite Code) để có thể xem báo cáo và quá trình học tập.</p>
          
          <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
            <input 
              type="text" 
              placeholder="Nhập mã mời (Vd: Q4PTLQEH)..." 
              id="inviteInput"
              style={{ flex: 1, padding: '14px 20px', borderRadius: 12, border: '1.5px solid #eee', outline: 'none' }} 
            />
            <button 
              onClick={async () => {
                const code = document.getElementById('inviteInput').value;
                if (!code) return alert('Vui lòng nhập mã mời');
                const res = await fetch('/api/parent/link', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ inviteCode: code })
                });
                const d = await res.json();
                if (res.ok) { window.location.reload(); } else { alert(d.error || 'Lỗi liên kết'); }
              }}
              style={{ background: '#003380', color: '#fff', border: 'none', padding: '0 25px', borderRadius: 12, fontWeight: 800, cursor: 'pointer' }}
            >
              Liên kết
            </button>
          </div>
          <p style={{ fontSize: 12, color: '#94a3b8' }}>Mã mời có thể tìm thấy trong phần Hồ sơ của tài khoản học sinh.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4ff', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* NAVBAR */}
      <nav style={{
        background: '#003380', color: '#fff', padding: '0 40px', height: 66,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        boxShadow: '0 4px 20px rgba(0,51,128,0.25)', position: 'sticky', top: 0, zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <span style={{ fontSize: 24, fontWeight: 900, letterSpacing: -1, color: '#fff' }}>
            iMath<span style={{ color: '#fff' }}>.</span>
          </span>
          <span style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 700, letterSpacing: 1 }}>
            PHỤ HUYNH
          </span>
        </div>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          <Link href="/parent/profile" style={{ color: '#fff', textDecoration: 'none', fontSize: 13, fontWeight: 600, opacity: 0.8 }}>⚙️ Cài đặt</Link>
          {student && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff', color: '#003380', padding: '6px 14px', borderRadius: 20, boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#cc0000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, overflow: 'hidden', color: '#fff' }}>
                {student.avatar_url ? <img src={student.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="s" /> : '👤'}
              </div>
              <span style={{ fontSize: 13, fontWeight: 800 }}>Con: {student.full_name}</span>
            </div>
          )}
          <button onClick={handleLogout} style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', padding: '7px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
            Đăng xuất
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '35px 20px' }}>

        {error && <div style={{ background: '#ffebee', color: '#c62828', padding: 16, borderRadius: 12, marginBottom: 20, fontWeight: 600 }}>{error}</div>}

        {/* ALERTS BANNER */}
        {alerts.length > 0 && (
          <div style={{ marginBottom: 30 }}>
            <h2 style={{ fontSize: 15, fontWeight: 800, color: '#cc0000', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              🔔 Hộp thư cảnh báo ({alerts.length})
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {alerts.map((alert, i) => (
                <div key={i} style={{
                  background: alert.severity === 'warning' ? '#fff5f5' : '#f0f7ff',
                  border: `1px solid ${alert.severity === 'warning' ? '#ffcccc' : '#c5d8ff'}`,
                  padding: '13px 18px', borderRadius: 12, display: 'flex', alignItems: 'flex-start', gap: 12
                }}>
                  <span style={{ fontSize: 20 }}>{alert.icon}</span>
                  <div>
                    <div style={{ fontWeight: 700, color: alert.severity === 'warning' ? '#cc0000' : '#003380', fontSize: 14 }}>{alert.message}</div>
                    {alert.time && <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>{new Date(alert.time).toLocaleDateString('vi-VN')}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
          {/* STUDENT CARD */}
          <div style={{ background: '#fff', borderRadius: 20, padding: '28px 30px', boxShadow: '0 4px 20px rgba(0,51,128,0.06)', border: '1px solid #e8eeff' }}>
            <h2 style={{ fontSize: 14, fontWeight: 800, color: '#888', marginBottom: 18, textTransform: 'uppercase', letterSpacing: 1 }}>👤 Thông tin học sinh</h2>
            {student ? (
              <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                <div style={{ width: 70, height: 70, borderRadius: '50%', background: '#003380', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, overflow: 'hidden', flexShrink: 0 }}>
                  {student.avatar_url ? <img src={student.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="s" /> : '👤'}
                </div>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#003380' }}>{student.full_name}</div>
                  <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>{student.email}</div>
                  <div style={{ marginTop: 8, display: 'inline-block', background: '#e3f2fd', color: '#003380', padding: '3px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>Học sinh</div>
                </div>
              </div>
            ) : <div style={{ color: '#aaa' }}>Chưa có thông tin liên kết.</div>}
          </div>

          {/* QUIZ SCORES */}
          <div style={{ background: '#fff', borderRadius: 20, padding: '28px 30px', boxShadow: '0 4px 20px rgba(0,51,128,0.06)', border: '1px solid #e8eeff' }}>
            <h2 style={{ fontSize: 14, fontWeight: 800, color: '#888', marginBottom: 15, textTransform: 'uppercase', letterSpacing: 1 }}>📊 Điểm số gần nhất</h2>
            {quizScores.length === 0 ? (
              <div style={{ color: '#aaa', fontSize: 13, textAlign: 'center', padding: '30px 0' }}>Chưa có bài kiểm tra nào.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {quizScores.slice(0, 5).map((s, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 15px', borderRadius: 10, background: s.score < 50 ? '#fff5f5' : s.score >= 80 ? '#f0fff4' : '#f8faff' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: '#333', display: 'flex', gap: 6, alignItems: 'center' }}>
                         {s.quiz_name}
                         {s.type === 'daily' && <span style={{background: '#e3f2fd', color: '#1565c0', fontSize: 10, padding: '2px 6px', borderRadius: 4}}>Hàng Ngày</span>}
                      </div>
                      <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>{s.course_name} • {new Date(s.submitted_at).toLocaleDateString('vi-VN')}</div>
                      {s.details_json && (
                         <button onClick={() => setViewingDetails(s)} style={{marginTop: 6, background: 'none', border: 'none', color: '#003380', fontSize: 12, fontWeight: 700, cursor: 'pointer', padding: 0}}>🔍 Xem chi tiết đáp án</button>
                      )}
                    </div>
                    <span style={{
                      fontWeight: 900, fontSize: 18,
                      color: s.score < 50 ? '#cc0000' : s.score >= 80 ? '#15803d' : '#003380'
                    }}>{s.score}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* COURSE PROGRESS */}
        <div style={{ background: '#fff', borderRadius: 20, padding: '28px 30px', boxShadow: '0 4px 20px rgba(0,51,128,0.06)', border: '1px solid #e8eeff', marginBottom: 20 }}>
          <h2 style={{ fontSize: 14, fontWeight: 800, color: '#888', marginBottom: 20, textTransform: 'uppercase', letterSpacing: 1 }}>📚 Tiến độ học tập</h2>
          {courses.length === 0 ? (
            <div style={{ color: '#aaa', fontSize: 13, textAlign: 'center', padding: '30px 0' }}>Học sinh chưa tham gia khóa học nào.</div>
          ) : courses.map((c, i) => (
            <div key={i} style={{ marginBottom: 20, paddingBottom: 20, borderBottom: i < courses.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div>
                  <Link href={`/parent/course/${c.course_id}`} style={{ fontWeight: 800, fontSize: 16, color: '#003380', textDecoration: 'none', display: 'block' }}>
                    {c.course_title}
                  </Link>
                  <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>GV: {c.teacher_name || 'Chưa phân công'}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontWeight: 900, fontSize: 22, color: c.progress_pct >= 80 ? '#15803d' : c.progress_pct >= 50 ? '#003380' : '#cc0000' }}>
                    {c.progress_pct}%
                  </span>
                  <Link
                    href="/messages"
                    style={{
                      background: '#f0f4ff', color: '#003380', border: '1px solid #003380', padding: '6px 14px', borderRadius: 8,
                      cursor: 'pointer', fontSize: 12, fontWeight: 700, transition: '0.2s', textDecoration: 'none', display: 'inline-block'
                    }}
                  >
                    💬 Nhắn GV
                  </Link>
                </div>
              </div>
              {/* PROGRESS BAR */}
              <div style={{ background: '#f0f0f0', borderRadius: 10, height: 10, overflow: 'hidden' }}>
                <div style={{
                  width: `${c.progress_pct}%`, height: '100%',
                  background: c.progress_pct >= 80 ? 'linear-gradient(90deg, #15803d, #22c55e)' : c.progress_pct >= 50 ? 'linear-gradient(90deg, #003380, #1a56db)' : 'linear-gradient(90deg, #cc0000, #ef4444)',
                  borderRadius: 10, transition: 'width 1s ease'
                }} />
              </div>
              <div style={{ fontSize: 11, color: '#888', marginTop: 5 }}>
                {c.done_activities}/{c.total_activities} hoạt động đã hoàn thành
              </div>
            </div>
          ))}
        </div>

        {/* ALL COURSES (Read-only) */}
        <AllCourses />

        {/* DETAILS MODAL */}
        {viewingDetails && (
          <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(3px)'}}>
             <div style={{background: '#fff', borderRadius: 16, padding: 30, width: 600, maxHeight: '80vh', overflowY: 'auto'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20}}>
                   <h2 style={{fontSize: 20, color: '#003380', fontWeight: 800}}>Chi Tiết Bài Làm</h2>
                   <button onClick={() => setViewingDetails(null)} style={{background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#888'}}>×</button>
                </div>
                <div style={{marginBottom: 15, background: '#f8f9fa', padding: 15, borderRadius: 12}}>
                   <div style={{fontWeight: 700, fontSize: 14}}>{viewingDetails.quiz_name}</div>
                   <div style={{fontSize: 12, color: '#666', marginTop: 4}}>{viewingDetails.course_name}</div>
                </div>
                {(() => {
                   let details = {};
                   try { details = JSON.parse(viewingDetails.details_json); } catch(e) {}
                   const dKeys = Object.keys(details);
                   if (dKeys.length === 0) return <p style={{color: '#888', fontStyle: 'italic'}}>Không có chi tiết từng câu.</p>;
                   return (
                     <div style={{display: 'flex', flexDirection: 'column', gap: 10}}>
                        {dKeys.map((k, i) => {
                           const ans = details[k];
                           let opts = {};
                           if (ans.options_json) {
                             if (typeof ans.options_json === 'string') {
                               try { opts = JSON.parse(ans.options_json); } catch(e) {}
                             } else {
                               opts = ans.options_json;
                             }
                           }
                           return (
                             <div key={k} style={{padding: '16px 20px', border: '1px solid #eee', borderRadius: 12, background: ans.isCorrect ? '#f0fff4' : '#fff5f5'}}>
                                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12}}>
                                  <div style={{fontWeight: 800, fontSize: 15, color: '#003380'}}>Câu {i+1}</div>
                                  <span style={{background: '#e2e8f0', padding: '3px 8px', borderRadius: 6, fontSize: 11, color: '#475569', fontWeight: 600}}>{ans.tag}</span>
                                </div>
                                {ans.question_text && (
                                  <div style={{fontWeight: 600, fontSize: 14, color: '#334155', marginBottom: 12, lineHeight: 1.5}}>
                                    {ans.question_text}
                                  </div>
                                )}
                                {Object.keys(opts).length > 0 && (
                                  <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12}}>
                                    {['A', 'B', 'C', 'D'].filter(opt => opts[opt]).map(opt => (
                                      <div key={opt} style={{fontSize: 13, color: '#475569', padding: '6px 10px', background: 'rgba(255,255,255,0.6)', borderRadius: 6, border: '1px solid #e2e8f0'}}>
                                        <b style={{color: '#1e293b'}}>{opt}.</b> {opts[opt]}
                                      </div>
                                    ))}
                                  </div>
                                )}
                                <div style={{display: 'flex', gap: 20, paddingTop: 12, borderTop: '1px dashed #cbd5e1', fontSize: 14}}>
                                  <div style={{color: ans.isCorrect ? '#15803d' : '#cc0000', fontWeight: 700}}>Học sinh chọn: {ans.studentAnswer}</div>
                                  {!ans.isCorrect && <div style={{color: '#15803d', fontWeight: 700}}>Đáp án đúng: {ans.correctAnswer}</div>}
                                </div>
                             </div>
                           )
                        })}
                     </div>
                   );
                })()}
             </div>
          </div>
        )}

      </div>
    </div>
  );
}

function AllCourses() {
  const [courses, setCourses] = useState([]);
  useEffect(() => {
    fetch('/api/admin/courses').then(r => r.ok ? r.json() : {}).then(d => setCourses(d.courses || []));
  }, []);

  if (!courses.length) return null;
  return (
    <div style={{ background: '#fff', borderRadius: 20, padding: '28px 30px', boxShadow: '0 4px 20px rgba(0,51,128,0.06)', border: '1px solid #e8eeff' }}>
      <h2 style={{ fontSize: 14, fontWeight: 800, color: '#888', marginBottom: 20, textTransform: 'uppercase', letterSpacing: 1 }}>🏫 Tất cả khóa học</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
        {courses.map(c => (
          <Link href={`/parent/course/${c.id}`} key={c.id} style={{ border: '1px solid #eee', borderRadius: 14, overflow: 'hidden', transition: '0.2s', textDecoration: 'none', display: 'block' }}>
            <div style={{ height: 120, background: c.image_url ? `url('${c.image_url}') center / cover` : '#e0e8ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {!c.image_url && <div style={{ fontSize: 32 }}>📚</div>}
            </div>
            <div style={{ padding: '14px 16px' }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#333', marginBottom: 5, lineHeight: 1.3 }}>{c.title}</div>
              <div style={{ fontSize: 11, color: '#888', lineHeight: 1.4 }}>{c.description?.substring(0, 70)}...</div>
              <div style={{ marginTop: 10, fontSize: 11, color: '#003380', fontWeight: 600 }}>👁️ Xem nội dung</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
