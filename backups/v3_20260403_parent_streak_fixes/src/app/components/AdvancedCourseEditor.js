'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdvancedCourseEditor({ courseId }) {
  const router = useRouter();
  const isNew = courseId === 'new';

  const [loading, setLoading] = useState(!isNew);
  const [activeTab, setActiveTab] = useState('content'); // 'info' or 'content'

  // Course Data
  const [course, setCourse] = useState({
    title: '', description: '', image_url: '',
    textbook_url: '', lesson_plan_url: '', lesson_plan_link: '',
    schedule_url: '', schedule_date: '', schedule_date_end: '',
    teacher_id: '', owner_id: ''
  });
  const [modules, setModules] = useState([]);
  const [activities, setActivities] = useState([]);
  
  // Auxiliary Data
  const [teachers, setTeachers] = useState([]);
  const [users, setUsers] = useState([]);
  const [userRole, setUserRole] = useState('admin');
  const [tags, setTags] = useState([]);
  const [newTagInput, setNewTagInput] = useState('');

  // UI State
  const [draggingItem, setDraggingItem] = useState(null); // { type: 'module'|'activity', id, index }
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [currentModuleId, setCurrentModuleId] = useState(null);
  const [editingActivity, setEditingActivity] = useState(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null);

  useEffect(() => {
    fetchInitialData();
  }, [courseId]);

  const fetchInitialData = async () => {
    try {
      const [resMe, resT, resU] = await Promise.all([
        fetch('/api/me'),
        fetch('/api/admin/teachers'),
        fetch('/api/admin/users')
      ]);
      
      if (resMe.ok) { const d = await resMe.json(); setUserRole(d.role); }
      if (resT.ok) { const d = await resT.json(); setTeachers(d.teachers || []); }
      if (resU.ok) { const d = await resU.json(); setUsers(d.users || []); }

      if (!isNew) {
        const res = await fetch(`/api/admin/courses/${courseId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.course) {
            const c = data.course;
            if (c.schedule_date) c.schedule_date = c.schedule_date.split('T')[0];
            if (c.schedule_date_end) c.schedule_date_end = c.schedule_date_end.split('T')[0];
            setCourse(c);
          }
          setModules(data.modules || []);
          setActivities(data.activities || []);
        }
        
        const resTag = await fetch(`/api/admin/tags?course_id=${courseId}`);
        if (resTag.ok) { const d = await resTag.json(); setTags(d.tags || []); }
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  // --- SAVE HANDLERS ---
  const handleSaveCourse = async () => {
    const res = await fetch('/api/admin/courses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(course)
    });
    if (res.ok) {
      if (isNew) {
         const data = await res.json();
         router.push(`/admin/course/manage/${data.id}`);
      } else {
         alert('Đã lưu thông tin khóa học!');
      }
    } else alert('Lỗi khi lưu.');
  };

  // --- MODULE HANDLERS ---
  const addModule = async () => {
    const res = await fetch('/api/modules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ course_id: courseId, title: 'Chương mới', order_index: modules.length })
    });
    if (res.ok) {
      const data = await res.json();
      setModules([...modules, data]);
    }
  };

  const deleteModule = async (id) => {
    if (!confirm('Xóa chương này và tất cả nội dung bên trong?')) return;
    await fetch(`/api/modules/${id}`, { method: 'DELETE' });
    setModules(modules.filter(m => m.id !== id));
    setActivities(activities.filter(a => a.module_id !== id));
  };

  const updateModuleTitle = async (id, title) => {
    setModules(prev => prev.map(m => m.id === id ? { ...m, title } : m));
    await fetch(`/api/modules/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title })
    });
  };

  // --- ACTIVITY HANDLERS ---
  const openAddActivity = (moduleId) => {
    setCurrentModuleId(moduleId);
    setEditingActivity({ title: '', type: 'resource', url: '', details: '', module_id: moduleId });
    setShowActivityModal(true);
  };

  const saveActivity = async () => {
    const isEdit = !!editingActivity.id;
    const url = isEdit ? `/api/activities/${editingActivity.id}` : '/api/activities';
    const method = isEdit ? 'PUT' : 'POST';
    
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingActivity)
    });
    
    if (res.ok) {
      const data = await res.json();
      if (isEdit) {
        setActivities(prev => prev.map(a => a.id === data.id ? data : a));
      } else {
        setActivities([...activities, data]);
      }
      setShowActivityModal(false);
    }
  };

  const deleteActivity = async (id) => {
    if (!confirm('Xóa nội dung này?')) return;
    await fetch(`/api/activities/${id}`, { method: 'DELETE' });
    setActivities(activities.filter(a => a.id !== id));
  };

  // --- DRAG & DROP LOGIC (Native) ---
  const onDragStart = (e, type, item, index) => {
    setDraggingItem({ type, item, index });
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = (e) => {
     e.preventDefault();
     e.dataTransfer.dropEffect = 'move';
  };

  const onDrop = async (e, targetType, targetIndex, targetModuleId = null) => {
    e.preventDefault();
    if (!draggingItem) return;
    if (draggingItem.type !== targetType) return;

    if (targetType === 'module') {
      const newModules = [...modules];
      const [moved] = newModules.splice(draggingItem.index, 1);
      newModules.splice(targetIndex, 0, moved);
      
      // Update locally
      const updated = newModules.map((m, i) => ({ ...m, order_index: i }));
      setModules(updated);
      
      // Persist (Simplified: Loop through and update. Better would be a bulk endpoint)
      await Promise.all(updated.map(m => 
        fetch(`/api/modules/${m.id}`, {
          method: 'PUT',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ order_index: m.order_index, title: m.title })
        })
      ));
    } else if (targetType === 'activity') {
      const targetModId = targetModuleId;
      let newActivities = [...activities];
      const sourceIdx = newActivities.findIndex(a => a.id === draggingItem.item.id);
      if (sourceIdx === -1) return;
      const [moved] = newActivities.splice(sourceIdx, 1);
      
      moved.module_id = targetModId;
      
      // Re-order within target module
      const otherActivities = newActivities.filter(a => a.module_id !== targetModId);
      const targetModuleActivities = newActivities.filter(a => a.module_id === targetModId);
      
      targetModuleActivities.splice(targetIndex, 0, moved);
      
      // Assign new order indices
      const reorderedTarget = targetModuleActivities.map((a, i) => ({ ...a, order_index: i }));
      
      setActivities([...otherActivities, ...reorderedTarget]);
      
      // Persist: only the moved item is strictly necessary, but bulk update is better.
      // For simplicity, we just update the moved item's module and order.
      await fetch(`/api/activities/${moved.id}`, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ ...moved, module_id: targetModId, order_index: targetIndex })
      });
    }
    setDraggingItem(null);
  };

  if (loading) return <div style={{ padding: 100, textAlign: 'center' }}>🚀 Đang chuẩn bị trung tâm điều khiển nội dung...</div>;

  const handleScormUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.name.endsWith('.zip') && !file.name.endsWith('.rar')) {
      alert('Vui lòng chọn file nén .zip hoặc .rar của bài giảng SCORM');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/admin/scorm/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.url) {
        setEditingActivity(prev => ({ ...prev, url: data.url }));
        alert('Tải lên và giải nén bài giảng thành công!');
      } else {
        alert('Lỗi: ' + data.error);
      }
    } catch (err) {
      alert('Lỗi khi tải lên file');
    }
  };

  return (
    <div style={containerStyle}>
      {/* HEADER */}
      <div style={headerStyle}>
        <div>
          <h1 style={{ fontSize: 28, margin: 0, color: '#003380' }}>
            🛠️ Quản Trị Hệ Thống: {course.title || 'Khóa học mới'}
          </h1>
          <p style={{ color: '#666', margin: '5px 0' }}>Mã khóa học: #{courseId}</p>
        </div>
        <div style={{ display: 'flex', gap: 15 }}>
          <Link href="/admin" style={secondaryBtn}>← Quay lại</Link>
          <button onClick={handleSaveCourse} style={primaryBtn}>💾 Lưu Thay Đổi</button>
        </div>
      </div>

      {/* TABS */}
      <div style={tabContainer}>
        <button onClick={() => setActiveTab('info')} style={activeTab === 'info' ? activeTabBtn : tabBtn}>📋 Thông tin Chung</button>
        <button onClick={() => setActiveTab('content')} style={activeTab === 'content' ? activeTabBtn : tabBtn}>📚 Nội dung & Học liệu</button>
      </div>

      {/* PORTAL CONTENT */}
      <div style={portalBody}>
        
        {/* TAB 1: INFO */}
        {activeTab === 'info' && (
          <div style={formGrid}>
            <div style={card}>
               <SectionHeader emoji="📝" title="Thông tin cơ bản" />
               <div style={inputGroup}>
                  <label>Tên Khóa Học</label>
                  <input value={course.title} onChange={e=>setCourse({...course, title: e.target.value})} style={inputStyle} />
               </div>
               <div style={inputGroup}>
                  <label>Mô tả ngắn</label>
                  <textarea value={course.description} onChange={e=>setCourse({...course, description: e.target.value})} style={{...inputStyle, height: 100}} />
               </div>
               <div style={inputGroup}>
                  <label>Ảnh bìa (URL hoặc Upload)</label>
                  <div style={{display: 'flex', gap: 15, alignItems: 'center', marginTop: 10, background: '#f8fbb308', border: '1px dashed #00338030', padding: 15, borderRadius: 12}}>
                     <div style={{width: 120, height: 75, borderRadius: 8, background: '#eee', overflow: 'hidden', flexShrink: 0, border: '1px solid #ddd', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                        {course.image_url ? (
                          <img src={course.image_url} style={{width:'100%', height:'100%', objectFit: 'cover'}} alt="Preview" />
                        ) : <span style={{fontSize: 24}}>🖼️</span>}
                     </div>
                     <div style={{flex: 1}}>
                        <input value={course.image_url} onChange={e=>setCourse({...course, image_url: e.target.value})} placeholder="Dán URL hoặc chọn file..." style={inputStyle} />
                        <label style={{display: 'inline-block', marginTop: 8, background: '#003380', color: '#fff', padding: '6px 12px', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 'bold'}}>
                           📤 Upload File
                           <input type="file" style={{display:'none'}} accept="image/*" onChange={async (e) => {
                             const file = e.target.files[0];
                             if (!file) return;
                             setCourse({...course, image_url: '⏳ Đang tải...'});
                             const formData = new FormData();
                             formData.append('file', file);
                             const res = await fetch('/api/admin/upload', { method: 'POST', body: formData });
                             const data = await res.json();
                             if (res.ok) setCourse({...course, image_url: data.url });
                             else { alert(data.error); setCourse({...course, image_url: ''}); }
                           }} />
                        </label>
                     </div>
                  </div>
               </div>
            </div>

            <div style={card}>
               <SectionHeader emoji="👨‍🏫" title="Phân quyền & Phân loại" />
               <div style={inputGroup}>
                  <label>Giảng viên phụ trách</label>
                  <select value={course.teacher_id} onChange={e=>setCourse({...course, teacher_id: e.target.value})} style={inputStyle}>
                    <option value="">-- Chọn giảng viên --</option>
                    {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
               </div>
               <div style={inputGroup}>
                  <label>Chủ sở hữu (Teacher Account)</label>
                  <select value={course.owner_id} onChange={e=>setCourse({...course, owner_id: e.target.value})} style={inputStyle}>
                    <option value="">-- Admin --</option>
                    {users.filter(u=>u.role==='teacher').map(u => <option key={u.id} value={u.id}>{u.full_name} ({u.email})</option>)}
                  </select>
               </div>
               <div style={{marginTop: 20}}>
                 <label style={{fontWeight: 'bold', fontSize: 13, display: 'block', marginBottom: 10}}>Kiến thức trọng tâm (Tags)</label>
                 <div style={{display: 'flex', gap: 5, marginBottom: 10}}>
                   <input value={newTagInput} onChange={e=>setNewTagInput(e.target.value)} placeholder="Thêm tag..." style={{...inputStyle, flex: 1}} />
                   <button onClick={async ()=>{
                     const r = await fetch('/api/admin/tags', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({name:newTagInput, course_id:courseId})});
                     if(r.ok) { setTags((await r.json()).tags); setNewTagInput(''); }
                   }} style={plusBtn}>+</button>
                 </div>
                 <div style={{display: 'flex', flexWrap: 'wrap', gap: 5}}>
                   {tags.map(t => (
                     <span key={t.id} style={tagStyle}>
                       {t.name}
                       <button onClick={async () => {
                         if (!confirm('Xóa tag này?')) return;
                         const r = await fetch('/api/admin/tags', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({action:'delete', id:t.id})});
                         if(r.ok) setTags(tags.filter(tag => tag.id !== t.id));
                       }} style={{background:'none', border:'none', color:'#003380', marginLeft: 8, cursor:'pointer', fontWeight:'bold'}}>×</button>
                     </span>
                   ))}
                 </div>
               </div>
            </div>

            <div style={{...card, gridColumn: 'span 2'}}>
               <SectionHeader emoji="📂" title="Tài liệu & Học liệu đính kèm" />
               <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20}}>
                  <div style={inputGroup}>
                     <label>Sách giáo khoa (URL + Upload)</label>
                     <input value={course.textbook_url || ''} onChange={e=>setCourse({...course, textbook_url: e.target.value})} style={inputStyle} placeholder="Link PDF..." />
                     <div style={{display: 'flex', gap: 5, marginTop: 8}}>
                        <label style={{...uploadBtnSm, flex: 1}}>
                           📤 Tải lên
                           <input type="file" style={{display:'none'}} accept="application/pdf" onChange={async (e) => {
                             const file = e.target.files[0]; if (!file) return;
                             setCourse({...course, textbook_url: '⏳ Đang tải...'});
                             const formData = new FormData(); formData.append('file', file);
                             const res = await fetch('/api/admin/upload', { method: 'POST', body: formData });
                             const data = await res.json();
                             if (res.ok) setCourse({...course, textbook_url: data.url });
                             else { alert(data.error); setCourse({...course, textbook_url: ''}); }
                           }} />
                        </label>
                        {course.textbook_url && (
                           <button onClick={() => setPdfPreviewUrl(course.textbook_url)} style={{...previewBtnSm, flex: 1}}>👁️ Xem Online</button>
                        )}
                     </div>
                  </div>
                  <div style={inputGroup}>
                     <label>Giáo án (Dành cho Teacher)</label>
                     <input value={course.lesson_plan_link || ''} onChange={e=>setCourse({...course, lesson_plan_link: e.target.value})} style={inputStyle} placeholder="Link Drive/PDF..." />
                  </div>
                  <div style={inputGroup}>
                     <label>Khoảng thời gian học (Lịch học)</label>
                     <div style={{display: 'flex', gap: 5, alignItems: 'center', marginTop: 8}}>
                        <input type="date" value={course.schedule_date || ''} onChange={e=>setCourse({...course, schedule_date: e.target.value})} style={{...inputStyle, marginTop:0}} />
                        <span style={{color: '#666'}}>đến</span>
                        <input type="date" value={course.schedule_date_end || ''} onChange={e=>setCourse({...course, schedule_date_end: e.target.value})} style={{...inputStyle, marginTop:0}} />
                     </div>
                  </div>
               </div>
            </div>
          </div>
        )}

        {/* TAB 2: CONTENT EDITOR (Moodle Style) */}
        {activeTab === 'content' && (
          <div style={contentLayout}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20}}>
              <h2 style={{fontSize: 20, fontWeight: 800}}>Sơ đồ bài giảng & Hoạt động</h2>
              <button onClick={addModule} style={moduleAddBtn}>+ Thêm Chương Mới</button>
            </div>

            <div style={moduleList}>
              {modules.map((m, mIdx) => (
                <div 
                  key={m.id} 
                  style={moduleCard}
                  draggable
                  onDragStart={(e) => onDragStart(e, 'module', m, mIdx)}
                  onDragOver={onDragOver}
                  onDrop={(e) => onDrop(e, 'module', mIdx)}
                >
                  <div style={moduleHeader}>
                    <div style={{display: 'flex', alignItems: 'center', gap: 10, flex: 1}}>
                      <span style={{cursor: 'grab', color: '#ccc', fontSize: 20}}>☰</span>
                      <input 
                        value={m.title} 
                        onChange={e => updateModuleTitle(m.id, e.target.value)} 
                        style={moduleTitleInput} 
                      />
                    </div>
                    <div style={{display: 'flex', gap: 10}}>
                      <button onClick={()=>deleteModule(m.id)} style={dangerBtnSm}>🗑️</button>
                    </div>
                  </div>

                  <div style={activityList}>
                    {activities.filter(a => a.module_id === m.id).map((act, aIdx) => (
                      <div 
                        key={act.id} 
                        style={activityItem}
                        draggable
                        onDragStart={(e) => onDragStart(e, 'activity', act, aIdx)}
                        onDragOver={onDragOver}
                        onDrop={(e) => onDrop(e, 'activity', aIdx, m.id)}
                      >
                         <div style={{display: 'flex', alignItems: 'center', gap: 15, flex: 1}}>
                            <span style={{cursor: 'grab', color: '#eee'}}>⠿</span>
                            <span style={{fontSize: 18}}>{getActivityEmoji(act.type)}</span>
                            <div style={{flex: 1}}>
                               <div style={{fontWeight: 600, fontSize: 14}}>{act.title}</div>
                               <div style={{fontSize: 11, color: '#888'}}>{act.type.toUpperCase()} {act.url ? `• ${act.url?.substring(0, 40)}` : ''}</div>
                            </div>
                         </div>
                         <div style={{display: 'flex', gap: 5}}>
                            <button onClick={() => { setEditingActivity(act); setShowActivityModal(true); }} style={{...editBtnSm, width: 'auto', padding: '0 10px'}}>✒️ Cấu hình</button>
                            {act.type === 'quiz' && (
                               <button onClick={() => { window.location.href = `/course/${courseId}/quiz/${act.id}?mode=edit` }} style={{...editBtnSm, width: 'auto', padding: '0 10px', background: '#003380', color: '#fff'}} title="Soạn câu hỏi trắc nghiệm">Biên soạn Đề</button>
                            )}
                            <button onClick={() => deleteActivity(act.id)} style={dangerBtnSm}>✖</button>
                         </div>
                      </div>
                    ))}
                    
                    <button style={addActBtn} onClick={() => openAddActivity(m.id)}>
                      <span>➕ Thêm hoạt động hoặc tài nguyên</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ACTIVITY MODAL */}
      {showActivityModal && (
        <div style={modalOverlay}>
           <div style={modalContent}>
              <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 20}}>
                 <h3>Thiết lập Hoạt Động / Tài Nguyên</h3>
                 <button onClick={()=>setShowActivityModal(false)} style={{background:'none', border:'none', fontSize: 20, cursor: 'pointer'}}>✕</button>
              </div>
              
              <div style={inputGroup}>
                 <label>Tên hoạt động</label>
                 <input value={editingActivity.title} onChange={e=>setEditingActivity({...editingActivity, title:e.target.value})} style={inputStyle} />
              </div>

              <div style={inputGroup}>
                 <label>Loại hình</label>
                 <select value={editingActivity.type} onChange={e=>setEditingActivity({...editingActivity, type:e.target.value})} style={inputStyle}>
                    <option value="resource">📕 File PDF / Văn bản</option>
                    <option value="video">🎥 Video (YouTube/Embed)</option>
                     <option value="scorm">📦 Bài học SCORM (Storyline/iSpring)</option>
                    <option value="link">🔗 Liên kết ngoài (Web/Drive)</option>
                    <option value="quiz">📝 Bài tập / Trắc nghiệm</option>
                    <option value="label">🏷️ Nhãn (Text/HTML hiển thị trực tiếp)</option>
                 </select>
              </div>

              <div style={inputGroup}>
                 <label>
                     {editingActivity.type === 'video' ? 'Mã Nhúng / Link Video' : 
                      editingActivity.type === 'scorm' ? 'Đường dẫn Bài học Scorm (VD: /scorm/methodology/index_lms.html)' : 
                      'Đường dẫn (URL)'}
                  </label>
                 <input value={editingActivity.url} onChange={e=>setEditingActivity({...editingActivity, url:e.target.value})} style={inputStyle} />
                  {editingActivity.type === 'scorm' && (
                     <div style={{marginTop: 12}}>
                        <div style={{fontSize: 12, color: '#666', marginBottom: 8}}>Hoặc tải lên từ máy tính (máy chủ sẽ tự giải nén)</div>
                        <input 
                           type="file" 
                           accept=".zip,.rar" 
                           onChange={handleScormUpload} 
                           style={{fontSize: 12}} 
                        />
                     </div>
                  )}
              </div>

              {editingActivity.type === 'label' && (
                 <div style={inputGroup}>
                    <label>Nội dung hiển thị (Rich Text / HTML)</label>
                    <textarea value={editingActivity.details} onChange={e=>setEditingActivity({...editingActivity, details:e.target.value})} style={{...inputStyle, height: 100}} />
                 </div>
              )}

              <div style={{marginTop: 30, display: 'flex', gap: 10}}>
                 <button onClick={saveActivity} style={{...primaryBtn, width: '100%'}}>✅ Lưu Thay Đổi</button>
              </div>
           </div>
        </div>
      )}

      {/* PDF PREVIEW MODAL */}
      {pdfPreviewUrl && (
        <div style={modalOverlay}>
           <div style={{...modalContent, width: '90%', maxWidth: 1000, height: '90vh', display: 'flex', flexDirection: 'column'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 15}}>
                 <h3>Xem Trước Tài Liệu (PDF)</h3>
                 <button onClick={()=>setPdfPreviewUrl(null)} style={{background:'none', border:'none', fontSize: 20, cursor: 'pointer'}}>✕ Quay lại</button>
              </div>
              <iframe 
                 src={pdfPreviewUrl} 
                 style={{flex: 1, width: '100%', border: 'none', borderRadius: 12}} 
                 title="PDF Preview"
              />
           </div>
        </div>
      )}
    </div>
  );
}

