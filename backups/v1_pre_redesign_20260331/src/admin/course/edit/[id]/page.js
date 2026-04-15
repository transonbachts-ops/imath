'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function EditCoursePage() {
  const params = useParams();
  const router = useRouter();
  const { id } = params;
  const isNew = id === 'new';

  const [loading, setLoading] = useState(!isNew);
  const [teachers, setTeachers] = useState([]);
  const [users, setUsers] = useState([]);
  const [userRole, setUserRole] = useState('admin');
  const [userId, setUserId] = useState(null);

  // Tags
  const [tags, setTags] = useState([]);
  const [newTagInput, setNewTagInput] = useState('');

  const [courseForm, setCourseForm] = useState({
    title: '', description: '', image_url: '',
    textbook_url: '', lesson_plan_url: '', lesson_plan_link: '',
    schedule_url: '', schedule_date: '',
    teacher_id: '', owner_id: ''
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const resMe = await fetch('/api/me');
      if (resMe.ok) {
        const me = await resMe.json();
        setUserRole(me.role);
        setUserId(me.userId);
      }
      const resT = await fetch('/api/admin/teachers');
      if (resT.ok) { const d = await resT.json(); setTeachers(d.teachers || []); }
      const resU = await fetch('/api/admin/users');
      if (resU.ok) { const d = await resU.json(); setUsers(d.users || []); }

      if (!isNew) {
        const resC = await fetch(`/api/admin/courses/${id}`);
        if (resC.ok) {
          const data = await resC.json();
          if (data.course) {
            const c = data.course;
            // Schedule date comes from DB as a full date string, we need just YYYY-MM-DD
            if (c.schedule_date) {
              c.schedule_date = c.schedule_date.split('T')[0];
            }
            setCourseForm(c);
          }
        }
        // Load tags for this course
        const resTag = await fetch(`/api/admin/tags?course_id=${id}`);
        if (resTag.ok) { const d = await resTag.json(); setTags(d.tags || []); }
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleUpload = async (e, field) => {
    const file = e.target.files[0];
    if (!file) return;
    setCourseForm(prev => ({ ...prev, [field]: '⏳ Đang tải lên...' }));
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/admin/upload', { method: 'POST', body: formData });
    const data = await res.json();
    if (res.ok) setCourseForm(prev => ({ ...prev, [field]: data.url }));
    else alert(data.error);
  };

  const handleAddTag = async () => {
    if (!newTagInput.trim()) return;
    const res = await fetch('/api/admin/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newTagInput.trim(), course_id: isNew ? null : id })
    });
    const data = await res.json();
    if (res.ok) {
      setTags(data.tags || []);
      setNewTagInput('');
    } else alert(data.error);
  };

  const handleDeleteTag = async (tagId) => {
    await fetch('/api/admin/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', id: tagId })
    });
    setTags(prev => prev.filter(t => t.id !== tagId));
  };

  const handleSaveCourse = async (e) => {
    e.preventDefault();
    const res = await fetch('/api/admin/courses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(courseForm)
    });
    if (res.ok) router.push('/admin');
    else alert('Có lỗi xảy ra khi lưu');
  };

  if (loading) return <div style={{ padding: 50, textAlign: 'center', fontSize: 18 }}>⏳ Đang tải dữ liệu khóa học...</div>;

  return (
    <div style={{ background: '#f0f4f8', minHeight: '100vh', padding: '40px 20px', fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <div style={{ maxWidth: 960, margin: '0 auto', background: '#fff', borderRadius: 24, boxShadow: '0 20px 60px rgba(0,0,0,0.07)', padding: '50px 60px' }}>

        {/* HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 35, borderBottom: '2px solid #eef0f3', paddingBottom: 20 }}>
          <h2 style={{ fontSize: 28, margin: 0, color: '#003380', fontWeight: 900 }}>
            {isNew ? '✨ Tạo Khoá Học Mới' : '✒️ Chỉnh Sửa Khoá Học'}
          </h2>
          <Link href="/admin" style={{ padding: '10px 22px', background: '#f0f0f0', borderRadius: 8, textDecoration: 'none', color: '#555', fontWeight: 'bold' }}>← Hủy Bỏ</Link>
        </div>

        <form onSubmit={handleSaveCourse}>

          {/* ===== TÊN + MÔ TẢ ===== */}
          <div style={{ marginBottom: 22 }}>
            <label style={labelStyle}>Tên Khoá Học *</label>
            <input required type="text" style={inputStyle}
              value={courseForm.title || ''} onChange={e => setCourseForm({ ...courseForm, title: e.target.value })}
              placeholder="Vd: Đại số & Hình học lớp 10" />
          </div>

          <div style={{ marginBottom: 28 }}>
            <label style={labelStyle}>Mô Tả Khoá Học</label>
            <textarea style={{ ...inputStyle, minHeight: 110, resize: 'vertical' }}
              value={courseForm.description || ''} onChange={e => setCourseForm({ ...courseForm, description: e.target.value })}
              placeholder="Mô tả chi tiết mục tiêu, nội dung và đối tượng phù hợp..." />
          </div>

          {/* ===== ẢNH BÌA ===== */}
          <SectionBox color="#003380" emoji="🎨" title="Ảnh Bìa Khoá Học">
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              {courseForm.image_url && !courseForm.image_url.startsWith('⏳') && (
                <img src={courseForm.image_url} alt="cover" style={{ width: 80, height: 50, objectFit: 'cover', borderRadius: 6, border: '1px solid #ddd' }} />
              )}
              <input type="text" placeholder="Dán URL ảnh..." style={{ flex: 1, ...inputStyle, marginBottom: 0 }}
                value={courseForm.image_url || ''} onChange={e => setCourseForm({ ...courseForm, image_url: e.target.value })} />
              <UploadBtn onChange={e => handleUpload(e, 'image_url')} accept="image/*" label="📤 Tải ảnh" color="#003380" />
            </div>
          </SectionBox>

          {/* ===== THỜI KHOÁ BIỂU ===== */}
          <SectionBox color="#e67e22" emoji="📅" title="Thời Khoá Biểu">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
              <div>
                <label style={{ fontSize: 13, color: '#888', display: 'block', marginBottom: 6 }}>📆 Chọn ngày học</label>
                <input type="date" style={inputStyle}
                  value={courseForm.schedule_date || ''}
                  onChange={e => setCourseForm({ ...courseForm, schedule_date: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: 13, color: '#888', display: 'block', marginBottom: 6 }}>📎 File lịch học (upload hoặc link)</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input type="text" placeholder="URL hoặc đường dẫn..." style={{ flex: 1, ...inputStyle, marginBottom: 0 }}
                    value={courseForm.schedule_url || ''} onChange={e => setCourseForm({ ...courseForm, schedule_url: e.target.value })} />
                  <UploadBtn onChange={e => handleUpload(e, 'schedule_url')} accept=".pdf,.doc,.docx,image/*" label="📤" color="#e67e22" />
                </div>
              </div>
            </div>
          </SectionBox>

          {/* ===== SGK ===== */}
          <SectionBox color="#8e44ad" emoji="📚" title="Sách Giáo Khoa (SGK)">
            <div style={{ display: 'flex', gap: 10 }}>
              <input type="text" placeholder="URL sách hoặc đường dẫn sau khi tải lên..." style={{ flex: 1, ...inputStyle, marginBottom: 0 }}
                value={courseForm.textbook_url || ''} onChange={e => setCourseForm({ ...courseForm, textbook_url: e.target.value })} />
              <UploadBtn onChange={e => handleUpload(e, 'textbook_url')} accept=".pdf,.doc,.docx" label="📤 Upload SGK" color="#8e44ad" />
            </div>
            <div style={{ fontSize: 12, color: '#888', marginTop: 6 }}>Hỗ trợ PDF, Word. Học sinh có thể tải về hoặc xem online.</div>
          </SectionBox>

          {/* ===== GIÁO ÁN ===== */}
          <SectionBox color="#1a885c" emoji="📝" title="Giáo Án">
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 13, color: '#555', display: 'block', marginBottom: 6 }}>🔗 Link giáo án (Google Drive, Dropbox...)</label>
              <input type="url" placeholder="https://..." style={inputStyle}
                value={courseForm.lesson_plan_link || ''} onChange={e => setCourseForm({ ...courseForm, lesson_plan_link: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: 13, color: '#555', display: 'block', marginBottom: 6 }}>📤 Hoặc upload file trực tiếp</label>
              <div style={{ display: 'flex', gap: 10 }}>
                <input type="text" placeholder="Đường dẫn file sau khi tải lên..." style={{ flex: 1, ...inputStyle, marginBottom: 0 }}
                  value={courseForm.lesson_plan_url || ''} onChange={e => setCourseForm({ ...courseForm, lesson_plan_url: e.target.value })} />
                <UploadBtn onChange={e => handleUpload(e, 'lesson_plan_url')} accept=".pdf,.doc,.docx,.pptx" label="📤 Upload File" color="#1a885c" />
              </div>
            </div>
          </SectionBox>

          {/* ===== GIẢNG VIÊN + CHỦ SỞ HỮU ===== */}
          <div style={{ display: 'grid', gridTemplateColumns: userRole === 'admin' ? '1fr 1fr' : '1fr', gap: 20, marginBottom: 28 }}>
            <div style={{ padding: 20, background: '#f0faf5', borderRadius: 12, border: '1px solid #c3e6cb' }}>
              <label style={{ ...labelStyle, color: '#1a885c' }}>👨‍🏫 Giảng viên phụ trách</label>
              <select value={courseForm.teacher_id || ''} onChange={e => setCourseForm({ ...courseForm, teacher_id: e.target.value })} style={inputStyle}>
                <option value="">-- Chưa chỉ định --</option>
                {teachers.map(t => <option key={t.id} value={t.id}>{t.name} — {t.role_title}</option>)}
              </select>
            </div>
            {userRole === 'admin' && (
              <div style={{ padding: 20, background: '#fff0f0', borderRadius: 12, border: '1px solid #f5c6cb' }}>
                <label style={{ ...labelStyle, color: '#c0392b' }}>🔑 Chủ Sở Hữu Khoá Học</label>
                <select value={courseForm.owner_id || ''} onChange={e => setCourseForm({ ...courseForm, owner_id: e.target.value })} style={inputStyle}>
                  <option value="">-- Thuộc về Admin --</option>
                  {users.filter(u => u.role === 'teacher').map(u => <option key={u.id} value={u.id}>{u.full_name} ({u.email})</option>)}
                </select>
              </div>
            )}
          </div>

          {/* ===== TAG PHÂN LOẠI ===== */}
          <SectionBox color="#1565c0" emoji="🏷️" title="Tags Phân Loại Kiến Thức">
            <div style={{ marginBottom: 15, fontSize: 13, color: '#555' }}>
              Tạo các tag phân loại tại đây. Khi soạn đề thi, giáo viên sẽ chọn tag từ danh sách này để AI phân tích năng lực học sinh.
            </div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
              <input type="text" placeholder="Nhập tên tag mới (vd: Hình học, Đại số...)"
                style={{ flex: 1, ...inputStyle, marginBottom: 0 }}
                value={newTagInput}
                onChange={e => setNewTagInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddTag())} />
              <button type="button" onClick={handleAddTag}
                style={{ background: '#1565c0', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                + Thêm Tag
              </button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {tags.length === 0 ? (
                <span style={{ color: '#aaa', fontSize: 14, fontStyle: 'italic' }}>Chưa có tag nào. Hãy tạo tag đầu tiên!</span>
              ) : tags.map(t => (
                <span key={t.id} style={{ background: '#e3f2fd', color: '#1565c0', padding: '6px 14px', borderRadius: 20, fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                  {t.name}
                  <button type="button" onClick={() => handleDeleteTag(t.id)}
                    style={{ background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 0 }}>×</button>
                </span>
              ))}
            </div>
          </SectionBox>

          {/* SUBMIT */}
          <div style={{ textAlign: 'center', marginTop: 40 }}>
            <button type="submit" style={{ padding: '16px 60px', background: 'linear-gradient(135deg, #003380, #1a56db)', color: '#fff', border: 'none', borderRadius: 30, fontWeight: 900, fontSize: 18, cursor: 'pointer', boxShadow: '0 8px 20px rgba(0,51,128,0.25)' }}>
              ✅ LƯU LẠI &amp; CẬP NHẬT
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---- Shared sub-components ----
function SectionBox({ color, emoji, title, children }) {
  return (
    <div style={{ padding: 22, background: `${color}08`, border: `1px solid ${color}30`, borderRadius: 12, marginBottom: 22 }}>
      <strong style={{ display: 'block', marginBottom: 14, color, fontSize: 15 }}>{emoji} {title}</strong>
      {children}
    </div>
  );
}

function UploadBtn({ onChange, accept, label, color }) {
  return (
    <label style={{ background: color, color: '#fff', padding: '10px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 'bold', whiteSpace: 'nowrap', flexShrink: 0 }}>
      {label}
      <input type="file" style={{ display: 'none' }} accept={accept} onChange={onChange} />
    </label>
  );
}

const labelStyle = { display: 'block', marginBottom: 8, fontWeight: 700, fontSize: 15, color: '#2c3e50' };
const inputStyle = { width: '100%', padding: '11px 14px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, boxSizing: 'border-box', marginBottom: 4, outline: 'none' };
