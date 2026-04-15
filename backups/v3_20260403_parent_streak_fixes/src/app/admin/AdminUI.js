'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import QuestionBankTab from '@/app/components/QuestionBankTab';

export default function AdminUI({ userRole = 'admin', userId }) {
  const [tab, setTab] = useState('courses');
  const [users, setUsers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [events, setEvents] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [grades, setGrades] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [parentUnread, setParentUnread] = useState(0);
  const [gradeFilter, setGradeFilter] = useState('all');

  // Edit states
  const [editingCourse, setEditingCourse] = useState(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [form, setForm] = useState({ date: '', type: 'zoom', title: '', zoom_link: '', course_id: '' });
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [teacherForm, setTeacherForm] = useState({ name: '', role_title: '', bio: '', avatar_url: '', fb_url: '', twitter_url: '', linkedin_url: '' });
  const [teacherPreview, setTeacherPreview] = useState(null);
  
  // Doc states
  const [editingDocument, setEditingDocument] = useState(null);

  useEffect(() => {
    fetchUsers();
    fetchCourses();
    fetchEvents();
    fetchDocuments();
    fetchEnrollments();
    fetchFeedbacks();
    fetchTeachers();
    fetchGrades();
    fetchAnalytics();
    // Check for unread parent messages
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

  const fetchUsers = async () => {
    const res = await fetch('/api/admin/users');
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users || []);
    }
    setLoading(false);
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

  const fetchFeedbacks = async () => {
    try {
      const res = await fetch('/api/admin/feedbacks');
      if (res.ok) { const data = await res.json(); setFeedbacks(data.feedbacks || []); }
    } catch(e) {}
  };

  const fetchTeachers = async () => {
    try { const r = await fetch('/api/admin/teachers'); if(r.ok){const d=await r.json(); setTeachers(d.teachers||[]);} } catch(e){}
  };

  const fetchGrades = async () => {
    try { const r = await fetch('/api/admin/grades'); if(r.ok){const d=await r.json(); setGrades(d.grades||[]);} } catch(e){}
  };

  const fetchAnalytics = async () => {
    try { const r = await fetch('/api/admin/analytics'); if(r.ok){const d=await r.json(); setAnalytics(d);} } catch(e){}
  };

  const handleSaveTeacher = async (e) => {
    e.preventDefault();
    if (teacherForm.avatar_url === 'Đang tải...') { alert('Vui lòng đợi ảnh tải lên hoàn tất!'); return; }
    
    try {
      const res = await fetch('/api/admin/teachers', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(teacherForm) });
      const data = await res.json();
      if (!res.ok) {
        alert('Lỗi: ' + (data.error || 'Server error'));
        return;
      }
      setEditingTeacher(null);
      setTeacherForm({ name: '', role_title: '', bio: '', avatar_url: '', fb_url: '', twitter_url: '', linkedin_url: '' });
      setTeacherPreview(null);
      fetchTeachers();
    } catch (e) {
      alert('Lỗi kết nối: ' + e.message);
    }
  };

  const handleDeleteTeacher = async (id) => {
    if (!confirm('Xóa giảng viên này?')) return;
    await fetch('/api/admin/teachers', { method: 'DELETE', headers: {'Content-Type':'application/json'}, body: JSON.stringify({id}) });
    fetchTeachers();
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

  // --- Users ---
  const handleRoleChange = async (id, newRole) => {
    if (!confirm(`Bạn có chắc muốn cấp vai trò ${newRole} cho người dùng này?`)) return;
    await fetch('/api/admin/users', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, role: newRole })
    });
    fetchUsers();
  };

  const handleDelete = async (id) => {
    if (!confirm(`Hành động vĩnh viễn: Khóa vĩnh viễn học sinh này?`)) return;
    await fetch('/api/admin/users', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    fetchUsers();
  };

  // --- Enrollments ---
  const handleEnrollmentStatus = async (id, status) => {
    await fetch('/api/admin/enrollments', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status })
    });
    fetchEnrollments();
  };

  // --- Courses ---
  const handleSaveCourse = async (e) => {
    e.preventDefault();
    await fetch('/api/admin/courses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingCourse)
    });
    setEditingCourse(null);
    fetchCourses();
  };

  const handleDeleteCourse = async (id) => {
    if (!confirm(`Xóa Khóa học này?`)) return;
    await fetch('/api/admin/courses', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    fetchCourses();
  };

  // --- Events ---
  const handleAddEvent = async (e) => {
    e.preventDefault();
    await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });
    setForm({ date: '', type: 'zoom', title: '', zoom_link: '', course_id: '' });
    setShowEventModal(false);
    fetchEvents();
  };

  const handleDeleteEvent = async (id) => {
    if(!confirm('Xóa sự kiện lớp học này?')) return;
    await fetch('/api/events', { method: 'DELETE', body: JSON.stringify({id}) });
    fetchEvents();
  };

  // --- Documents ---
  const handleSaveDocument = async (e) => {
    e.preventDefault();
    await fetch('/api/admin/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingDocument)
    });
    setEditingDocument(null);
    fetchDocuments();
  };

  const handleDeleteDocument = async (id) => {
    if (!confirm(`Xóa Ấn Phẩm / Tài Liệu này?`)) return;
    await fetch('/api/admin/documents', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    fetchDocuments();
  };


  // --- Upload Handlers ---
  const handleUploadCourse = async (e, field) => {
    const file = e.target.files[0];
    if (!file) return;
    const originalText = editingCourse[field];
    setEditingCourse({...editingCourse, [field]: 'Đang tải file... Vui lòng đợi!'});

    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/admin/upload', { method: 'POST', body: formData });
    const data = await res.json();
    if (res.ok) setEditingCourse({ ...editingCourse, [field]: data.url });
    else { alert(data.error); setEditingCourse({...editingCourse, [field]: originalText}); }
  };

  const handleUploadTeacher = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Immediate local preview
    const localUrl = URL.createObjectURL(file);
    setTeacherPreview(localUrl);
    
    const originalText = teacherForm.avatar_url;
    setTeacherForm({...teacherForm, avatar_url: 'Đang tải...'});

    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/admin/upload', { method: 'POST', body: formData });
    const data = await res.json();
    if (res.ok) setTeacherForm({ ...teacherForm, avatar_url: data.url });
    else { alert(data.error); setTeacherForm({...teacherForm, avatar_url: originalText}); }
  };

  const handleUploadDocument = async (e, field) => {
    const file = e.target.files[0];
    if (!file) return;
    const originalText = editingDocument[field];
    setEditingDocument({...editingDocument, [field]: 'Đang tải file...'});

    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/admin/upload', { method: 'POST', body: formData });
    const data = await res.json();
    if (res.ok) setEditingDocument({ ...editingDocument, [field]: data.url });
    else { alert(data.error); setEditingDocument({...editingDocument, [field]: originalText}); }
  };

  if (loading) return <div style={{padding: 50, color: '#444', textAlign: 'center', background: '#f5f7fa', height: '100vh'}}>Khởi tạo dữ liệu Quản Trị...</div>;

  return (
    <div style={{background: '#f5f7fa', minHeight: '100vh', padding: '40px', color: '#2c3e50', fontFamily: 'system-ui, sans-serif'}}>
      <div className="container" style={{maxWidth: 1300}}>
        
        {/* TITLE BAR */}
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20}}>
          <h2 style={{fontSize: 32, fontWeight: 900}}>
            <span style={{color: '#003380'}}>iMath</span> Cổng Quản Trị Tối Cao
          </h2>
          <div style={{display: 'flex', gap: 12, alignItems: 'center'}}>
            {parentUnread > 0 && (
              <div style={{background: '#fff0f0', border: '1px solid #ffcccc', color: '#cc0000', padding: '8px 16px', borderRadius: 8, fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, animation: 'pulse 2s infinite'}}>
                💬 {parentUnread} tin nhắn phụ huynh chưa đọc
              </div>
            )}
            <Link href="/dashboard" style={{padding: '10px 25px', background: '#eee', borderRadius: 8, color: '#333', textDecoration: 'none', fontWeight: 'bold'}}>← Rời Khỏi Vùng Quản Trị</Link>
          </div>
        </div>

        {/* TABS */}
        <div style={{display: 'flex', gap: 10, marginBottom: 30, flexWrap: 'wrap'}}>
          {userRole === 'admin' && <button onClick={() => setTab('users')} style={{padding: '10px 20px', fontWeight: 'bold', background: tab === 'users' ? '#003380' : '#fff', color: tab === 'users' ? '#fff' : '#666', border: '1px solid #e0e0e0', borderRadius: 8, cursor: 'pointer'}}>👥 Tài khoản</button>}
          <button onClick={() => setTab('courses')} style={{padding: '10px 20px', fontWeight: 'bold', background: tab === 'courses' ? '#003380' : '#fff', color: tab === 'courses' ? '#fff' : '#666', border: '1px solid #e0e0e0', borderRadius: 8, cursor: 'pointer'}}>📚 Khoá học</button>
          {userRole === 'admin' && <button onClick={() => setTab('teachers')} style={{padding: '10px 20px', fontWeight: 'bold', background: tab === 'teachers' ? '#1a885c' : '#fff', color: tab === 'teachers' ? '#fff' : '#666', border: '1px solid #e0e0e0', borderRadius: 8, cursor: 'pointer'}}>👨‍🏫 Giảng viên</button>}
          <button onClick={() => setTab('events')} style={{padding: '10px 20px', fontWeight: 'bold', background: tab === 'events' ? '#003380' : '#fff', color: tab === 'events' ? '#fff' : '#666', border: '1px solid #e0e0e0', borderRadius: 8, cursor: 'pointer'}}>📅 Lịch dạy</button>
          <button onClick={() => setTab('documents')} style={{padding: '10px 20px', fontWeight: 'bold', background: tab === 'documents' ? '#e74c3c' : '#fff', color: tab === 'documents' ? '#fff' : '#666', border: '1px solid #e0e0e0', borderRadius: 8, cursor: 'pointer'}}>📂 Tài liệu</button>
          {userRole === 'admin' && <button onClick={() => setTab('enrollments')} style={{padding: '10px 20px', fontWeight: 'bold', background: tab === 'enrollments' ? '#2ecc71' : '#fff', color: tab === 'enrollments' ? '#fff' : '#666', border: '1px solid #e0e0e0', borderRadius: 8, cursor: 'pointer'}}>✅ Phê duyệt</button>}
          {userRole === 'admin' && <button onClick={() => setTab('question-bank')} style={{padding: '10px 20px', fontWeight: 'bold', background: tab === 'question-bank' ? '#e67e22' : '#fff', color: tab === 'question-bank' ? '#fff' : '#666', border: '1px solid #e0e0e0', borderRadius: 8, cursor: 'pointer'}}>📚 Ngân hàng CH</button>}
          <button onClick={() => setTab('grades')} style={{padding: '10px 20px', fontWeight: 'bold', background: tab === 'grades' ? '#f39c12' : '#fff', color: tab === 'grades' ? '#fff' : '#666', border: '1px solid #e0e0e0', borderRadius: 8, cursor: 'pointer'}}>🏆 Điểm</button>
          <button onClick={() => setTab('feedbacks')} style={{padding: '10px 20px', fontWeight: 'bold', background: tab === 'feedbacks' ? '#9b59b6' : '#fff', color: tab === 'feedbacks' ? '#fff' : '#666', border: '1px solid #e0e0e0', borderRadius: 8, cursor: 'pointer'}}>💬 Phản hồi</button>
          {userRole === 'admin' && <button onClick={() => setTab('ai-access')} style={{padding: '10px 20px', fontWeight: 'bold', background: tab === 'ai-access' ? '#8e44ad' : '#fff', color: tab === 'ai-access' ? '#fff' : '#666', border: '1px solid #e0e0e0', borderRadius: 8, cursor: 'pointer'}}>🤖 Cấp Quyền AI</button>}
        </div>

        {/* TAB 1: USERS */}
        {tab === 'users' && (
          <div style={{background: '#ffffff', padding: 30, borderRadius: 20, boxShadow: '0 10px 30px rgba(0,0,0,0.05)'}}>
            <h3 style={{marginBottom: 25, fontSize: 22, color: '#333'}}>Danh Sách Nguồn Nhân Lực</h3>
            <table style={{width: '100%', borderCollapse: 'collapse', fontSize: 15}}>
              <thead>
                <tr style={{borderBottom: '3px solid #eee', textAlign: 'left', color: '#777'}}>
                  <th style={{padding: 15}}>ID</th>
                  <th style={{padding: 15}}>Họ & Tên</th>
                  <th style={{padding: 15}}>Email Xác Minh</th>
                  <th style={{padding: 15}}>Trạng Thái (Vị Trí)</th>
                  <th style={{padding: 15, textAlign: 'right'}}>Chỉnh Quyền</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} style={{borderBottom: '1px solid #f0f0f0'}}>
                    <td style={{padding: 15, color: '#888'}}>#{u.id}</td>
                    <td style={{padding: 15, fontWeight: 'bold'}}>{u.full_name}</td>
                    <td style={{padding: 15, color: '#666'}}>{u.email}</td>
                    <td style={{padding: 15}}>
                      <span style={{padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 'bold', background: u.role === 'admin' ? '#ffeaea' : u.role === 'teacher' ? '#fff3e0' : '#e3f2fd', color: u.role === 'admin' ? '#e74c3c' : u.role === 'teacher' ? '#e67e22' : '#2980b9'}}>
                        {u.role.toUpperCase()}
                      </span>
                    </td>
                    <td style={{padding: 15, textAlign: 'right'}}>
                      <div style={{display: 'flex', gap: 10, justifyContent: 'flex-end'}}>
                        <select onChange={(e) => handleRoleChange(u.id, e.target.value)} value={u.role} style={{padding: '8px 12px', borderRadius: 8, background: '#f5f6fa', color: '#333', border: '1px solid #dcdde1', outline: 'none', cursor: 'pointer'}}>
                          <option value="student">Student (Học Sinh)</option>
                          <option value="teacher">Teacher (Giáo Viên)</option>
                          <option value="admin">Admin</option>
                        </select>
                        <button style={{background: '#e74c3c', color: '#fff', padding: '8px 15px', borderRadius: 8, border: 'none', cursor: 'pointer'}} onClick={() => handleDelete(u.id)}>Khóa Cửa</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB: AI ACCESS */}
        {tab === 'ai-access' && (
          <div style={{background: '#ffffff', padding: 30, borderRadius: 20, boxShadow: '0 10px 30px rgba(0,0,0,0.05)'}}>
            <h3 style={{marginBottom: 25, fontSize: 22, color: '#333'}}>🤖 Phân Quyền Sử Dụng iMath AI Chatbot</h3>
            <table style={{width: '100%', borderCollapse: 'collapse', fontSize: 15}}>
              <thead>
                <tr style={{borderBottom: '3px solid #eee', textAlign: 'left', color: '#777'}}>
                  <th style={{padding: 15}}>Họ & Tên</th>
                  <th style={{padding: 15}}>Email</th>
                  <th style={{padding: 15, textAlign: 'center'}}>Trạng Thái Quyền AI</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} style={{borderBottom: '1px solid #f0f0f0'}}>
                    <td style={{padding: 15, fontWeight: 'bold'}}>{u.full_name}</td>
                    <td style={{padding: 15, color: '#666'}}>{u.email}</td>
                    <td style={{padding: 15, textAlign: 'center'}}>
                      <label style={{display: 'inline-flex', alignItems: 'center', cursor: 'pointer', background: u.can_use_ai ? '#e8f5e9' : '#ffebee', padding: '6px 12px', borderRadius: 20}}>
                        <input type="checkbox" checked={!!u.can_use_ai} onChange={async (e) => {
                          const val = e.target.checked;
                          await fetch('/api/admin/users', { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({id: u.id, can_use_ai: val, update_ai_only: true}) });
                          fetchUsers();
                        }} style={{width: 18, height: 18, cursor: 'pointer', marginRight: 8}} />
                        <span style={{fontWeight: 'bold', color: u.can_use_ai ? '#2e7d32' : '#c62828', fontSize: 13}}>
                          {u.can_use_ai ? '✅ Đã Cấp Quyền' : '❌ Đang Khóa'}
                        </span>
                      </label>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 5: ENROLLMENTS */}
        {tab === 'enrollments' && (
          <div style={{background: '#ffffff', padding: 30, borderRadius: 20, boxShadow: '0 10px 30px rgba(0,0,0,0.05)'}}>
            <h3 style={{marginBottom: 25, fontSize: 22, color: '#333'}}>Danh Sách Yêu Cầu Học Tập</h3>
            <table style={{width: '100%', borderCollapse: 'collapse', fontSize: 15}}>
              <thead>
                <tr style={{borderBottom: '3px solid #eee', textAlign: 'left', color: '#777'}}>
                  <th style={{padding: 15}}>Học Viên</th>
                  <th style={{padding: 15}}>Khóa Học</th>
                  <th style={{padding: 15}}>Ngày Xin Việc</th>
                  <th style={{padding: 15}}>Trạng Thái Hiện Tại</th>
                  <th style={{padding: 15, textAlign: 'right'}}>Chốt Quyền</th>
                </tr>
              </thead>
              <tbody>
                {enrollments.map(e => (
                  <tr key={e.id} style={{borderBottom: '1px solid #f0f0f0'}}>
                    <td style={{padding: 15, fontWeight: 'bold'}}>{e.student_name} <br/><span style={{fontWeight:'normal', fontSize: 12, color:'#888'}}>{e.student_email}</span></td>
                    <td style={{padding: 15, color: '#003380', fontWeight: 'bold'}}>{e.course_title}</td>
                    <td style={{padding: 15, color: '#666'}}>{new Date(e.created_at).toLocaleString('vi-VN')}</td>
                    <td style={{padding: 15}}>
                      <span style={{padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 'bold', background: e.status === 'approved' ? '#e8f5e9' : e.status === 'rejected' ? '#ffebee' : '#fff3e0', color: e.status === 'approved' ? '#2e7d32' : e.status === 'rejected' ? '#c62828' : '#ef6c00'}}>
                        {e.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{padding: 15, textAlign: 'right'}}>
                      <div style={{display: 'flex', gap: 10, justifyContent: 'flex-end'}}>
                        {e.status !== 'approved' && <button style={{background: '#2ecc71', color: '#fff', padding: '8px 15px', borderRadius: 8, border: 'none', cursor: 'pointer'}} onClick={() => handleEnrollmentStatus(e.id, 'approved')}>Đồng Ý</button>}
                        {e.status !== 'rejected' && <button style={{background: '#e74c3c', color: '#fff', padding: '8px 15px', borderRadius: 8, border: 'none', cursor: 'pointer'}} onClick={() => handleEnrollmentStatus(e.id, 'rejected')}>Chối Từ</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 2: COURSES */}
        {tab === 'courses' && (
          <div>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20}}>
              <h3>Thư Viện Bài Giảng & Công Cụ</h3>
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
                     <div style={{width: '100%', height: 160, borderRadius: 12, marginBottom: 15, backgroundImage: `url(${c.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center'}} />
                   ) : <div style={{width: '100%', height: 160, borderRadius: 12, marginBottom: 15, background: '#e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>Không Có Ảnh</div>}
                   <h4 style={{fontSize: 20, marginBottom: 8}}>{c.title}</h4>
                   <p style={{color: '#666', fontSize: 13, marginBottom: 15}}>{c.description?.substring(0, 60)}...</p>
                    <div style={{display: 'flex', gap: 10, marginTop: 'auto'}}>
                      <Link href={`/admin/course/manage/${c.id}`} style={{flex: 1, padding: 8, background: '#003380', border: 'none', borderRadius: 6, cursor: 'pointer', textAlign: 'center', textDecoration: 'none', color: '#fff', fontWeight: 'bold'}}>⚙️ Quản Lý Nội Dung</Link>
                      <button style={{background: '#ffeaea', color: '#e74c3c', padding: 8, border: '1px solid #ffcccc', borderRadius: 6, cursor: 'pointer'}} onClick={() => handleDeleteCourse(c.id)}>🗑️</button>
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
              <h3 style={{fontSize: 22, color: '#333'}}>Lịch Dạy Học theo Khoá</h3>
              <button 
                onClick={() => setShowEventModal(true)} 
                style={{padding: '10px 20px', background: '#003380', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer'}}
              >
                + Thêm Lịch Học Mới
              </button>
            </div>
            <table style={{width: '100%', borderCollapse: 'collapse', fontSize: 15}}>
              <thead>
                <tr style={{borderBottom: '3px solid #eee', textAlign: 'left', color: '#777'}}>
                  <th style={{padding: 15}}>Ngày</th><th style={{padding: 15}}>Hình Thức</th><th style={{padding: 15}}>Tiêu Đề</th><th style={{padding: 15}}>Khoá học</th><th style={{padding: 15}}>Link</th><th style={{padding: 15, textAlign: 'right'}}>Xoá</th>
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
                    <td style={{padding: 15, textAlign: 'right'}}><button onClick={() => handleDeleteEvent(e.id)} style={{background: '#e74c3c', color: '#fff', padding: '6px 12px', fontSize: 12, border: 'none', borderRadius: 6, cursor: 'pointer'}}>Xóa</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB: DOCUMENTS */}
        {tab === 'documents' && (
          <div>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20}}>
              <h3>Kho Tàng Ấn Phẩm (Sách & Tạp Chí)</h3>
              <button 
                onClick={() => setEditingDocument({ title: '', cover_image_url: '', introduction: '', pdf_url: '', table_of_contents: '' })} 
                style={{padding: '10px 20px', background: '#e74c3c', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer'}}
              >
                + Xuất Bản Tài Liệu Mới
              </button>
            </div>
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 20}}>
              {documents.map(d => (
                 <div key={d.id} style={{background: '#fff', padding: 25, borderRadius: 20, boxShadow: '0 10px 20px rgba(0,0,0,0.03)'}}>
                   {d.cover_image_url ? (
                     <div style={{width: '100%', height: 160, borderRadius: 12, marginBottom: 15, backgroundImage: `url(${d.cover_image_url})`, backgroundSize: 'cover', backgroundPosition: 'center'}} />
                   ) : <div style={{width: '100%', height: 160, borderRadius: 12, marginBottom: 15, background: '#e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>Không Có Ảnh Banner</div>}
                   <h4 style={{fontSize: 20, marginBottom: 8, color: '#c0392b'}}>{d.title}</h4>
                   <p style={{color: '#666', fontSize: 13, marginBottom: 15}}>{d.introduction?.substring(0, 80)}...</p>
                   <div style={{display: 'flex', gap: 10, marginTop: 'auto'}}>
                     <button style={{flex: 1, padding: 8, background: '#f5f6fa', border: '1px solid #ddd', borderRadius: 6, cursor: 'pointer'}} onClick={() => setEditingDocument(d)}>✒️ Chỉnh Sửa Sách</button>
                     <button style={{background: '#e74c3c', color: '#fff', padding: 8, border: 'none', borderRadius: 6, cursor: 'pointer'}} onClick={() => handleDeleteDocument(d.id)}>Thu Hồi</button>
                   </div>
                 </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB: TEACHERS (Updated for Avatar) */}
        {tab === 'teachers' && (
          <div style={{background: '#fff', borderRadius: 16, padding: 30, boxShadow: '0 5px 20px rgba(0,0,0,0.04)'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25}}>
              <h3 style={{fontSize: 22, color: '#333'}}>👨‍🏫 Quản lý Giảng viên</h3>
              <button 
                onClick={() => { setEditingTeacher(true); setTeacherForm({name:'',role_title:'',bio:'', avatar_url: '', fb_url: '', twitter_url: '', linkedin_url: ''}); }} 
                style={{background:'#1a885c',color:'#fff',border:'none',padding:'10px 20px',borderRadius:8,fontWeight:'bold',cursor:'pointer'}}
              >
                + Thêm Giảng viên
              </button>
            </div>
            {editingTeacher && (
              <form onSubmit={handleSaveTeacher} style={{background:'#f0faf5',border:'1px solid #b2dfdb',borderRadius:12,padding:25,marginBottom:30}}>
                <h4 style={{marginBottom:15,color:'#1a885c'}}>{teacherForm.id ? 'Chỉnh sửa Giảng viên' : 'Thêm Giảng viên mới'}</h4>
                
                <div style={{display:'grid', gridTemplateColumns:'120px 1fr', gap:25, marginBottom:20}}>
                   <div style={{textAlign: 'center'}}>
                      <div style={{width: 100, height: 100, borderRadius: '50%', background: '#fff', border: '2px solid #1a885c', marginBottom: 10, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.1)'}}>
                         {teacherPreview || (teacherForm.avatar_url && teacherForm.avatar_url.startsWith('http')) ? (
                           <img src={teacherPreview || teacherForm.avatar_url} style={{width:'100%', height:'100%', objectFit: 'cover'}} alt="Avatar" />
                         ) : <span style={{fontSize: 40}}>👤</span>}
                      </div>
                      {teacherForm.avatar_url === 'Đang tải...' && <div style={{fontSize: 10, color: '#1a885c', marginBottom: 5}}>Đang tải lên...</div>}
                      <label style={{fontSize: 11, background: '#1a885c', color: '#fff', padding: '5px 10px', borderRadius: 4, cursor: 'pointer'}}>
                         Upload
                         <input type="file" style={{display:'none'}} accept="image/*" onChange={handleUploadTeacher} />
                      </label>
                   </div>
                   <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:15}}>
                      <div>
                        <label style={{display:'block',marginBottom:5,fontWeight:'bold',fontSize:13}}>Tên giảng viên *</label>
                        <input required value={teacherForm.name} onChange={e=>setTeacherForm({...teacherForm,name:e.target.value})} placeholder="Thầy Nguyễn Văn A" style={{width:'100%',padding:'10px',borderRadius:6,border:'1px solid #ccc'}}/>
                      </div>
                      <div>
                        <label style={{display:'block',marginBottom:5,fontWeight:'bold',fontSize:13}}>Chức danh</label>
                        <input value={teacherForm.role_title} onChange={e=>setTeacherForm({...teacherForm,role_title:e.target.value})} placeholder="Thạc sĩ Giáo Dục..." style={{width:'100%',padding:'10px',borderRadius:6,border:'1px solid #ccc'}}/>
                      </div>
                      <div style={{gridColumn: 'span 2'}}>
                        <label style={{display:'block',marginBottom:5,fontWeight:'bold',fontSize:13}}>Bio / Mô tả</label>
                        <textarea value={teacherForm.bio} onChange={e=>setTeacherForm({...teacherForm,bio:e.target.value})} placeholder="Giới thiệu kinh nghiệm..." rows={2} style={{width:'100%',padding:'10px',borderRadius:6,border:'1px solid #ccc', resize: 'vertical'}}/>
                      </div>
                      <div>
                        <label style={{display:'block',marginBottom:5,fontWeight:'bold',fontSize:13}}>Link Facebook (F)</label>
                        <input value={teacherForm.fb_url} onChange={e=>setTeacherForm({...teacherForm,fb_url:e.target.value})} placeholder="https://facebook.com/..." style={{width:'100%',padding:'10px',borderRadius:6,border:'1px solid #ccc'}}/>
                      </div>
                      <div>
                        <label style={{display:'block',marginBottom:5,fontWeight:'bold',fontSize:13}}>Link Twitter (TIN)</label>
                        <input value={teacherForm.twitter_url} onChange={e=>setTeacherForm({...teacherForm,twitter_url:e.target.value})} placeholder="https://twitter.com/..." style={{width:'100%',padding:'10px',borderRadius:6,border:'1px solid #ccc'}}/>
                      </div>
                      <div>
                        <label style={{display:'block',marginBottom:5,fontWeight:'bold',fontSize:13}}>Link LinkedIn (IN)</label>
                        <input value={teacherForm.linkedin_url} onChange={e=>setTeacherForm({...teacherForm,linkedin_url:e.target.value})} placeholder="https://linkedin.com/..." style={{width:'100%',padding:'10px',borderRadius:6,border:'1px solid #ccc'}}/>
                      </div>
                   </div>
                </div>

                <div style={{display:'flex',gap:10, justifyContent: 'flex-end'}}>
                  <button type="submit" style={{background:'#1a885c',color:'#fff',border:'none',padding:'10px 25px',borderRadius:6,fontWeight:'bold',cursor:'pointer'}}>Lưu Giảng Viên</button>
                  <button type="button" onClick={()=>setEditingTeacher(null)} style={{background:'#eee',border:'none',padding:'10px 25px',borderRadius:6,cursor:'pointer'}}>Hủy</button>
                </div>
              </form>
            )}
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:15}}>
              {teachers.map(t=>(
                <div key={t.id} style={{background:'#fff',border:'1px solid #e0f2f1',borderRadius:12,padding:'20px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)'}}>
                  <div style={{display:'flex', gap: 15, alignItems: 'center'}}>
                    <div style={{width: 50, height: 50, borderRadius: '50%', background: '#eee', overflow: 'hidden', flexShrink: 0}}>
                       {t.avatar_url ? <img src={t.avatar_url} style={{width:'100%', height:'100%', objectFit: 'cover'}} alt="T" /> : null}
                    </div>
                    <div style={{flex: 1}}>
                      <div style={{fontWeight:700,fontSize:15}}>{t.name}</div>
                      <div style={{color:'#1a885c',fontSize:11,fontWeight:600}}>{t.role_title}</div>
                    </div>
                    <div style={{display: 'flex', gap: 5}}>
                       <button onClick={()=>{setEditingTeacher(true); setTeacherForm(t);}} style={{background:'none', border: 'none', cursor: 'pointer'}}>✏️</button>
                       <button onClick={()=>handleDeleteTeacher(t.id)} style={{background:'none', border: 'none', color: '#e74c3c', cursor: 'pointer'}}>🗑️</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB: FEEDBACKS (Updated for Rating) */}
        {tab === 'feedbacks' && (
          <div style={{background: '#fff', borderRadius: 16, padding: 30, boxShadow: '0 5px 20px rgba(0,0,0,0.04)'}}>
            <h3 style={{fontSize: 22, marginBottom: 25, color: '#333'}}>💬 Phản hồi & Đánh giá</h3>
            {feedbacks.length === 0 ? (
              <p style={{color: '#888', textAlign: 'center', padding: 30}}>Chưa có phản hồi nào.</p>
            ) : (
              <div style={{display: 'flex', flexDirection: 'column', gap: 15}}>
                {feedbacks.map(fb => (
                  <div key={fb.id} style={{background: '#f8f9ff', border: '1px solid #e8f0fe', borderRadius: 12, padding: '18px 22px'}}>
                    <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 10, alignItems: 'center'}}>
                      <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
                        <span style={{fontWeight: 700, color: '#003380'}}>👤 {fb.full_name || 'Học viên'}</span>
                        <div style={{display: 'flex', gap: 2}}>
                           {[1,2,3,4,5].map(s => (
                             <span key={s} style={{color: s <= (fb.rating || 5) ? '#f1c40f' : '#ddd', fontSize: 16}}>★</span>
                           ))}
                        </div>
                      </div>
                      <span style={{color: '#aaa', fontSize: 12}}>{new Date(fb.created_at).toLocaleString('vi-VN')}</span>
                    </div>
                    <p style={{margin: 0, color: '#444', lineHeight: 1.6, background: '#fff', padding: '10px 15px', borderRadius: 8, border: '1px solid #f0f0f0'}}>{fb.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB: QUESTION BANK */}
        {tab === 'question-bank' && (
          <QuestionBankTab />
        )}

        {tab === 'grades' && (
          <div style={{display: 'flex', flexDirection: 'column', gap: 20}}>
            {/* WIDGETS */}
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20}}>
              <div style={{background: '#fff', padding: 25, borderRadius: 16, boxShadow: '0 5px 20px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: 20}}>
                <div style={{background: '#e3f2fd', width: 60, height: 60, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24}}>🕒</div>
                <div>
                  <div style={{fontSize: 14, color: '#888', fontWeight: 'bold', marginBottom: 5}}>THỜI GIAN HỌC (TOÀN HỆ THỐNG)</div>
                  <div style={{fontSize: 28, fontWeight: 900, color: '#003380'}}>{analytics?.totalStudyTime || 0} Phút</div>
                </div>
              </div>
              
              <div style={{background: '#fff', padding: 25, borderRadius: 16, boxShadow: '0 5px 20px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: 20}}>
                <div style={{background: '#e8f5e9', width: 60, height: 60, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24}}>📝</div>
                <div>
                  <div style={{fontSize: 14, color: '#888', fontWeight: 'bold', marginBottom: 5}}>TỔNG SỐ LƯỢT LÀM BÀI</div>
                  <div style={{fontSize: 28, fontWeight: 900, color: '#2e7d32'}}>{grades.length || 0} Lượt</div>
                </div>
              </div>
              
              <div style={{background: '#fff', padding: 25, borderRadius: 16, boxShadow: '0 5px 20px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: 20}}>
                <div style={{background: '#fff3e0', width: 60, height: 60, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24}}>🎯</div>
                <div>
                  <div style={{fontSize: 14, color: '#888', fontWeight: 'bold', marginBottom: 5}}>BÀI GIẢNG "HOT" NHẤT</div>
                  <div style={{fontSize: 20, fontWeight: 900, color: '#e67e22', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 180}}>
                    {analytics?.hotActivities?.[0]?.title || 'Chưa có'}
                  </div>
                </div>
              </div>
            </div>

            {/* CHARTS ROW */}
            <div style={{display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 20}}>
               {/* LỘ TRÌNH KIẾN THỨC MẮC LỖI */}
               <div style={{background: '#fff', padding: 25, borderRadius: 16, boxShadow: '0 5px 20px rgba(0,0,0,0.04)'}}>
                  <h4 style={{fontSize: 18, color: '#333', marginBottom: 20}}>📈 Tỷ Lệ Làm Đúng Theo Dạng Toán</h4>
                  <div style={{display: 'flex', flexDirection: 'column', gap: 15}}>
                     {analytics?.mistakesAnalytics?.length > 0 ? analytics.mistakesAnalytics.map((m, i) => (
                        <div key={i}>
                           <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 13, fontWeight: 'bold'}}>
                              <span style={{color: '#555'}}>{m.tag} ({m.totalAttempts} đáp án)</span>
                              <span style={{color: m.correctPercent < 50 ? '#e74c3c' : m.correctPercent < 70 ? '#f39c12' : '#2ecc71'}}>{m.correctPercent}%</span>
                           </div>
                           <div style={{width: '100%', height: 10, background: '#f0f0f0', borderRadius: 10, overflow: 'hidden'}}>
                              <div style={{width: `${m.correctPercent}%`, height: '100%', background: m.correctPercent < 50 ? '#e74c3c' : m.correctPercent < 70 ? '#f39c12' : '#2ecc71', borderRadius: 10}}></div>
                           </div>
                        </div>
                     )) : <div style={{color: '#888', fontSize: 14}}>Chưa có dữ liệu thống kê Tag.</div>}
                  </div>
               </div>

               {/* TREND ĐIỂM SỐ */}
               <div style={{background: '#fff', padding: 25, borderRadius: 16, boxShadow: '0 5px 20px rgba(0,0,0,0.04)'}}>
                  <h4 style={{fontSize: 18, color: '#333', marginBottom: 20}}>📉 Xu Hướng Điểm Trung Bình (7 ngày nộp gần nhất)</h4>
                  <div style={{display: 'flex', alignItems: 'flex-end', gap: 10, height: 200, paddingBottom: 20, borderBottom: '1px solid #eee', overflowX: 'auto'}}>
                     {analytics?.trendScores?.length > 0 ? analytics.trendScores.map((t, i) => {
                        const score = Number(t.avg_score);
                        const heightPct = (score / 10) * 100;
                        return (
                           <div key={i} style={{flex: 1, minWidth: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: 10}}>
                              <span style={{fontSize: 12, fontWeight: 'bold', color: '#003380'}}>{score.toFixed(1)}</span>
                              <div style={{width: '100%', maxWidth: 35, height: `${heightPct}%`, background: '#3498db', borderRadius: '4px 4px 0 0', position: 'relative', transition: 'height 0.3s ease'}}></div>
                              <span style={{fontSize: 10, color: '#888', whiteSpace: 'nowrap'}}>{new Date(t.date).toLocaleDateString('vi-VN')}</span>
                           </div>
                        )
                     }) : <div style={{color: '#888', fontSize: 14}}>Chưa có dữ liệu bài làm nghiệm thu.</div>}
                  </div>
               </div>
            </div>

            {/* RAW DATA TABLE */}
            <div style={{background: '#fff', borderRadius: 16, padding: 30, boxShadow: '0 5px 20px rgba(0,0,0,0.04)'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25}}>
                <h3 style={{fontSize: 22, color: '#333'}}>📋 Bảng Điểm Tham Chiếu</h3>
                <div style={{display: 'flex', gap: 15}}>
                   <select value={gradeFilter} onChange={e => setGradeFilter(e.target.value)} style={{padding: '10px 15px', borderRadius: 8, border: '1px solid #ddd'}}>
                      <option value="all">Tất cả điểm số</option>
                      <option value="official">Điểm Chính Quy</option>
                      <option value="daily">Điểm Hằng Ngày</option>
                   </select>
                   <button onClick={exportGrades} style={{background:'#f39c12',color:'#fff',border:'none',padding:'10px 22px',borderRadius:8,fontWeight:'bold',cursor:'pointer'}}>📥 Xuất CSV (Excel)</button>
                </div>
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
                    {grades.filter(g => gradeFilter === 'all' || g.type === gradeFilter).map((g, i) => (
                      <tr key={i} style={{borderBottom:'1px solid #eee'}}>
                        <td style={{padding:'12px 15px'}}>
                          <div style={{fontWeight:600}}>{g.student_name}</div>
                          <div style={{color:'#888',fontSize:12}}>{g.student_email}</div>
                        </td>
                        <td style={{padding:'12px 15px',color:'#555',fontSize:13}}>{g.course_name}</td>
                        <td style={{padding:'12px 15px',color:'#555',fontSize:13}}>
                          {g.activity_name}
                          {g.type === 'daily' && <span style={{marginLeft: 8, padding: '2px 6px', background: '#e3f2fd', color: '#1565c0', fontSize: 10, borderRadius: 10, fontWeight: 'bold'}}>DAILY</span>}
                        </td>
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
          </div>
        )}

        {/* MODAL: EVENT CREATION */}
        {showEventModal && (
          <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(5px)'}}>
             <div style={{width: 500, padding: 30, background: '#fff', borderRadius: 24, boxShadow: '0 20px 50px rgba(0,0,0,0.1)'}}>
               <h3 style={{marginBottom: 20, fontSize: 22, color: '#003380'}}>📅 Thêm Lịch Học Mới</h3>
               <form onSubmit={handleAddEvent}>
                 <div style={{marginBottom: 15}}>
                   <label style={{display: 'block', marginBottom: 5, fontWeight: 'bold'}}>Ngày dạy:</label>
                   <input type="date" required value={form.date} onChange={e => setForm({...form, date: e.target.value})} style={{width: '100%', padding: '10px', borderRadius: 6, border: '1px solid #ddd', boxSizing: 'border-box'}} />
                 </div>
                 <div style={{marginBottom: 15}}>
                   <label style={{display: 'block', marginBottom: 5, fontWeight: 'bold'}}>Hình thức:</label>
                   <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} style={{width: '100%', padding: '10px', borderRadius: 6, border: '1px solid #ddd'}}>
                     <option value="zoom">📹 Học online (Zoom/Meet)</option>
                     <option value="assignment">📝 Giao bài tập</option>
                   </select>
                 </div>
                 <div style={{marginBottom: 15}}>
                   <label style={{display: 'block', marginBottom: 5, fontWeight: 'bold'}}>Nội dung / Tiêu đề:</label>
                   <input type="text" required placeholder="VD: Buổi học Chương 2 - Hàm số..." value={form.title} onChange={e => setForm({...form, title: e.target.value})} style={{width: '100%', padding: '10px', borderRadius: 6, border: '1px solid #ddd', boxSizing: 'border-box'}} />
                 </div>
                 {form.type === 'zoom' && (
                   <div style={{marginBottom: 15}}>
                     <label style={{display: 'block', marginBottom: 5, fontWeight: 'bold'}}>Link Zoom/Meet:</label>
                     <input type="url" required placeholder="https://zoom.us/j/..." value={form.zoom_link} onChange={e => setForm({...form, zoom_link: e.target.value})} style={{width: '100%', padding: '10px', borderRadius: 6, border: '1px solid #ddd', boxSizing: 'border-box'}} />
                   </div>
                 )}
                 <div style={{marginBottom: 15, padding: 12, background: '#f0f7ff', borderRadius: 8, border: '1px solid #c5e0ff'}}>
                   <label style={{display: 'block', marginBottom: 8, fontWeight: 'bold', color: '#003380'}}>🎯 Dành cho khoá học:</label>
                   <select value={form.course_id} onChange={e => setForm({...form, course_id: e.target.value})} style={{width: '100%', padding: '10px', borderRadius: 6, border: '1px solid #ddd'}}>
                     <option value="">-- Tất cả học sinh --</option>
                     {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                   </select>
                   <div style={{fontSize: 11, color: '#555', marginTop: 5}}>Chỉ học sinh trong khoá này mới thấy lịch</div>
                 </div>
                 <div style={{display: 'flex', gap: 15, marginTop: 20}}>
                   <button type="submit" style={{flex: 1, padding: '12px', background: '#003380', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer'}}>✅ Lưu Lịch</button>
                   <button type="button" onClick={() => setShowEventModal(false)} style={{padding: '12px 20px', background: '#f0f0f0', border: 'none', borderRadius: 8, cursor: 'pointer'}}>Hủy</button>
                 </div>
               </form>
             </div>
          </div>
        )}

        {/* MODAL: DOCUMENT EDITING */}
        {editingDocument && (
          <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(5px)'}}>
             <div style={{width: 700, padding: 40, background: '#fff', borderRadius: 24, boxShadow: '0 20px 50px rgba(0,0,0,0.1)', maxHeight: '90vh', overflowY: 'auto'}}>
              <h3 style={{marginBottom: 20, fontSize: 24, color: '#c0392b'}}>{editingDocument.id ? 'Biên Tập Ấn Phẩm Tạp Chí' : 'Xuất Bản Ấn Phẩm / Tài liệu Mới'}</h3>
              <form onSubmit={handleSaveDocument}>
                <div style={{marginBottom: 15}}>
                  <label style={{display:'block', marginBottom:5, fontWeight:'bold'}}>Tiêu Đề Ấn Phẩm</label>
                  <input type="text" required style={{width:'100%', padding:10, borderRadius:6, border:'1px solid #ddd'}} value={editingDocument.title} onChange={e => setEditingDocument({...editingDocument, title: e.target.value})} />
                </div>
                <div style={{marginBottom: 15}}>
                  <label style={{display:'block', marginBottom:5, fontWeight:'bold'}}>Lời Ngỏ / Giới thiệu</label>
                  <textarea style={{width:'100%', padding:10, borderRadius:6, border:'1px solid #ddd', minHeight: 120}} value={editingDocument.introduction} onChange={e => setEditingDocument({...editingDocument, introduction: e.target.value})} />
                </div>
                <div style={{padding: 15, background: '#f5f5f5', borderRadius: 12, marginBottom: 15}}>
                  <strong style={{display:'block', marginBottom: 10}}>🎨 Ảnh Bìa Tuyệt Đỉnh (Banner)</strong>
                  <div style={{display: 'flex', gap: 10}}>
                    <input type="text" placeholder="URL link..." style={{flex: 1, padding:10, borderRadius:6, border:'1px solid #ddd'}} value={editingDocument.cover_image_url || ''} onChange={e => setEditingDocument({...editingDocument, cover_image_url: e.target.value})} />
                    <label style={{background: '#333', color: '#fff', padding: '10px 15px', borderRadius: 6, cursor: 'pointer'}}> Upload <input type="file" style={{display:'none'}} accept="image/*" onChange={(e) => handleUploadDocument(e, 'cover_image_url')}/></label>
                  </div>
                </div>
                <div style={{padding: 15, background: '#ffeef0', borderRadius: 12, marginBottom: 15}}>
                   <strong style={{display:'block', marginBottom: 10, color: '#e74c3c'}}>📚 File Tài Liệu (PDF)</strong>
                   <div style={{display: 'flex', gap: 10}}>
                     <input type="text" placeholder="URL..." style={{flex: 1, padding:10, borderRadius:6, border:'1px solid #ddd'}} value={editingDocument.pdf_url || ''} onChange={e => setEditingDocument({...editingDocument, pdf_url: e.target.value})} />
                     <label style={{background: '#e74c3c', color: '#fff', padding: '10px 15px', borderRadius: 6, cursor: 'pointer'}}> Upload <input type="file" style={{display:'none'}} accept="application/pdf" onChange={(e) => handleUploadDocument(e, 'pdf_url')}/></label>
                   </div>
                </div>
                <div style={{display: 'flex', gap: 15, marginTop: 30}}>
                  <button type="submit" style={{flex: 1, padding: 15, background: '#c0392b', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer'}}>Xuất Bản</button>
                  <button type="button" style={{padding: 15, background: '#eee', border: 'none', borderRadius: 8, cursor: 'pointer'}} onClick={() => setEditingDocument(null)}>Hủy</button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
