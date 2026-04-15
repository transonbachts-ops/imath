'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import CalendarBoard from '@/app/dashboard/CalendarBoard';
import EventModal from '@/app/components/EventModal';
import AnalyticsAI from '@/app/components/AnalyticsAI';

export default function TeacherUI({ userId }) {
  const [activeTab, setActiveTab] = useState('courses');
  const [courses, setCourses] = useState([]);
  const [events, setEvents] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [grades, setGrades] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [parentUnread, setParentUnread] = useState(0);
  const [showEventModal, setShowEventModal] = useState(false);
  const [form, setForm] = useState({ date: '', type: 'zoom', title: '', zoom_link: '', course_id: '' });

  useEffect(() => {
    fetchInitialData();
    const interval = setInterval(fetchParentUnread, 15000);
    return () => clearInterval(interval);
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    await Promise.all([
        fetchCourses(),
        fetchEvents(),
        fetchDocuments(),
        fetchEnrollments(),
        fetchGrades(),
        fetchAnalytics(),
        fetchParentUnread()
    ]);
    setLoading(false);
  };

  const fetchParentUnread = async () => {
    try {
      const res = await fetch('/api/parent/messages?student_id=0&other_user_id=0&course_id=0');
      if (res.ok) {
        const data = await res.json();
        setParentUnread(data.unreadCount || 0);
      }
    } catch(e) {}
  };

  const fetchEvents = async () => {
    const res = await fetch('/api/events');
    if (res.ok) {
      const data = await res.json();
      setEvents(data.events || []);
    }
  };

  const fetchCourses = async () => {
    const res = await fetch('/api/admin/courses');
    if (res.ok) {
      const data = await res.json();
      setCourses(data.courses || []);
    }
  };

  const fetchDocuments = async () => {
    const res = await fetch('/api/admin/documents');
    if (res.ok) {
      const data = await res.json();
      setDocuments(data.documents || []);
    }
  };

  const fetchEnrollments = async () => {
    const res = await fetch('/api/admin/enrollments');
    if (res.ok) {
      const data = await res.json();
      setEnrollments(data.enrollments || []);
    }
  };

  const fetchGrades = async () => {
    try { const r = await fetch('/api/admin/grades'); if(r.ok){const d=await r.json(); setGrades(d.grades||[]);} } catch(e){}
  };

  const fetchAnalytics = async () => {
    try { const r = await fetch('/api/admin/analytics'); if(r.ok){const d=await r.json(); setAnalytics(d);} } catch(e){}
  };

  const handleSaveEvent = async (e) => {
    e.preventDefault();
    const method = form.id ? 'PUT' : 'POST';
    const res = await fetch('/api/events', { 
      method, 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify(form) 
    });
    if (res.ok) {
      setForm({ date: '', type: 'zoom', title: '', zoom_link: '', course_id: '' });
      setShowEventModal(false);
      fetchEvents();
    } else {
      const d = await res.json();
      alert(d.error || 'Có lỗi xảy ra');
    }
  };

  const handleEditEvent = (event) => {
    setForm({
      id: event.id,
      date: event.date,
      type: event.type,
      title: event.title,
      zoom_link: event.zoom_link || '',
      course_id: event.course_id || ''
    });
    setShowEventModal(true);
  };

  const handleDeleteEvent = async (id) => {
    if (!confirm('Xóa sự kiện lớp học này?')) return;
    const res = await fetch('/api/events', { 
      method: 'DELETE', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ id }) 
    });
    if (res.ok) fetchEvents();
    else {
      const d = await res.json();
      alert(d.error || 'Có lỗi xảy ra');
    }
  };

  const exportGrades = () => {
    if (grades.length === 0) { alert('Không có điểm để xuất'); return; }
    const headers = ['Học sinh', 'Email', 'Khoá học', 'Bài kiểm tra', 'Điểm', 'Ngày nộp'];
    const rows = grades.map(g => [g.student_name, g.student_email, g.course_name, g.activity_name, g.score, new Date(g.submitted_at).toLocaleString('vi-VN')]);
    const csvContent = [headers, ...rows].map(r => r.map(c => '"' + String(c||'').replace(/"/g,'""') + '"').join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], {type: 'text/csv;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'diem_hoc_sinh_imath.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const sidebarLinks = [
    { id: 'courses', label: 'Khóa học', icon: '📚' },
    { id: 'events', label: 'Lịch dạy', icon: '📅' },
    { id: 'documents', label: 'Tài liệu', icon: '📂' },
    { id: 'grades', label: 'Bảng điểm', icon: '🏆' },
    { id: 'studio', label: 'iMath Studio', icon: '🕹️', link: '/studio' },
    { id: 'messages', label: 'Tin nhắn', icon: '💬', link: '/messages', badge: parentUnread }
  ];

  if (loading) return <div style={{padding: 50, color: '#444', textAlign: 'center', background: '#f5f7fa', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 'bold'}}>✨ Đang chuẩn bị không gian làm việc...</div>;

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh', display: 'flex', fontFamily: 'Inter, system-ui, sans-serif' }}>
      
      {/* SIDEBAR */}
      <aside style={{ width: '280px', background: '#1e293b', color: '#fff', padding: '40px 24px', display: 'flex', flexDirection: 'column', position: 'fixed', height: '100vh', zIndex: 100 }}>
        <div style={{ marginBottom: '50px', display: 'flex', alignItems: 'center', gap: '12px' }}>
           <div style={{ width: '40px', height: '40px', background: '#3b82f6', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>👨‍🏫</div>
           <span style={{ fontSize: '20px', fontWeight: '900', background: 'linear-gradient(to right, #60a5fa, #fff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Teacher Hub</span>
        </div>

        {/* Improved Back Button at the Top */}
        <Link href="/dashboard" style={{ 
          display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 18px', borderRadius: '14px',
          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
          color: '#cbd5e1', textDecoration: 'none', fontSize: '14px', fontWeight: '600',
          marginBottom: '30px', transition: '0.2s'
        }}>
          ← Quay lại trang học
        </Link>

        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
           {sidebarLinks.map(item => (
              item.link ? (
                <Link key={item.id} href={item.link} style={{ textDecoration: 'none' }}>
                  <div style={navItemStyle(false)}>
                    <span>{item.icon}</span> {item.label}
                    {item.badge > 0 && <span style={badgeStyle}>{item.badge}</span>}
                  </div>
                </Link>
              ) : (
                <button 
                  key={item.id} 
                  onClick={() => setActiveTab(item.id)}
                  style={navItemStyle(activeTab === item.id)}
                >
                  <span>{item.icon}</span> {item.label}
                </button>
              )
           ))}
        </nav>
      </aside>

      {/* MAIN CONTENT */}
      <main style={{ flex: 1, marginLeft: '280px', padding: '40px 60px' }}>
        
        {/* SUMMARY STRIP */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '25px', marginBottom: '40px' }}>
           <SummaryCard title="Khóa học" value={courses.length} icon="📘" color="#3b82f6" />
           <SummaryCard title="Học sinh" value={enrollments.length} icon="👥" color="#10b981" />
           <SummaryCard title="Bài kiểm tra" value={grades.length} icon="📝" color="#f59e0b" />
           <SummaryCard title="Tài liệu" value={documents.length} icon="📂" color="#8b5cf6" />
        </div>

        {/* TAB VIEWS */}
        {activeTab === 'courses' && (
          <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
               <h2 style={{ fontSize: '28px', fontWeight: '900', color: '#0f172a' }}>Khóa học của tôi</h2>
               <Link href="/admin/course/manage/new" style={primaryBtnStyle}>+ Tạo khóa mới</Link>
            </div>
            <div style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', display: 'grid', gap: '25px' }}>
               {courses.map(c => <CourseCard key={c.id} course={c} />)}
            </div>
          </div>
        )}

        {activeTab === 'events' && (
          <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <h2 style={{ fontSize: '28px', fontWeight: '900', color: '#0f172a' }}>Lịch giảng dạy chi tiết</h2>
                <button onClick={() => setShowEventModal(true)} style={primaryBtnStyle}>+ Thêm lịch học</button>
             </div>
             <div style={{ background: '#fff', borderRadius: '24px', padding: '30px', boxShadow: '0 10px 40px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9', marginBottom: '40px' }}>
                <CalendarBoard variant="full" />
             </div>
             <div style={{ background: '#fff', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.02)', border: '1px solid #e2e8f0' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ background: '#f8fafc' }}>
                    <tr style={{ textAlign: 'left' }}>
                      <th style={thStyle}>Ngày</th>
                      <th style={thStyle}>Hình Thức</th>
                      <th style={thStyle}>Tiêu Đề</th>
                      <th style={thStyle}>Link / Phòng</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map(e => (
                      <EventRow 
                        key={e.id} 
                        event={e} 
                        courseTitle={courses.find(c => c.id === e.course_id)?.title} 
                        onEdit={() => handleEditEvent(e)}
                        onDelete={() => handleDeleteEvent(e.id)}
                      />
                    ))}
                  </tbody>
                </table>
             </div>
          </div>
        )}

        {activeTab === 'documents' && (
           <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
              <h2 style={{ fontSize: '28px', fontWeight: '900', color: '#0f172a', marginBottom: '30px' }}>Kho tài liệu & Ấn phẩm</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '25px' }}>
                {documents.map(d => <DocCard key={d.id} doc={d} />)}
              </div>
           </div>
        )}

        {activeTab === 'grades' && (
           <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <h2 style={{ fontSize: '28px', fontWeight: '900', color: '#0f172a' }}>Báo cáo điểm học sinh</h2>
                <button onClick={exportGrades} style={{ ...primaryBtnStyle, background: '#f39c12' }}>📥 Xuất Excel (CSV)</button>
              </div>

              {/* Statistical Charts Strip */}
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 320px)', gap: '25px', marginBottom: '40px' }}>
                <div style={{ background: '#fff', padding: '30px', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#1e293b', marginBottom: '25px', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span>📊</span> Phân tích học lực (Tiêu chuẩn)
                  </h3>
                  <div style={{ height: '180px', display: 'flex', alignItems: 'flex-end', gap: '40px', padding: '0 20px 20px 20px', borderBottom: '1px solid #f1f5f9' }}>
                    {['Giỏi', 'Khá/Trung bình', 'Yếu'].map((level, idx) => {
                      const count = grades.filter(g => {
                        const s = g.score;
                        if (level === 'Giỏi') return s >= 8;
                        if (level === 'Khá/Trung bình') return s >= 5 && s < 8;
                        return s < 5;
                      }).length;
                      const max = Math.max(grades.length, 1);
                      const percentage = (count / max) * 100;
                      const colors = ['#10b981', '#f59e0b', '#ef4444'];
                      
                      return (
                        <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                           <div style={{ fontSize: '13px', fontWeight: '800', color: colors[idx] }}>{count} em</div>
                           <div style={{ width: '100%', height: `${Math.max(percentage, 5)}%`, background: colors[idx], borderRadius: '6px 6px 2px 2px', transition: 'height 1s ease' }}></div>
                           <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b' }}>{level}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', padding: '25px', borderRadius: '24px', color: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ fontSize: '40px', marginBottom: '15px' }}>💡</div>
                  <h4 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '10px' }}>Gợi ý sư phạm</h4>
                  <p style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: 1.6 }}>
                    Dựa trên dữ liệu, lớp đang có <b>{Math.round((grades.filter(g => g.score >= 8).length / Math.max(grades.length, 1)) * 100)}%</b> học sinh đạt loại Giỏi. 
                    Hãy chú trọng hỗ trợ nhóm học sinh ở mức <b>Yêu</b> để cải thiện đồng đều kết quả.
                  </p>
                </div>
              </div>

               {analytics && (
                 <div style={{ marginBottom: '40px' }}>
                    <div style={{ background: '#fff', borderRadius: '24px', padding: '35px', border: '1px solid #e2e8f0', marginBottom: '30px' }}>
                       <h3 style={{ fontSize: '20px', fontWeight: '900', color: '#1e293b', marginBottom: '25px' }}>📊 Phổ điểm học sinh (1-10)</h3>
                       <ScoreDistributionChart data={analytics.scoreDistribution} />
                    </div>
                    <AnalyticsAI analytics={analytics} />
                 </div>
               )}

              <div style={{ background: '#fff', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
                 <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ background: '#f8fafc' }}>
                       <tr>
                          <th style={thStyle}>Học sinh</th>
                          <th style={thStyle}>Khóa học / Bài tập</th>
                          <th style={{ ...thStyle, textAlign: 'center' }}>Điểm</th>
                          <th style={{ ...thStyle, textAlign: 'right' }}>Thời gian nộp</th>
                       </tr>
                    </thead>
                    <tbody>
                       {grades.length > 0 ? grades.map((g, i) => <GradeRow key={i} grade={g} />) : (
                         <tr><td colSpan="4" style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>Chưa có dữ liệu điểm số nào.</td></tr>
                       )}
                    </tbody>
                 </table>
              </div>
           </div>
        )}

      </main>

      {showEventModal && (
        <EventModal 
          courses={courses} 
          form={form} 
          setForm={setForm} 
          onSave={handleSaveEvent} 
          onClose={() => { setShowEventModal(false); setForm({ date: '', type: 'zoom', title: '', zoom_link: '', course_id: '' }); }} 
          isEditing={!!form.id}
        />
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

// PREMIUM SVG DISTRIBUTION CHART COMPONENT (Histogram)
const ScoreDistributionChart = ({ data }) => {
  if (!data || data.length === 0) return <div style={{ textAlign: 'center', color: '#94a3b8', padding: '100px 0' }}>Chưa đủ dữ liệu biểu đồ</div>;
  
  const height = 280;
  const width = 700;
  const paddingX = 50;
  const paddingY = 40;

  const maxCount = Math.max(...data.map(d => d.count), 1);
  const chartHeight = height - 2 * paddingY;
  const chartWidth = width - 2 * paddingX;
  const barWidth = (chartWidth / data.length) * 0.8;
  const gap = (chartWidth / data.length) * 0.2;

  return (
    <div style={{ position: 'relative', width: '100%', overflowX: 'auto', padding: '10px 0' }} className="no-scrollbar">
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', minWidth: '600px', height: 'auto' }}>
        <defs>
          <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#60a5fa" />
          </linearGradient>
          <filter id="shadow">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.1" />
          </filter>
        </defs>
        
        {/* Y Axis Grid & Labels */}
        {[...Array(5)].map((_, i) => {
          const val = Math.round((maxCount / 4) * i);
          const y = height - paddingY - (val * chartHeight / maxCount);
          return (
            <g key={i}>
              <line x1={paddingX} y1={y} x2={width - paddingX} y2={y} stroke="#f1f5f9" strokeWidth="1" />
              <text x={paddingX - 15} y={y + 4} fontSize="11" fontWeight="800" fill="#94a3b8" textAnchor="end">{val}</text>
            </g>
          );
        })}

        {/* X Axis Line */}
         <line x1={paddingX} y1={height - paddingY} x2={width - paddingX} y2={height - paddingY} stroke="#e2e8f0" strokeWidth="2" />

        {/* BARS */}
        {data.map((d, i) => {
           const barH = (d.count * chartHeight) / maxCount;
           const x = paddingX + i * (barWidth + gap) + gap / 2;
           const y = height - paddingY - barH;
           return (
             <g key={i} style={{ cursor: 'pointer' }}>
                <rect 
                  x={x} y={y} width={barWidth} height={barH} 
                  fill={d.count > 0 ? "url(#barGradient)" : "#f1f5f9"} 
                  rx="6" style={{ filter: 'url(#shadow)', transition: '0.3s' }}
                />
                <text x={x + barWidth/2} y={height - 15} fontSize="12" fontWeight="900" fill="#64748b" textAnchor="middle">{d.score}</text>
                {d.count > 0 && (
                  <text x={x + barWidth/2} y={y - 8} fontSize="11" fontWeight="900" fill="#1e293b" textAnchor="middle">{d.count}</text>
                )}
             </g>
           );
        })}
      </svg>
    </div>
  );
};

// Sub-components & Styles
const navItemStyle = (active) => ({
  width: '100%', padding: '14px 18px', borderRadius: '14px', border: 'none', textAlign: 'left', cursor: 'pointer',
  background: active ? '#3b82f6' : 'transparent',
  color: active ? '#fff' : '#cbd5e1', fontSize: '15px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '15px',
  transition: '0.2s', position: 'relative'
});

const badgeStyle = {
  position: 'absolute', right: '15px', background: '#ef4444', color: '#fff', fontSize: '11px', 
  padding: '2px 8px', borderRadius: '10px', fontWeight: '900'
};

const SummaryCard = ({ title, value, icon, color }) => (
  <div style={{ background: '#fff', padding: '25px', borderRadius: '24px', boxShadow: '0 4px 15px rgba(0,0,0,0.02)', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '20px' }}>
    <div style={{ width: '50px', height: '50px', borderRadius: '15px', background: color + '15', color: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>{icon}</div>
    <div>
      <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}>{title}</div>
      <div style={{ fontSize: '24px', fontWeight: '900', color: '#1e293b' }}>{value}</div>
    </div>
  </div>
);

const CourseCard = ({ course }) => (
  <div style={{ background: '#fff', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.03)', border: '1px solid #e2e8f0', transition: '0.3s' }}>
    <div style={{ height: '160px', background: course.image_url ? `url('${course.image_url}') center/cover` : '#f1f5f9' }} />
    <div style={{ padding: '25px' }}>
      <h4 style={{ fontSize: '19px', fontWeight: '800', color: '#1e293b', marginBottom: '10px' }}>{course.title}</h4>
      <p style={{ fontSize: '14px', color: '#64748b', lineHeight: 1.5, marginBottom: '20px', height: '42px', overflow: 'hidden' }}>{course.description}</p>
      <Link href={`/admin/course/manage/${course.id}`} style={{ display: 'block', textAlign: 'center', background: '#3b82f6', color: '#fff', padding: '12px', borderRadius: '12px', textDecoration: 'none', fontWeight: '700', fontSize: '14px' }}>
        ⚙️ Quản lý bài giảng
      </Link>
    </div>
  </div>
);

const DocCard = ({ doc }) => (
  <div style={{ background: '#fff', borderRadius: '24px', padding: '25px', boxShadow: '0 10px 30px rgba(0,0,0,0.03)', border: '1px solid #e2e8f0', display: 'flex', gap: '20px', alignItems: 'center' }}>
    <div style={{ width: '80px', height: '110px', background: doc.cover_image_url ? `url('${doc.cover_image_url}') center/cover` : '#f1f5f9', borderRadius: '8px', flexShrink: 0 }} />
    <div>
      <h4 style={{ fontSize: '16px', fontWeight: '800', color: '#1e293b', marginBottom: '8px' }}>{doc.title}</h4>
      <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '0' }}>{doc.introduction?.substring(0, 60)}...</p>
    </div>
  </div>
);

const EventRow = ({ event, courseTitle, onEdit, onDelete }) => (
  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
    <td style={{ ...tdStyle, fontWeight: 'bold' }}>{new Date(event.date).toLocaleDateString('vi-VN')}</td>
    <td style={tdStyle}>
       <span style={{ color: event.type === 'zoom' ? '#3b82f6' : '#10b981', background: (event.type === 'zoom' ? '#3b82f6' : '#10b981') + '15', padding: '4px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: '800' }}>
         {event.type === 'zoom' ? '📹 ZOOM ONLINE' : '📝 BÀI TẬP VỀ NHÀ'}
       </span>
    </td>
    <td style={tdStyle}>
       <div style={{ fontWeight: '700', color: '#1e293b' }}>{event.title}</div>
       <div style={{ fontSize: '12px', color: '#94a3b8' }}>{courseTitle || 'Chung'}</div>
    </td>
    <td style={tdStyle}>
       {event.zoom_link ? <a href={event.zoom_link} target="_blank" rel="noreferrer" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: 'bold' }}>🔗 Vào phòng ngay</a> : '---'}
    </td>
    <td style={{ ...tdStyle, textAlign: 'right' }}>
       <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onEdit} style={{ background: 'none', border: 'none', color: '#3b82f6', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}>Sửa</button>
          <button onClick={onDelete} style={{ background: 'none', border: 'none', color: '#ef4444', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}>Xóa</button>
       </div>
    </td>
  </tr>
);

const GradeRow = ({ grade }) => (
  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
    <td style={tdStyle}>
       <div style={{ fontWeight: '800', color: '#1e293b' }}>{grade.student_name}</div>
       <div style={{ fontSize: '11px', color: '#94a3b8' }}>{grade.student_email}</div>
    </td>
    <td style={tdStyle}>
       <div style={{ fontSize: '14px', color: '#444', fontWeight: '600' }}>{grade.course_name}</div>
       <div style={{ fontSize: '12px', color: '#64748b' }}>{grade.activity_name}</div>
    </td>
    <td style={{ ...tdStyle, textAlign: 'center' }}>
       <span style={{ background: grade.score >= 5 ? '#f0fdf4' : '#fef2f2', color: grade.score >= 5 ? '#16a34a' : '#ef4444', padding: '6px 12px', borderRadius: '12px', fontWeight: '900', fontSize: '16px' }}>
         {Number(grade.score).toFixed(1)}
       </span>
    </td>
    <td style={{ ...tdStyle, textAlign: 'right', color: '#64748b', fontSize: '13px' }}>
       {new Date(grade.submitted_at).toLocaleString('vi-VN')}
    </td>
  </tr>
);

const thStyle = { padding: '18px 25px', color: '#64748b', fontSize: '12px', fontWeight: '800', textTransform: 'uppercase' };
const tdStyle = { padding: '18px 25px', verticalAlign: 'middle' };
const primaryBtnStyle = { background: '#3b82f6', color: '#fff', border: 'none', padding: '12px 25px', borderRadius: '14px', fontWeight: 'bold', textDecoration: 'none', transition: '0.2s', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' };