// --- STYLES ---
const containerStyle = { background: '#f0f2f5', minHeight: '100vh', padding: '30px', fontFamily: 'Inter, system-ui, sans-serif' };
const headerStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 };
const primaryBtn = { background: '#003380', color: '#fff', border: 'none', padding: '12px 25px', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,51,128,0.2)' };
const secondaryBtn = { background: '#fff', color: '#333', border: '1px solid #ddd', padding: '12px 25px', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer', textDecoration: 'none', display: 'inline-block' };
const tabContainer = { display: 'flex', gap: 5, marginBottom: 25, borderBottom: '1px solid #ddd' };
const tabBtn = { padding: '12px 25px', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 'bold', color: '#666', borderBottom: '3px solid transparent' };
const activeTabBtn = { ...tabBtn, color: '#003380', borderBottom: '3px solid #003380' };
const portalBody = { maxWidth: 1200, margin: '0 auto' };
const card = { background: '#fff', padding: 25, borderRadius: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.03)' };
const formGrid = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 };
const inputGroup = { marginBottom: 15 };
const inputStyle = { width: '100%', padding: '12px', borderRadius: 8, border: '1px solid #e0e0e0', marginTop: 8, fontSize: 14, outline: 'none' };
const tagStyle = { background: '#e3f2fd', color: '#003380', padding: '4px 12px 4px 15px', borderRadius: 15, fontSize: 12, fontWeight: 'bold', display: 'inline-flex', alignItems: 'center' };
const plusBtn = { background: '#003380', color: '#fff', border: 'none', padding: '0 15px', borderRadius: 8, cursor: 'pointer' };

