'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import QuestionBankTab from '@/app/components/QuestionBankTab';
import CalendarBoard from '@/app/dashboard/CalendarBoard';
import EventModal from '@/app/components/EventModal';
import AnalyticsAI from '@/app/components/AnalyticsAI';

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

  // Collaborator states
  const [managingCollaborators, setManagingCollaborators] = useState(null); // stores the course object
  const [collaborators, setCollaborators] = useState([]);
  const [newCollabEmail, setNewCollabEmail] = useState('');

  useEffect(() => {
    fetchInitialData();
    const interval = setInterval(fetchParentUnread, 15000);
    return () => clearInterval(interval);
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    await Promise.all([
        fetchUsers(),
        fetchCourses(),
        fetchEvents(),
        fetchDocuments(),
        fetchEnrollments(),
        fetchFeedbacks(),
        fetchTeachers(),
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
    } catch (e) { }
  };

  const fetchUsers = async () => {
    const res = await fetch('/api/admin/users');
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users || []);
    }
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
    } catch (e) { }
  };

  const fetchTeachers = async () => {
    try { const r = await fetch('/api/admin/teachers'); if (r.ok) { const d = await r.json(); setTeachers(d.teachers || []); } } catch (e) { }
  };

  const fetchGrades = async () => {
    try { const r = await fetch('/api/admin/grades'); if (r.ok) { const d = await r.json(); setGrades(d.grades || []); } } catch (e) { }
  };

  const fetchAnalytics = async () => {
    try { const r = await fetch('/api/admin/analytics'); if (r.ok) { const d = await r.json(); setAnalytics(d); } } catch (e) { }
  };

  const handleSaveTeacher = async (e) => {
    e.preventDefault();
    if (teacherForm.avatar_url === 'Đang tải...') { alert('Vui lòng đợi ảnh tải lên hoàn tất!'); return; }
    try {
      const res = await fetch('/api/admin/teachers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(teacherForm) });
      if (res.ok) {
        setEditingTeacher(null);
        setTeacherForm({ name: '', role_title: '', bio: '', avatar_url: '', fb_url: '', twitter_url: '', linkedin_url: '' });
        setTeacherPreview(null);
        fetchTeachers();
      }
    } catch (e) {}
  };

  const handleDeleteTeacher = async (id) => {
    if (!confirm('Xóa giảng viên này?')) return;
    await fetch('/api/admin/teachers', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    fetchTeachers();
  };

  const fetchCollaborators = async (courseId) => {
    const res = await fetch(`/api/admin/courses/${courseId}/collaborators`);
    if (res.ok) {
      const data = await res.json();
      setCollaborators(data.collaborators || []);
    }
  };

  const handleAddCollaborator = async () => {
    if (!newCollabEmail) return;
    const res = await fetch(`/api/admin/courses/${managingCollaborators.id}/collaborators`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_email: newCollabEmail })
    });
    if (res.ok) {
      setNewCollabEmail('');
      fetchCollaborators(managingCollaborators.id);
    } else {
      const data = await res.json();
      alert(data.error || 'Có lỗi xảy ra');
    }
  };

  const handleRemoveCollaborator = async (collabId) => {
    if (!confirm('Gỡ quyền cộng tác của người này?')) return;
    const res = await fetch(`/api/admin/courses/${managingCollaborators.id}/collaborators`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ collaborator_id: collabId })
    });
    if (res.ok) {
      fetchCollaborators(managingCollaborators.id);
    }
  };

  const exportGrades = () => {
    if (grades.length === 0) { alert('Không có điểm để xuất'); return; }
    const headers = ['Học sinh', 'Email', 'Khoá học', 'Bài kiểm tra', 'Điểm', 'Ngày nộp'];
    const rows = grades.map(g => [g.student_name, g.student_email, g.course_name, g.activity_name, g.score, new Date(g.submitted_at).toLocaleString('vi-VN')]);
    const csvContent = [headers, ...rows].map(r => r.map(c => '"' + String(c || '').replace(/"/g, '""') + '"').join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'diem_hoc_sinh_imath.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const handleRoleChange = async (id, newRole) => {
    if (!confirm(`Bạn có chắc muốn cấp vai trò ${newRole} cho người dùng này?`)) return;
    await fetch('/api/admin/users', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, role: newRole }) });
    fetchUsers();
  };

  const handleDelete = async (id) => {
    if (!confirm(`Hành động vĩnh viễn: Khóa vĩnh viễn học sinh này?`)) return;
    await fetch('/api/admin/users', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    fetchUsers();
  };

  const handleEnrollmentStatus = async (id, status) => {
    await fetch('/api/admin/enrollments', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) });
    fetchEnrollments();
  };

  const handleSaveCourse = async (e) => {
    e.preventDefault();
    await fetch('/api/admin/courses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editingCourse) });
    setEditingCourse(null);
    fetchCourses();
  };

  const handleDeleteCourse = async (id) => {
    if (!confirm(`Xóa Khóa học này?`)) return;
    await fetch('/api/admin/courses', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    fetchCourses();
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
    await fetch('/api/events', { method: 'DELETE', body: JSON.stringify({ id }) });
    fetchEvents();
  };

  const handleSaveDocument = async (e) => {
    e.preventDefault();
    await fetch('/api/admin/documents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editingDocument) });
    setEditingDocument(null);
    fetchDocuments();
  };

  const handleDeleteDocument = async (id) => {
    if (!confirm(`Xóa Ấn Phẩm / Tài Liệu này?`)) return;
    await fetch('/api/admin/documents', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    fetchDocuments();
  };

  const handleUploadCourse = async (e, field) => {
    const file = e.target.files[0];
    if (!file) return;
    setEditingCourse({ ...editingCourse, [field]: 'Đang tải file...' });
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/admin/upload', { method: 'POST', body: formData });
    const data = await res.json();
    if (res.ok) setEditingCourse({ ...editingCourse, [field]: data.url });
  };

  const handleUploadTeacher = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setTeacherPreview(URL.createObjectURL(file));
    setTeacherForm({ ...teacherForm, avatar_url: 'Đang tải...' });
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/admin/upload', { method: 'POST', body: formData });
    const data = await res.json();
    if (res.ok) setTeacherForm({ ...teacherForm, avatar_url: data.url });
  };

  const handleUploadDocument = async (e, field) => {
      const file = e.target.files[0];
      if (!file) return;
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/admin/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok) setEditingDocument({ ...editingDocument, [field]: data.url });
  };

  if (loading) return <div style={{ padding: 50, color: '#444', textAlign: 'center', background: '#f5f7fa', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 'bold' }}>⚡ Đang khởi tạo trung tâm điều hành...</div>;

  return (
    <div style={{ display: 'flex', background: '#f8fafc', minHeight: '100vh', color: '#0f172a', fontFamily: 'Inter, system-ui, sans-serif' }}>
      
      {/* SIDEBAR */}
      <aside style={{ width: '280px', background: '#1e293b', color: '#fff', padding: '40px 24px', display: 'flex', flexDirection: 'column', position: 'fixed', height: '100vh', zIndex: 100 }}>
        <div style={{ marginBottom: '50px', display: 'flex', alignItems: 'center', gap: '12px' }}>
           <div style={{ width: '40px', height: '40px', background: '#f8fafc', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>⚙️</div>
           <span style={{ fontSize: '20px', fontWeight: '900', background: 'linear-gradient(to right, #60a5fa, #fff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>iMath Admin</span>
        </div>

        <nav className="no-scrollbar" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', paddingRight: '5px' }}>
           <div style={sectionTitleStyle}>Đào tạo</div>
           <NavBtn active={tab === 'courses'} onClick={() => setTab('courses')} icon="📚" text="Khoá học" />
           <NavBtn active={tab === 'events'} onClick={() => setTab('events')} icon="📅" text="Lịch dạy" />
           <NavBtn active={tab === 'documents'} onClick={() => setTab('documents')} icon="📂" text="Tài liệu" />

           <div style={sectionTitleStyle}>Vận hành</div>
           <NavBtn active={tab === 'enrollments'} onClick={() => setTab('enrollments')} icon="✅" text="Phê duyệt" />
           <NavBtn active={tab === 'grades'} onClick={() => setTab('grades')} icon="🏆" text="Điểm số" />
           <NavBtn active={tab === 'analytics'} onClick={() => setTab('analytics')} icon="📊" text="Thống kê" />
           <NavBtn active={tab === 'question-bank'} onClick={() => setTab('question-bank')} icon="📓" text="Ngân hàng" />
           <NavBtn active={tab === 'feedbacks'} onClick={() => setTab('feedbacks')} icon="💬" text="Phản hồi" />

           <div style={sectionTitleStyle}>Hệ thống</div>
           <NavBtn active={tab === 'users'} onClick={() => setTab('users')} icon="👥" text="Tài khoản" />
           <NavBtn active={tab === 'teachers'} onClick={() => setTab('teachers')} icon="👨‍🏫" text="Giảng viên" />
           <NavBtn active={tab === 'ai-access'} onClick={() => setTab('ai-access')} icon="🤖" text="Quyền AI" />

           <div style={sectionTitleStyle}>Liên kết</div>
           <Link href="/messages" style={navLinkStyle(false)}>
              <span>✉️</span> Liên lạc 
              {parentUnread > 0 && <span style={badgeStyle}>{parentUnread}</span>}
           </Link>
           <Link href="/studio" target="_blank" style={navLinkStyle(false)}><span>🕹️</span> iMath Studio</Link>
        </nav>

        <Link href="/dashboard" style={{ marginTop: 'auto', textAlign: 'center', color: '#94a3b8', textDecoration: 'none', fontSize: '14px', padding: '15px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)' }}>
           ← Quay lại trang học
        </Link>
      </aside>

      {/* MAIN CONTENT */}
      <main style={{ flex: 1, marginLeft: '280px', padding: '40px 60px' }}>
        
        {/* SUMMARY STRIP */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '25px', marginBottom: '40px' }}>
           <SummaryCard title="Người dùng" value={users.length} icon="👥" color="#3b82f6" />
           <SummaryCard title="Đơn đăng ký" value={enrollments.length} icon="📝" color="#10b981" />
           <SummaryCard title="Khóa học" value={courses.length} icon="📘" color="#f59e0b" />
           <SummaryCard title="Giảng viên" value={teachers.length} icon="👨‍🏫" color="#8b5cf6" />
        </div>

        <div style={{ maxWidth: '1200px' }}>
          {tab === 'users' && (
            <div style={cardStyle}>
              <h3 style={cardTitleStyle}>Danh sách nhân sự toàn hệ thống</h3>
              <table style={tableStyle}>
                <thead style={theadStyle}>
                  <tr>
                    <th style={thStyle}>ID</th>
                    <th style={thStyle}>Họ & Tên</th>
                    <th style={thStyle}>Email</th>
                    <th style={thStyle}>Vai trò</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} style={trStyle}>
                      <td style={tdStyle}>#{u.id}</td>
                      <td style={{ ...tdStyle, fontWeight: '800' }}>{u.full_name}</td>
                      <td style={tdStyle}>{u.email}</td>
                      <td style={tdStyle}>
                        <span style={roleBadgeStyle(u.role)}>
                          {u.role === 'admin' ? 'QUẢN TRỊ' : u.role === 'teacher' ? 'GIÁO VIÊN' : u.role === 'parent' ? 'PHỤ HUYNH' : 'HỌC SINH'}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                          <select onChange={(e) => handleRoleChange(u.id, e.target.value)} value={u.role} style={selectStyle}>
                            <option value="student">Học Sinh</option>
                            <option value="parent">Phụ Huynh</option>
                            <option value="teacher">Giảng Viên</option>
                            <option value="admin">Quản Trị</option>
                          </select>
                          <button style={deleteBtnStyle} onClick={() => handleDelete(u.id)}>Khóa</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'ai-access' && (
            <div style={cardStyle}>
              <h3 style={cardTitleStyle}>🤖 Phân Quyền iMath AI</h3>
              <table style={tableStyle}>
                <thead style={theadStyle}>
                  <tr>
                    <th style={thStyle}>Họ & Tên</th>
                    <th style={thStyle}>Email</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>Quyền truy cập AI</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} style={trStyle}>
                      <td style={{ ...tdStyle, fontWeight: '700' }}>{u.full_name}</td>
                      <td style={tdStyle}>{u.email}</td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <label style={toggleStyle(u.can_use_ai)}>
                          <input type="checkbox" checked={!!u.can_use_ai} onChange={async (e) => {
                            const val = e.target.checked;
                            await fetch('/api/admin/users', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: u.id, can_use_ai: val, update_ai_only: true }) });
                            fetchUsers();
                          }} style={{ marginRight: 8 }} />
                          {u.can_use_ai ? '✅ Đã kích hoạt' : '❌ Đang chặn'}
                        </label>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'enrollments' && (
            <div style={cardStyle}>
              <h3 style={cardTitleStyle}>Yêu cầu gia nhập lớp học</h3>
              <table style={tableStyle}>
                <thead style={theadStyle}>
                  <tr>
                    <th style={thStyle}>Học Viên</th>
                    <th style={thStyle}>Khóa Học</th>
                    <th style={thStyle}>Thời gian</th>
                    <th style={thStyle}>Trạng thái</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Phê duyệt</th>
                  </tr>
                </thead>
                <tbody>
                  {enrollments.map(e => (
                    <tr key={e.id} style={trStyle}>
                      <td style={tdStyle}>
                        <div style={{ fontWeight: 700 }}>{e.student_name}</div>
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>{e.student_email}</div>
                      </td>
                      <td style={{ ...tdStyle, color: '#3b82f6', fontWeight: 800 }}>{e.course_title}</td>
                      <td style={tdStyle}>{new Date(e.created_at).toLocaleDateString('vi-VN')}</td>
                      <td style={tdStyle}>
                         <span style={statusBadgeStyle(e.status)}>
                            {e.status === 'approved' ? 'XONG' : e.status === 'rejected' ? 'HỦY' : 'CHỜ'}
                         </span>
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                          {e.status !== 'approved' && <button style={approveBtnStyle} onClick={() => handleEnrollmentStatus(e.id, 'approved')}>Duyệt</button>}
                          {e.status !== 'rejected' && <button style={rejectBtnStyle} onClick={() => handleEnrollmentStatus(e.id, 'rejected')}>X</button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'courses' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <h2 style={{ fontSize: '26px', fontWeight: '900' }}>Toàn bộ khóa học</h2>
                <Link href="/admin/course/manage/new" style={primaryBtnStyle}>+ Khởi tạo mới</Link>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '25px' }}>
                {courses.map(c => <AdminCourseCard key={c.id} course={c} onDelete={() => handleDeleteCourse(c.id)} onManageCollaborators={() => { setManagingCollaborators(c); fetchCollaborators(c.id); }} />)}
              </div>
            </div>
          )}

          {tab === 'events' && (
            <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                  <h2 style={{ fontSize: '26px', fontWeight: '900' }}>Lịch học toàn hệ thống</h2>
                  <button onClick={() => setShowEventModal(true)} style={primaryBtnStyle}>+ Thêm lịch học</button>
               </div>
               <div style={{ background: '#fff', borderRadius: '24px', padding: '30px', boxShadow: '0 10px 40px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9', marginBottom: '40px' }}>
                  <CalendarBoard variant="full" />
               </div>
               <div style={cardStyle}>
                  <table style={tableStyle}>
                    <thead style={theadStyle}>
                      <tr>
                        <th style={thStyle}>Ngày</th>
                        <th style={thStyle}>Hình Thức</th>
                        <th style={thStyle}>Tiêu Đề</th>
                        <th style={{ ...thStyle, textAlign: 'right' }}>Hành động</th>
                      </tr>
                    </thead>
                    <tbody>
                      {events.map(e => (
                        <tr key={e.id} style={trStyle}>
                          <td style={{ ...tdStyle, fontWeight: 'bold' }}>{new Date(e.date).toLocaleDateString('vi-VN')}</td>
                          <td style={tdStyle}>
                             <span style={eventBadgeStyle(e.type)}>{e.type === 'zoom' ? '📹 ZOOM' : '📝 BTVN'}</span>
                          </td>
                          <td style={tdStyle}>
                             <div style={{ fontWeight: 800 }}>{e.title}</div>
                             <div style={{ fontSize: 11, color: '#94a3b8' }}>{courses.find(c => c.id === e.course_id)?.title || 'Chung'}</div>
                          </td>
                          <td style={{ ...tdStyle, textAlign: 'right' }}>
                             <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                                <button onClick={() => handleEditEvent(e)} style={{ ...selectStyle, cursor: 'pointer' }}>Sửa</button>
                                <button onClick={() => handleDeleteEvent(e.id)} style={deleteBtnStyle}>Xóa</button>
                             </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
               </div>
            </div>
          )}

          {tab === 'documents' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <h2 style={{ fontSize: '26px', fontWeight: '900' }}>Thư viện tài liệu</h2>
                <button onClick={() => setEditingDocument({ title: '', cover_image_url: '', introduction: '', pdf_url: '', table_of_contents: '' })} style={primaryBtnStyle}>+ Xuất bản mới</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '25px' }}>
                {documents.map(d => <AdminDocCard key={d.id} doc={d} onEdit={() => setEditingDocument(d)} onDelete={() => handleDeleteDocument(d.id)} />)}
              </div>
            </div>
          )}

          {tab === 'teachers' && (
            <div style={cardStyle}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', padding: '10px' }}>
                  <h3 style={{ fontSize: '24px', fontWeight: '900', margin: 0 }}>Đội ngũ giảng viên</h3>
                  <button onClick={() => { setEditingTeacher(true); setTeacherForm({ name: '', role_title: '', bio: '', avatar_url: '', fb_url: '', twitter_url: '', linkedin_url: '' }); }} style={primaryBtnStyle}>+ Thêm giảng viên</button>
               </div>
               
               {editingTeacher && (
                <form onSubmit={handleSaveTeacher} style={formBoxStyle}>
                   <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '30px' }}>
                      <div style={{ textAlign: 'center' }}>
                         <div style={avatarPreviewStyle}>
                            {teacherPreview || teacherForm.avatar_url ? <img src={teacherPreview || teacherForm.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '👤'}
                         </div>
                         <label style={uploadBtnStyle}>Upload <input type="file" style={{ display: 'none' }} onChange={handleUploadTeacher} /></label>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                         <input placeholder="Tên giảng viên" value={teacherForm.name} onChange={e => setTeacherForm({ ...teacherForm, name: e.target.value })} style={inputStyle} />
                         <input placeholder="Chức danh" value={teacherForm.role_title} onChange={e => setTeacherForm({ ...teacherForm, role_title: e.target.value })} style={inputStyle} />
                         <textarea placeholder="Bio giới thiệu" value={teacherForm.bio} onChange={e => setTeacherForm({ ...teacherForm, bio: e.target.value })} style={{ ...inputStyle, gridColumn: 'span 2' }} rows={3} />
                         <div style={{ display: 'flex', gap: 10, gridColumn: 'span 2', justifyContent: 'flex-end' }}>
                            <button type="submit" style={saveBtnStyle}>Lưu thông tin</button>
                            <button type="button" onClick={() => setEditingTeacher(null)} style={cancelBtnStyle}>Hủy</button>
                         </div>
                      </div>
                   </div>
                </form>
               )}

               <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                  {teachers.map(t => (
                    <div key={t.id} style={teacherMiniCardStyle}>
                       <img src={t.avatar_url} style={{ width: 50, height: 50, borderRadius: 12, objectFit: 'cover' }} />
                       <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 800 }}>{t.name}</div>
                          <div style={{ fontSize: 11, color: '#3b82f6' }}>{t.role_title}</div>
                       </div>
                       <div style={{ display: 'flex', gap: 5 }}>
                         <button onClick={() => { setEditingTeacher(true); setTeacherForm(t); }} style={iconBtnStyle}>✏️</button>
                         <button onClick={() => handleDeleteTeacher(t.id)} style={iconBtnStyle}>🗑️</button>
                       </div>
                    </div>
                  ))}
               </div>
            </div>
          )}

          {tab === 'feedbacks' && (
            <div style={cardStyle}>
               <h3 style={cardTitleStyle}>Ý kiến từ học sinh</h3>
               <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  {feedbacks.map(fb => (
                    <div key={fb.id} style={fbItemStyle}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                           <span style={{ fontWeight: 800 }}>{fb.full_name}</span>
                           <span style={{ color: '#94a3b8', fontSize: '11px' }}>{new Date(fb.created_at).toLocaleDateString('vi-VN')}</span>
                        </div>
                        <div style={{ marginBottom: '10px' }}>{'⭐'.repeat(fb.rating || 5)}</div>
                        <p style={{ margin: 0, fontSize: '14px', color: '#475569' }}>{fb.message}</p>
                    </div>
                  ))}
               </div>
            </div>
          )}

          {tab === 'question-bank' && <QuestionBankTab />}
          {tab === 'grades' && (
            <div style={cardStyle}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                  <h3 style={cardTitleStyle}>Bảng điểm toàn hệ thống</h3>
                  <button onClick={exportGrades} style={primaryBtnStyle}>📥 Xuất Excel (CSV)</button>
               </div>
               
               <div style={{ padding: '15px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: 15 }}>
                  <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#64748b' }}>🔍 Tổng số bản ghi:</span>
                  <span style={{ background: '#3b82f6', color: '#fff', padding: '2px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '900' }}>{grades.length}</span>
               </div>

               <table style={tableStyle}>
                  <thead style={theadStyle}>
                    <tr>
                      <th style={thStyle}>Học Viên</th>
                      <th style={thStyle}>Khóa Học / Hoạt động</th>
                      <th style={{ ...thStyle, textAlign: 'center' }}>Điểm số</th>
                      <th style={thStyle}>Loại bài</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Ngày nộp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grades.length === 0 ? (
                      <tr><td colSpan="5" style={{ padding: '50px', textAlign: 'center', color: '#94a3b8' }}>Chưa có dữ liệu điểm số nào.</td></tr>
                    ) : grades.map((g, idx) => (
                      <tr key={idx} style={trStyle}>
                        <td style={tdStyle}>
                           <div style={{ fontWeight: 800 }}>{g.student_name}</div>
                           <div style={{ fontSize: 11, color: '#94a3b8' }}>{g.student_email}</div>
                        </td>
                        <td style={tdStyle}>
                           <div style={{ color: '#0f172a', fontWeight: '700', fontSize: '13px' }}>{g.course_name}</div>
                           <div style={{ color: '#3b82f6', fontSize: '12px' }}>{g.activity_name}</div>
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                           <span style={{ 
                             background: g.score >= 5 ? '#dcfce7' : '#fee2e2', 
                             color: g.score >= 5 ? '#16a34a' : '#ef4444',
                             padding: '6px 12px', borderRadius: '10px', fontWeight: '900', border: g.score >= 5 ? '1px solid #bbfcce' : '1px solid #fecaca'
                           }}>
                             {Number(g.score).toFixed(1)} / 10
                           </span>
                        </td>
                        <td style={tdStyle}>
                           <span style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', color: g.type === 'daily' ? '#f59e0b' : '#3b82f6' }}>
                             {g.type === 'daily' ? 'Hằng ngày' : 'Chính thức'}
                           </span>
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'right', color: '#64748b', fontSize: '12px' }}>
                           {new Date(g.submitted_at).toLocaleString('vi-VN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
               </table>
            </div>
          )}

          {tab === 'analytics' && analytics && (
             <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px', marginBottom: '30px' }}>
                   <div style={cardStyle}>
                      <h3 style={{ ...cardTitleStyle, fontSize: '18px' }}>🚀 Điểm trung bình hệ thống</h3>
                      <div style={{ fontSize: '48px', fontWeight: '900', color: '#3b82f6' }}>{analytics.globalAverageScore} <span style={{ fontSize: '20px', color: '#94a3b8' }}>/ 10</span></div>
                      <p style={{ color: '#64748b', fontSize: '14px' }}>Dựa trên tất cả các bài thi trắc nghiệm hiện có.</p>
                   </div>
                   <div style={cardStyle}>
                      <h3 style={{ ...cardTitleStyle, fontSize: '18px' }}>🔥 Tỉ lệ tham gia</h3>
                      <div style={{ fontSize: '48px', fontWeight: '900', color: '#10b981' }}>{analytics.participationRate}%</div>
                      <div style={{ width: '100%', height: '8px', background: '#f1f5f9', borderRadius: '10px', marginTop: '10px' }}>
                         <div style={{ width: `${analytics.participationRate}%`, height: '100%', background: '#10b981', borderRadius: '10px' }}></div>
                      </div>
                   </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '25px' }}>
                   <div style={cardStyle}>
                      <h3 style={cardTitleStyle}>📊 Phổ điểm học sinh (1-10)</h3>
                      <ScoreDistributionChart data={analytics.scoreDistribution} />
                   </div>

                   <div style={cardStyle}>
                      <h3 style={cardTitleStyle}>🏆 Top Học sinh</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                         {analytics.topStudents.map((s, i) => (
                           <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', background: '#f8fafc', borderRadius: '12px' }}>
                              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>{i + 1}</div>
                              <div style={{ flex: 1 }}>
                                 <div style={{ fontSize: '14px', fontWeight: '800' }}>{s.full_name}</div>
                                 <div style={{ fontSize: '11px', color: '#64748b' }}>{s.total_tests} bài thi</div>
                              </div>
                              <div style={{ color: '#3b82f6', fontWeight: '900' }}>{parseFloat(s.avg_score).toFixed(1)}</div>
                           </div>
                         ))}
                      </div>
                   </div>
                </div>

                <AnalyticsAI analytics={analytics} />
             </div>
          )}
        </div>
      </main>

      {/* MODALS (Simplified versions matching new UI) */}
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
      {editingDocument && <DocModal doc={editingDocument} setDoc={setEditingDocument} onSave={handleSaveDocument} onClose={() => setEditingDocument(null)} />}
      
      {managingCollaborators && (
        <CollaboratorModal 
          course={managingCollaborators} 
          collaborators={collaborators}
          users={users.filter(u => u.role === 'teacher')}
          email={newCollabEmail}
          setEmail={setNewCollabEmail}
          onAdd={handleAddCollaborator}
          onRemove={handleRemoveCollaborator}
          onClose={() => setManagingCollaborators(null)} 
        />
      )}

      <style jsx global>{`
        /* Hide scrollbars but allow scrolling for a premium app-like feel */
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
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

// STYLES & SUB-COMPONENTS
const sectionTitleStyle = { fontSize: 11, fontWeight: '900', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', marginTop: '20px', paddingLeft: '15px', letterSpacing: '1px' };
const NavBtn = ({ active, onClick, icon, text }) => (
  <button onClick={onClick} style={navLinkStyle(active)}>
    <span>{icon}</span> {text}
  </button>
);

const navLinkStyle = (active) => ({
  width: '100%', padding: '12px 18px', borderRadius: '12px', border: 'none', textAlign: 'left', cursor: 'pointer',
  background: active ? '#3b82f6' : 'transparent',
  color: active ? '#fff' : '#94a3b8', fontSize: '14px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '15px',
  transition: '0.2s', textDecoration: 'none'
});

const badgeStyle = { background: '#ef4444', color: '#fff', fontSize: '10px', padding: '2px 8px', borderRadius: '10px', marginLeft: 'auto', fontWeight: '900' };

const SummaryCard = ({ title, value, icon, color }) => (
  <div style={{ background: '#fff', padding: '25px', borderRadius: '24px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '20px' }}>
    <div style={{ width: '50px', height: '50px', borderRadius: '15px', background: color + '15', color: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>{icon}</div>
    <div>
      <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '900', textTransform: 'uppercase' }}>{title}</div>
      <div style={{ fontSize: '24px', fontWeight: '900' }}>{value}</div>
    </div>
  </div>
);

 const AdminCourseCard = ({ course, onDelete, onManageCollaborators }) => (
  <div style={{ background: '#fff', borderRadius: '24px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
     <div style={{ height: '160px', background: course.image_url ? `url('${course.image_url}') center/cover` : '#f1f5f9' }} />
     <div style={{ padding: '25px' }}>
        <h4 style={{ fontSize: '19px', fontWeight: '900', marginBottom: '10px' }}>{course.title}</h4>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
           <Link href={`/admin/course/manage/${course.id}`} style={{ flex: 1, padding: '10px', background: '#3b82f6', color: '#fff', borderRadius: '10px', textAlign: 'center', textDecoration: 'none', fontWeight: 'bold', fontSize: '13px', minWidth: '100px' }}>⚙️ Quản lý</Link>
           <button onClick={onManageCollaborators} style={{ padding: '10px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>👥 Cộng tác</button>
           <button onClick={onDelete} style={{ padding: '10px', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '10px', cursor: 'pointer' }}>🗑️</button>
        </div>
     </div>
  </div>
);

const AdminDocCard = ({ doc, onEdit, onDelete }) => (
    <div style={{ background: '#fff', borderRadius: '24px', padding: '20px', border: '1px solid #e2e8f0', display: 'flex', gap: '15px', alignItems: 'center' }}>
       <div style={{ width: '60px', height: '80px', background: doc.cover_image_url ? `url('${doc.cover_image_url}') center/cover` : '#f1f5f9', borderRadius: '6px' }} />
       <div style={{ flex: 1 }}>
          <div style={{ fontWeight: '800', fontSize: '15px' }}>{doc.title}</div>
          <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
             <button onClick={onEdit} style={{ background: 'none', border: 'none', color: '#3b82f6', fontWeight: 'bold', fontSize: '12px' }}>✏️ Sửa</button>
             <button onClick={onDelete} style={{ background: 'none', border: 'none', color: '#ef4444', fontWeight: 'bold', fontSize: '12px' }}>🗑️ Thu hồi</button>
          </div>
       </div>
    </div>
);

// MODALS (Helper sub-components)

const DocModal = ({ doc, setDoc, onSave, onClose }) => (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
       <div style={{ background: '#fff', padding: '35px', borderRadius: '30px', width: '600px' }}>
          <h3 style={{ fontSize: '22px', fontWeight: '900', marginBottom: '25px' }}>📚 Ấn phẩm mới</h3>
          <input placeholder="Tên tài liệu" value={doc.title} onChange={e => setDoc({...doc, title: e.target.value})} style={inputStyle} />
          <textarea placeholder="Giới thiệu" value={doc.introduction} onChange={e => setDoc({...doc, introduction: e.target.value})} style={{...inputStyle, minHeight: 100}} />
          <button onClick={onSave} style={{ ...primaryBtnStyle, width: '100%', justifyContent: 'center', marginTop: '20px' }}>Xuất bản</button>
          <button onClick={onClose} style={{ border: 'none', background: 'none', width: '100%', marginTop: '10px', color: '#64748b' }}>Hủy bỏ</button>
       </div>
    </div>
);

// CSS Object Styles
const cardStyle = { background: '#fff', borderRadius: '24px', padding: '35px', border: '1px solid #e2e8f0', marginBottom: '30px' };
const cardTitleStyle = { fontSize: '22px', fontWeight: '900', marginBottom: '25px' };
const tableStyle = { width: '100%', borderCollapse: 'collapse' };
const theadStyle = { background: '#f8fafc' };
const thStyle = { padding: '15px 20px', textAlign: 'left', color: '#64748b', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase' };
const trStyle = { borderBottom: '1px solid #f1f5f9' };
const tdStyle = { padding: '15px 20px', fontSize: '14px' };
const roleBadgeStyle = (role) => ({ padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '900', background: role==='admin'?'#fee2e2':role==='teacher'?'#ffedd5':role==='parent'?'#e0e7ff':'#dcfce7', color: role==='admin'?'#ef4444':role==='teacher'?'#f97316':role==='parent'?'#4f46e5':'#10b981' });
const statusBadgeStyle = (status) => ({ padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: '900', background: status === 'approved' ? '#dcfce7' : '#fee2e2', color: status === 'approved' ? '#16a34a' : '#ef4444' });
const eventBadgeStyle = (type) => ({ fontSize: '11px', fontWeight: '900', color: type === 'zoom' ? '#3b82f6' : '#10b981' });
const toggleStyle = (active) => ({ display: 'inline-flex', alignItems: 'center', cursor: 'pointer', background: active ? '#dcfce7' : '#fee2e2', padding: '6px 14px', borderRadius: '20px', fontWeight: '800', fontSize: '12px', color: active ? '#166534' : '#ef4444' });
const selectStyle = { padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0', fontWeight: 'bold', fontSize: '12px' };
const deleteBtnStyle = { background: '#fee2e2', color: '#ef4444', border: 'none', padding: '8px 15px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' };
const approveBtnStyle = { background: '#dcfce7', color: '#16a34a', border: 'none', padding: '8px 15px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' };
const rejectBtnStyle = { background: '#fee2e2', color: '#ef4444', border: 'none', padding: '8px 15px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' };
const primaryBtnStyle = { background: '#3b82f6', color: '#fff', border: 'none', padding: '12px 25px', borderRadius: '14px', fontWeight: '900', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' };
const inputStyle = { width: '100%', padding: '12px 18px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '15px' };
const formBoxStyle = { background: '#f8fafc', padding: '30px', borderRadius: '24px', border: '1px solid #e2e8f0', marginBottom: '30px' };
const avatarPreviewStyle = { width: '100px', height: '100px', borderRadius: '24px', background: '#fff', border: '2px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px', marginBottom: '15px', overflow: 'hidden' };
const uploadBtnStyle = { background: '#1e293b', color: '#fff', padding: '6px 15px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' };
const saveBtnStyle = { background: '#10b981', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' };
const cancelBtnStyle = { background: '#94a3b8', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' };
const teacherMiniCardStyle = { display: 'flex', gap: '15px', alignItems: 'center', padding: '15px', background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0' };
const iconBtnStyle = { background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' };
const fbItemStyle = { background: '#f8fafc', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0' };
 
const CollaboratorModal = ({ course, collaborators, users, email, setEmail, onAdd, onRemove, onClose }) => (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
       <div style={{ background: '#fff', padding: '35px', borderRadius: '30px', width: '500px', maxHeight: '80vh', overflowY: 'auto' }}>
          <h3 style={{ fontSize: '22px', fontWeight: '900', marginBottom: '10px' }}>👥 Người cùng chỉnh sửa</h3>
          <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '25px' }}>Khóa học: <strong>{course.title}</strong></p>
          
          <div style={{ display: 'flex', gap: '10px', marginBottom: '25px' }}>
             <select value={email} onChange={e => setEmail(e.target.value)} style={{ ...inputStyle, marginBottom: 0 }}>
               <option value="">-- Chọn giáo viên hệ thống --</option>
               {users.map(u => <option key={u.id} value={u.email}>{u.full_name} ({u.email})</option>)}
             </select>
             <button onClick={onAdd} style={primaryBtnStyle}>Thêm</button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
             {collaborators.length === 0 ? (
               <p style={{ textAlign: 'center', color: '#94a3b8', padding: '20px' }}>Chưa có người cộng tác nào.</p>
             ) : collaborators.map(c => (
               <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 15px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div>
                    <div style={{ fontWeight: '800', fontSize: '14px' }}>{c.full_name}</div>
                    <div style={{ color: '#94a3b8', fontSize: '11px' }}>{c.email}</div>
                  </div>
                  <button onClick={() => onRemove(c.id)} style={{ color: '#ef4444', background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer' }}>×</button>
               </div>
             ))}
          </div>

          <button onClick={onClose} style={{ border: 'none', background: 'none', width: '100%', marginTop: '30px', color: '#64748b', fontWeight: 'bold' }}>Đóng lại</button>
       </div>
    </div>
);
