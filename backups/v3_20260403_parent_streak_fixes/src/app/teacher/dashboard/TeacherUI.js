'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function TeacherUI({ userId }) {
  const [tab, setTab] = useState('courses');
  const [courses, setCourses] = useState([]);
  const [events, setEvents] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [parentUnread, setParentUnread] = useState(0);

  useEffect(() => {
    fetchCourses();
    fetchEvents();
    fetchDocuments();
    fetchEnrollments();
    fetchGrades();
    fetchParentUnread();
    const interval = setInterval(fetchParentUnread, 15000);
    return () => clearInterval(interval);
  }, []);

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
    setLoading(false);
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

  // Status Handlers
  const handleEnrollmentStatus = async (id, status) => {
    await fetch('/api/admin/enrollments', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status })
    });
    fetchEnrollments();
  };

  if (loading) return <div style={{padding: 50, color: '#444', textAlign: 'center', background: '#f5f7fa', height: '100vh'}}>Khởi tạo dữ liệu Quản Trị...</div>;

  return (
    <div style={{background: '#f5f7fa', minHeight: '100vh', padding: '40px', color: '#2c3e50', fontFamily: 'system-ui, sans-serif'}}>
      <div className="container" style={{maxWidth: 1300}}>
        
        {/* TITLE BAR */}
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20}}>
          <h2 style={{fontSize: 32, fontWeight: 900}}>
            <span style={{color: '#003380'}}>H2bmath</span> Khu Vực Giảng Viên
          </h2>
          <div style={{display: 'flex', gap: 12, alignItems: 'center'}}>
            <Link href="/messages" style={{background: '#003380', color: '#fff', padding: '10px 20px', borderRadius: 8, fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none'}}>
              💬 Tin Nhắn Phụ Huynh {parentUnread > 0 ? `(${parentUnread})` : ''}
            </Link>
            <Link href="/dashboard" style={{padding: '10px 25px', background: '#eee', borderRadius: 8, color: '#333', textDecoration: 'none', fontWeight: 'bold'}}>← Về Trang Học</Link>
          </div>
        </div>

        {/* TABS */}
        <div style={{display: 'flex', gap: 10, marginBottom: 30, flexWrap: 'wrap'}}>
          <button onClick={() => setTab('courses')} style={{padding: '10px 20px', fontWeight: 'bold', background: tab === 'courses' ? '#003380' : '#fff', color: tab === 'courses' ? '#fff' : '#666', border: '1px solid #e0e0e0', borderRadius: 8, cursor: 'pointer'}}>📚 Khoá học</button>
          <button onClick={() => setTab('events')} style={{padding: '10px 20px', fontWeight: 'bold', background: tab === 'events' ? '#003380' : '#fff', color: tab === 'events' ? '#fff' : '#666', border: '1px solid #e0e0e0', borderRadius: 8, cursor: 'pointer'}}>📅 Lịch dạy</button>
          <button onClick={() => setTab('documents')} style={{padding: '10px 20px', fontWeight: 'bold', background: tab === 'documents' ? '#e74c3c' : '#fff', color: tab === 'documents' ? '#fff' : '#666', border: '1px solid #e0e0e0', borderRadius: 8, cursor: 'pointer'}}>📂 Tài liệu</button>
          <button onClick={() => setTab('grades')} style={{padding: '10px 20px', fontWeight: 'bold', background: tab === 'grades' ? '#f39c12' : '#fff', color: tab === 'grades' ? '#fff' : '#666', border: '1px solid #e0e0e0', borderRadius: 8, cursor: 'pointer'}}>🏆 Điểm</button>
        </div>

        {/* TAB: COURSES */}
        {tab === 'courses' && (
          <div>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20}}>
              <h3>Thư Viện Bài Giảng Tự Biên Soạn</h3>
              <Link
                href="/admin/course/manage/new"
                style={{padding: '10px 20px', background: '#003380', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 'bold', textDecoration: 'none', cursor: 'pointer', display: 'inline-block'}}
              >
                + Khởi Tạo Khóa Mới
              </Link>
            </div>
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 20}}>
              {courses.map(c => (
                 <div key={c.id} style={{background: '#fff', padding: 25, borderRadius: 20, boxShadow: '0 10px 20px rgba(0,0,0,0.03)'}}>
                   {c.image_url ? (
                     <div style={{width: '100%', height: 160, borderRadius: 12, marginBottom: 15, background: `url('${c.image_url}') center/cover`}} />
                   ) : <div style={{width: '100%', height: 160, borderRadius: 12, marginBottom: 15, background: '#e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>Không Có Ảnh</div>}
                   <h4 style={{fontSize: 20, marginBottom: 8}}>{c.title}</h4>
                   <p style={{color: '#666', fontSize: 13, marginBottom: 15}}>{c.description?.substring(0, 60)}...</p>
                    <div style={{display: 'flex', gap: 10, marginTop: 'auto'}}>
                      <Link href={`/admin/course/manage/${c.id}`} style={{flex: 1, padding: 8, background: '#003380', border: 'none', borderRadius: 6, cursor: 'pointer', textAlign: 'center', textDecoration: 'none', color: '#fff', fontWeight: 'bold'}}>⚙️ Quản Lý Nội Dung</Link>
                    </div>
                 </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB: EVENTS */}
        {tab === 'events' && (
          <div style={{background: '#fff', padding: 30, borderRadius: 20, boxShadow: '0 10px 30px rgba(0,0,0,0.05)'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20}}>
              <h3 style={{fontSize: 22, color: '#333'}}>Lịch Dạy Học</h3>
            </div>
            <table style={{width: '100%', borderCollapse: 'collapse', fontSize: 15}}>
              <thead>
                <tr style={{borderBottom: '3px solid #eee', textAlign: 'left', color: '#777'}}>
                  <th style={{padding: 15}}>Ngày</th><th style={{padding: 15}}>Hình Thức</th><th style={{padding: 15}}>Tiêu Đề</th><th style={{padding: 15}}>Khoá học</th><th style={{padding: 15}}>Link</th>
                </tr>
              </thead>
              <tbody>
                {events.map(e => (
                  <tr key={e.id} style={{borderBottom: '1px solid #f0f0f0'}}>
                    <td style={{padding: 15, fontWeight: 'bold'}}>{new Date(e.date).toLocaleDateString('vi-VN')}</td>
                    <td style={{padding: 15}}>{e.type === 'zoom' ? <span style={{color: '#e74c3c', fontWeight: 'bold'}}>📹 Zoom</span> : <span style={{color: '#2ecc71', fontWeight: 'bold'}}>📝 BTVN</span>}</td>
                    <td style={{padding: 15, color: '#444'}}>{e.title}</td>
                    <td style={{padding: 15, color: '#666', fontSize: 12}}>{courses.find(c=>c.id===e.course_id)?.title || 'Tất cả'}</td>
                    <td style={{padding: 15, color: '#888'}}>{e.zoom_link ? <a href={e.zoom_link} target="_blank" rel="noreferrer" style={{color: '#3498db'}}>{e.zoom_link.substring(0,25)}...</a> : '---'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB: DOCUMENTS */}
        {tab === 'documents' && (
          <div>
            <h3>Tài Liệu Xem</h3>
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 20}}>
              {documents.map(d => (
                 <div key={d.id} style={{background: '#fff', padding: 25, borderRadius: 20, boxShadow: '0 10px 20px rgba(0,0,0,0.03)'}}>
                   {d.cover_image_url ? (
                     <div style={{width: '100%', height: 160, borderRadius: 12, marginBottom: 15, background: `url('${d.cover_image_url}') center/cover`}} />
                   ) : <div style={{width: '100%', height: 160, borderRadius: 12, marginBottom: 15, background: '#e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>Không Có Ảnh Banner</div>}
                   <h4 style={{fontSize: 20, marginBottom: 8, color: '#c0392b'}}>{d.title}</h4>
                   <p style={{color: '#666', fontSize: 13, marginBottom: 15}}>{d.introduction?.substring(0, 80)}...</p>
                 </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB: GRADES */}
        {tab === 'grades' && (
          <div style={{background: '#fff', borderRadius: 16, padding: 30, boxShadow: '0 5px 20px rgba(0,0,0,0.04)'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25}}>
                <h3 style={{fontSize: 22, color: '#333'}}>📋 Bảng Điểm Tham Chiếu</h3>
                <button onClick={exportGrades} style={{background:'#f39c12',color:'#fff',border:'none',padding:'10px 22px',borderRadius:8,fontWeight:'bold',cursor:'pointer'}}>📥 Xuất CSV (Excel)</button>
              </div>
              {grades.length === 0 ? (
                <p style={{color:'#888',textAlign:'center',padding:30}}>Chưa có điểm nào được ghi nhận.</p>
              ) : (
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:14}}>
                  <thead>
                    <tr style={{background:'#f8f9fa',textAlign:'left'}}>
                      <th style={{padding:'12px 15px',borderBottom:'2px solid #eee'}}>Học sinh</th>
                      <th style={{padding:'12px 15px',borderBottom:'2px solid #eee'}}>Khoá học</th>
                      <th style={{padding:'12px 15px',borderBottom:'2px solid #eee'}}>Bài kiểm tra</th>
                      <th style={{padding:'12px 15px',borderBottom:'2px solid #eee',textAlign:'center'}}>Điểm</th>
                      <th style={{padding:'12px 15px',borderBottom:'2px solid #eee'}}>Ngày nộp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grades.map((g, i) => (
                      <tr key={i} style={{borderBottom:'1px solid #eee'}}>
                        <td style={{padding:'12px 15px'}}>
                          <div style={{fontWeight:600}}>{g.student_name}</div>
                          <div style={{color:'#888',fontSize:12}}>{g.student_email}</div>
                        </td>
                        <td style={{padding:'12px 15px',color:'#555',fontSize:13}}>{g.course_name}</td>
                        <td style={{padding:'12px 15px',color:'#555',fontSize:13}}>{g.activity_name}</td>
                        <td style={{padding:'12px 15px',textAlign:'center'}}>
                          <span style={{background: g.score>=5?'#e8f5e9':'#fdecea', color: g.score>=5?'#2e7d32':'#c62828', padding:'4px 12px',borderRadius:12,fontWeight:700,fontSize:15}}>{g.score}</span>
                        </td>
                        <td style={{padding:'12px 15px',color:'#888',fontSize:12}}>{new Date(g.submitted_at).toLocaleString('vi-VN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
          </div>
        )}
      </div>
    </div>
  );
}