const uploadBtnSm = { background: '#003380', color: '#fff', padding: '8px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 'bold', textAlign: 'center', transition: '0.2s' };
const previewBtnSm = { background: '#f5f6fa', color: '#003380', padding: '8px 12px', borderRadius: 6, border: '1px solid #00338030', cursor: 'pointer', fontSize: 12, fontWeight: 'bold', textAlign: 'center' };

const contentLayout = { background: '#fff', padding: 30, borderRadius: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' };
const moduleList = { display: 'flex', flexDirection: 'column', gap: 20 };
const moduleCard = { border: '1px solid #eee', borderRadius: 12, background: '#fff', overflow: 'hidden' };
const moduleHeader = { padding: '15px 20px', background: '#f8f9fa', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'space-between' };
const moduleTitleInput = { background: 'none', border: 'none', fontSize: 16, fontWeight: 'bold', color: '#333', flex: 1, outline: 'none' };
const moduleAddBtn = { background: '#2ecc71', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer' };
const activityList = { padding: '10px' };
const activityItem = { padding: '12px 15px', borderBottom: '1px solid #f9f9f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', hover: { background: '#fcfcfc' } };
const addActBtn = { width: '100%', padding: '12px', background: '#fff', border: '1px dashed #ddd', borderRadius: 8, marginTop: 10, cursor: 'pointer', color: '#003380', fontWeight: 'bold', fontSize: 13 };
const dangerBtnSm = { background: 'none', border: 'none', color: '#ff4d4f', cursor: 'pointer', fontSize: 14 };
const editBtnSm = { background: 'none', border: 'none', color: '#003380', cursor: 'pointer', fontSize: 14 };

const modalOverlay = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
const modalContent = { background: '#fff', width: 500, padding: 40, borderRadius: 20, boxShadow: '0 10px 40px rgba(0,0,0,0.2)' };

function SectionHeader({ emoji, title }) {
  return <h3 style={{ fontSize: 16, color: '#333', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}><span>{emoji}</span> {title}</h3>;
}

function getActivityEmoji(type) {
  switch(type) {
    case 'video': return '🎥';
    case 'quiz': return '📝';
    case 'link': return '🔗';
    case 'label': return '🏷️';
    case 'scorm': return '📦';
    default: return '📕';
  }
}
