'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdvancedCourseEditor({ courseId }) {
  const router = useRouter();
  const isNew = courseId === 'new';

  const [loading, setLoading] = useState(!isNew);
  const [loadStep, setLoadStep] = useState('Đang khởi tạo...');
  const [loadError, setLoadError] = useState(null);
  const [activeTab, setActiveTab] = useState(isNew ? 'info' : 'content');

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
  const [availableGames, setAvailableGames] = useState([]);

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
      setLoadStep('Xác thực tài khoản...');
      const resMe = await fetch('/api/me');
      if (resMe.ok) {
        const meData = await resMe.json();
        setUserRole(meData.role);
      }

      setLoadStep('Tải danh sách giảng viên...');
      const resT = await fetch('/api/admin/teachers');
      if (resT.ok) {
        const tData = await resT.json();
        setTeachers(tData.teachers || []);
      }

      setLoadStep('Tải danh sách nhân sự...');
      const resU = await fetch('/api/admin/users');
      if (resU.ok) {
        const uData = await resU.json();
        setUsers(uData.users || []);
      }

      if (!isNew) {
        setLoadStep('Tải dữ liệu Khóa học...');
        const res = await fetch(`/api/admin/courses/${courseId}`);
        if (res.ok) {
          const courseData = await res.json();
          if (courseData.course) {
            const c = courseData.course;
            if (c.schedule_date) c.schedule_date = c.schedule_date.split('T')[0];
            if (c.schedule_date_end) c.schedule_date_end = c.schedule_date_end.split('T')[0];
            setCourse(c);
          }
          setModules(courseData.modules || []);
          setActivities(courseData.activities || []);
        } else {
          setLoadError(`Lỗi tải khóa học: ${res.status}`);
        }
        
        setLoadStep('Tải phân loại Tags...');
        const resTag = await fetch(`/api/admin/tags?course_id=${courseId}`);
        if (resTag.ok) {
          const tagData = await resTag.json();
          setTags(tagData.tags || []);
        }
      }

      setLoadStep('Táp dữ liệu Studio Games...');
      const resGames = await fetch('/api/admin/games');
      if (resGames.ok) {
        const gamesData = await resGames.json();
        setAvailableGames(gamesData.games || []);
      }
    } catch (e) {
      console.error('Fetch error:', e);
      setLoadError(e.message);
    }
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
    try {
      const res = await fetch(`/api/modules/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title })
      });
      if (!res.ok) {
        const data = await res.json();
        alert('Lỗi khi đổi tên chương: ' + (data.error || 'Unknown error'));
      }
    } catch (e) {
       console.error('Update title failed', e);
    }
  };

  // --- ACTIVITY HANDLERS ---
  const openAddActivity = (moduleId) => {
    setCurrentModuleId(moduleId);
    setEditingActivity({ title: '', type: 'resource', url: '', details: '', module_id: moduleId });
    setShowActivityModal(true);
  };

  const saveActivity = async () => {
    if (!editingActivity.title) return alert('Vui lòng nhập tiêu đề!');
    const isEdit = !!editingActivity.id;
    const url = isEdit ? `/api/activities/${editingActivity.id}` : '/api/activities';
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingActivity)
      });
      
      const data = await res.json();
      if (res.ok) {
        // Ensure module_id is treated as a number for matching
        const updatedData = { ...data, module_id: Number(data.module_id) };
        if (isEdit) {
          setActivities(prev => prev.map(a => a.id === updatedData.id ? updatedData : a));
        } else {
          setActivities([...activities, updatedData]);
        }
        setShowActivityModal(false);
      } else {
        alert('Lỗi khi lưu học liệu: ' + (data.error || 'Unknown error'));
      }
    } catch (e) {
      alert('Lỗi kết nối server khi lưu học liệu');
    }
  };

  const deleteActivity = async (id) => {
    if (!confirm('Xóa nội dung này?')) return;
    await fetch(`/api/activities/${id}`, { method: 'DELETE' });
    setActivities(activities.filter(a => a.id !== id));
  };

  // --- DRAG & DROP LOGIC (Native) ---
  const onDragStart = (e, type, item, index) => {
    e.stopPropagation();
    setDraggingItem({ type, item, index });
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = (e) => {
     e.preventDefault();
     e.stopPropagation();
     e.dataTransfer.dropEffect = 'move';
  };

  const onDrop = async (e, targetType, targetIndex, targetModuleId = null) => {
    e.preventDefault();
    e.stopPropagation();
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
      const sourceModId = draggingItem.item.module_id;
      const targetModId = targetModuleId;
      
      let allActs = [...activities];
      const sourceIdx = allActs.findIndex(a => a.id === draggingItem.item.id);
      if (sourceIdx === -1) return;
      
      const [moved] = allActs.splice(sourceIdx, 1);
      moved.module_id = targetModId;

      // Group activities by module to re-index correctly
      const otherModulesActs = allActs.filter(a => a.module_id !== targetModId && a.module_id !== sourceModId);
      const targetModuleActs = allActs.filter(a => a.module_id === targetModId);
      const sourceModuleActs = allActs.filter(a => a.module_id === sourceModId && sourceModId !== targetModId);
      
      targetModuleActs.splice(targetIndex, 0, moved);
      
      // Re-index target
      const reindexedTarget = targetModuleActs.map((a, i) => ({ ...a, order_index: i }));
      // Re-index source (if different)
      const reindexedSource = sourceModuleActs.map((a, i) => ({ ...a, order_index: i }));
      
      const finale = [...otherModulesActs, ...reindexedTarget, ...reindexedSource];
      setActivities(finale);
      
      // Persist all updated items in target module
      const persistPromises = reindexedTarget.map(a => 
         fetch(`/api/activities/${a.id}`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ ...a, module_id: targetModId })
         })
      );
      
      // If cross-module, also persist source module changes
      if (sourceModId !== targetModId) {
        reindexedSource.forEach(a => {
           persistPromises.push(
              fetch(`/api/activities/${a.id}`, {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ ...a })
              })
           );
        });
      }

      await Promise.all(persistPromises);
    }
    setDraggingItem(null);
  };

  if (loading) return (
     <div style={{ padding: 100, textAlign: 'center' }}>
       <div style={{fontSize: 24, marginBottom: 15}}>🚀 Đang chuẩn bị trung tâm điều khiển nội dung...</div>
       <div style={{fontSize: 16, color: '#003380'}}>{loadStep}</div>
       {loadError && <div style={{marginTop: 20, color: 'red', fontWeight: 'bold'}}>Lỗi: {loadError}</div>}
     </div>
  );

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
          <h1 style={{ fontSize: 32, margin: 0, fontWeight: 900, color: 'var(--primary)', letterSpacing: '-0.02em' }}>
            🛠️ Trình Thiết Kế Khóa Học <span style={{color: '#94a3b8', fontSize: 20, fontWeight: 400}}>| {course.title || 'Khóa học chưa đặt tên'}</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', margin: '8px 0', fontSize: 13, fontWeight: 600 }}>ID: {courseId} • Vai trò: {userRole.toUpperCase()}</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <Link href={userRole === 'teacher' ? '/teacher/dashboard' : '/admin'} style={secondaryBtn}>← Thoát Trình Sửa</Link>
          <button onClick={handleSaveCourse} style={primaryBtn}>✨ Lưu Cấu Trúc</button>
        </div>
      </div>

      {/* TABS */}
      <div style={tabContainer}>
        <button onClick={() => setActiveTab('info')} style={activeTab === 'info' ? activeTabBtn : tabBtn}>
          <span style={{marginRight: 8}}>📋</span> Thông tin cơ bản
        </button>
        {!isNew && (
          <button onClick={() => setActiveTab('content')} style={activeTab === 'content' ? activeTabBtn : tabBtn}>
            <span style={{marginRight: 8}}>📚</span> Trình biên soạn Nội dung
          </button>
        )}
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
                  <input value={course.title || ''} onChange={e=>setCourse({...course, title: e.target.value})} style={inputStyle} />
               </div>
               <div style={inputGroup}>
                  <label>Mô tả ngắn</label>
                  <textarea value={course.description || ''} onChange={e=>setCourse({...course, description: e.target.value})} style={{...inputStyle, height: 80}} />
               </div>
               <div style={inputGroup}>
                  <label>Nội quy khóa học (Bắt buộc đồng ý khi tham gia)</label>
                  <textarea 
                    value={course.rules || ''} 
                    onChange={e=>setCourse({...course, rules: e.target.value})} 
                    placeholder="Nhập nội quy lớp học tại đây... Học sinh phải nhấn 'Đã hiểu' mới được vào học."
                    style={{...inputStyle, height: 120, borderColor: '#3b82f630', background: '#f8fafc'}} 
                  />
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
                        <input value={course.image_url || ''} onChange={e=>setCourse({...course, image_url: e.target.value})} placeholder="Dán URL hoặc chọn file..." style={inputStyle} />
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
                  <select value={course.teacher_id || ''} onChange={e=>setCourse({...course, teacher_id: e.target.value})} style={inputStyle}>
                    <option value="">-- Chọn giảng viên --</option>
                    {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
               </div>
               <div style={inputGroup}>
                  <label>Chủ sở hữu (Tài khoản Giảng viên)</label>
                  <select value={course.owner_id || ''} onChange={e=>setCourse({...course, owner_id: e.target.value})} style={inputStyle}>
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
                             try {
                               const data = await res.json();
                               if (res.ok) setCourse({...course, textbook_url: data.url });
                               else { alert(data.error); setCourse({...course, textbook_url: ''}); }
                             } catch(err) {
                               alert('Tải lên thất bại. File quá lớn hoặc lỗi kết nối.');
                               setCourse({...course, textbook_url: ''});
                             }
                           }} />
                        </label>
                        {course.textbook_url && (
                           <button onClick={() => setPdfPreviewUrl(course.textbook_url)} style={{...previewBtnSm, flex: 1}}>👁️ Xem Online</button>
                        )}
                     </div>
                  </div>
                  <div style={inputGroup}>
                     <label>Giáo án (Giảng viên)</label>
                     <input value={course.lesson_plan_link || ''} onChange={e=>setCourse({...course, lesson_plan_link: e.target.value})} style={inputStyle} placeholder="Link Drive/PDF..." />
                     <div style={{display: 'flex', gap: 5, marginTop: 8}}>
                        <label style={{...uploadBtnSm, flex: 1}}>
                           📤 Tải lên
                           <input type="file" style={{display:'none'}} accept=".pdf,.doc,.docx" onChange={async (e) => {
                             const file = e.target.files[0]; if (!file) return;
                             setCourse({...course, lesson_plan_link: '⏳ Đang tải...'});
                             const formData = new FormData(); formData.append('file', file);
                             const res = await fetch('/api/admin/upload', { method: 'POST', body: formData });
                             try {
                               const data = await res.json();
                               if (res.ok) setCourse({...course, lesson_plan_link: data.url });
                               else { alert(data.error); setCourse({...course, lesson_plan_link: ''}); }
                             } catch(err) {
                               alert('Tải lên thất bại. File quá lớn hoặc lỗi kết nối.');
                               setCourse({...course, lesson_plan_link: ''});
                             }
                           }} />
                        </label>
                        {course.lesson_plan_link && course.lesson_plan_link.endsWith('.pdf') && (
                           <button onClick={() => setPdfPreviewUrl(course.lesson_plan_link)} style={{...previewBtnSm, flex: 1}}>👁️ Xem Online</button>
                        )}
                     </div>
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
                               <div style={{fontSize: 11, color: '#888'}}>{({'resource':'TÀI LIỆU PDF', 'video':'VIDEO', 'interactive_video':'VIDEO TƯƠNG TÁC H5P', 'scorm':'BÀI GIẢNG SCORM', 'link':'LIÊN KẾT', 'quiz':'TRẮC NGHIỆM', 'assignment':'BÀI TẬP TỰ LUẬN', 'forum':'DIỄN ĐÀN THẢO LUẬN', 'label':'VĂN BẢN (LABEL)', 'game':'TRÒ CHƠI'})[act.type] || act.type.toUpperCase()}</div>
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
                 <input value={editingActivity.title || ''} onChange={e=>setEditingActivity({...editingActivity, title:e.target.value})} style={inputStyle} />
              </div>

              <div style={inputGroup}>
                 <label>Loại hình</label>
                 <select value={editingActivity.type || ''} onChange={e=>setEditingActivity({...editingActivity, type:e.target.value})} style={inputStyle}>
                    <option value="resource">📕 Tài liệu PDF</option>
                    <option value="video">🎥 Video (YouTube/Embed)</option>
                    <option value="interactive_video">🎬 Video Tương Tác (H5P-style)</option>
                    <option value="scorm">📦 Bài học SCORM (Storyline/iSpring)</option>
                    <option value="link">🔗 Liên kết ngoài (Web/Drive)</option>
                    <option value="quiz">📝 Trắc nghiệm (Tự chấm)</option>
                    <option value="assignment">📂 Bài tập (Nộp file/Văn bản)</option>
                    <option value="forum">💬 Diễn đàn thảo luận</option>
                    <option value="label">📄 Văn bản trực tiếp (Rich Text/HTML)</option>
                    <option value="game">🎮 Mini-game Toán học</option>
                 </select>
              </div>

              {editingActivity.type === 'game' && (
                 <div style={{...inputGroup, background: '#f8fafc', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0', marginTop: 15}}>
                    <h4 style={{ margin: 0, marginBottom: 10, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
                       🎮 Tích hợp Mini-game
                    </h4>
                    <p style={{fontSize: 13, color: '#64748b', marginBottom: 15, lineHeight: 1.5}}>
                       Để tạo mới và cấu hình một trò chơi, vui lòng sử dụng <a href="/studio" target="_blank" style={{color: '#3b82f6', fontWeight: 'bold', textDecoration: 'none'}}>H2bmath Studio</a>. Sau đó dán <b>Mã Game (Game Code)</b> vào ô bên dưới.
                    </p>
                    <label style={{fontWeight: 'bold'}}>Mã Game (Game Code)</label>
                    <input 
                      value={editingActivity.details || ''} 
                      onChange={e => {
                         const code = e.target.value.toUpperCase().trim();
                         const playerMap = { QUIZ: '/games/quiz_player.html', FILLIN: '/games/fillin_player.html', STEPS: '/games/steps_player.html', MATCH: '/games/studio_player.html', WHEEL: '/games/studio_player.html' };
                         const prefix = code.split('-')[0];
                         const playerUrl = playerMap[prefix] || '/games/studio_player.html';
                         setEditingActivity({ ...editingActivity, details: code, url: playerUrl });
                      }} 
                      placeholder="Ví dụ: MATCH-1024"
                      style={{...inputStyle, border: '2px dashed #cbd5e1', fontSize: 16, fontWeight: 'bold', textTransform: 'uppercase'}}
                    />
                 </div>
              )}

              <div style={inputGroup}>
                 <label>
                     {editingActivity.type === 'video' ? 'Mã Nhúng / Link Video' : 
                      editingActivity.type === 'scorm' ? 'Đường dẫn Bài học Scorm (VD: /scorm/methodology/index_lms.html)' : 
                      'Đường dẫn (URL)'}
                  </label>
                 <div style={{display: 'flex', gap: 10, alignItems: 'flex-end'}}>
                    <div style={{flex: 1}}>
                       <input value={editingActivity.url || ''} onChange={e=>setEditingActivity({...editingActivity, url:e.target.value})} style={inputStyle} disabled={editingActivity.type === 'game'} />
                    </div>
                    {['resource', 'assignment', 'video', 'interactive_video'].includes(editingActivity.type) && (
                      <label style={{...uploadBtnSm, marginBottom: 0, height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 20px'}}>
                        📤 Upload {editingActivity.type.includes('video') ? 'Video' : 'File'}
                        <input type="file" style={{display:'none'}} accept={editingActivity.type.includes('video') ? "video/*" : "*"} onChange={async (e) => {
                          const file = e.target.files[0]; if (!file) return;
                          setEditingActivity(prev => ({...prev, url: '⏳ Đang tải...'}));
                          const formData = new FormData(); formData.append('file', file);
                          const res = await fetch('/api/admin/upload', { method: 'POST', body: formData });
                          try {
                            const data = await res.json();
                            if (res.ok) setEditingActivity(prev => ({...prev, url: data.url }));
                            else { alert(data.error); setEditingActivity(prev => ({...prev, url: ''})); }
                          } catch(err) {
                            alert('Tải lên thất bại. Dung lượng màng quá lớn hoặc lỗi kết nối.');
                            setEditingActivity(prev => ({...prev, url: ''}));
                          }
                        }} />
                      </label>
                    )}
                 </div>
                 {editingActivity.type === 'assignment' && (
                    <div style={{marginTop: 15}}>
                      <label style={{fontSize: 13, fontWeight: 'bold', color: '#555'}}>Hạn nộp bài (Deadline)</label>
                      <input 
                        type="datetime-local" 
                        value={editingActivity.due_date ? new Date(editingActivity.due_date).toLocaleString('sv-SE').slice(0,16).replace(' ', 'T') : ''} 
                        onChange={e=>setEditingActivity({...editingActivity, due_date: e.target.value})} 
                        style={inputStyle} 
                      />
                    </div>
                 )}
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
                    <label style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                      <span>Nội dung hiển thị Văn bản (Rich Text / HTML)</span>
                    </label>
                    
                    <div style={{display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: '#fafafa', border: '1px solid #e0e0e0', borderBottom: 'none', borderRadius: '8px 8px 0 0'}}>
                        <label style={{display: 'inline-flex', alignItems: 'center', gap: 4, background: '#f0f0f0', border: 'none', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 600}}>
                           🖼️ Upload Ảnh
                           <input type="file" style={{display: 'none'}} accept="image/*" onChange={async (e) => {
                             const file = e.target.files[0]; if (!file) return;
                             setEditingActivity(prev => ({...prev, details: prev.details + '\n[Đang tải ảnh...]'}));
                             const formData = new FormData(); formData.append('file', file);
                             const res = await fetch('/api/admin/upload', { method: 'POST', body: formData });
                             try {
                               const data = await res.json();
                               if (res.ok) {
                                 setEditingActivity(prev => ({...prev, details: prev.details.replace('[Đang tải ảnh...]', `<img src="${data.url}" style="max-width: 100%; border-radius: 8px;" />`)}));
                               } else {
                                 alert(data.error); setEditingActivity(prev => ({...prev, details: prev.details.replace('\n[Đang tải ảnh...]', '')}));
                               }
                             } catch(err) {
                               alert('Tải lên thất bại. Ảnh quá lớn.');
                               setEditingActivity(prev => ({...prev, details: prev.details.replace('\n[Đang tải ảnh...]', '')}));
                             }
                           }} />
                        </label>
                        <button type="button" onClick={() => {
                           const vidUrl = prompt('Nhập link Youtube (hoặc Drive):');
                           if (vidUrl) {
                             const ytMatch = vidUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/);
                             const iframeUrl = ytMatch ? `https://www.youtube.com/embed/${ytMatch[1]}` : vidUrl;
                             const iframeHtml = `<div style="margin: 15px 0; border-radius: 8px; overflow: hidden;"><iframe src="${iframeUrl}" width="100%" height="400" frameborder="0" allowfullscreen></iframe></div>`;
                             setEditingActivity(prev => ({...prev, details: (prev.details || '') + '\n' + iframeHtml}));
                           }
                        }} style={{background: '#e8f5e9', color: '#1a885c', border: 'none', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 600}}>
                           🎥 Chèn Video
                        </button>
                    </div>
                    <textarea value={editingActivity.details || ''} onChange={e=>setEditingActivity({...editingActivity, details:e.target.value})} style={{...inputStyle, height: 160, marginTop: 0, borderRadius: '0 0 8px 8px'}} placeholder="Bạn có thể gõ chữ, chèn thẻ HTML, hoặc dùng công cụ ở trên để đưa ảnh/video vào bài học..." />
                 </div>
              )}

              {editingActivity.type === 'interactive_video' && editingActivity.id && (
                 <div style={{...inputGroup, background: '#fff9e6', padding: 20, borderRadius: 12, border: '1px solid #ffe58f', marginTop: 15, textAlign: 'center'}}>
                    <h4 style={{margin: 0, color: '#856404'}}>🎬 Trình Biên Soạn Tương Tác</h4>
                    <p style={{fontSize: 12, color: '#856404', margin: '10px 0'}}>Thiết lập các mốc dừng và câu hỏi trực tiếp trên video.</p>
                    <button 
                      onClick={() => { setShowActivityModal(false); window.location.href = `/admin/course/manage/${courseId}/interactive-video/${editingActivity.id}` }} 
                      style={{...primaryBtn, background: '#f59e0b'}}
                    >
                      🚀 Mở Bộ Biên Soạn H5P-Style
                    </button>
                 </div>
              )}

              {editingActivity.type === 'interactive_video' && !editingActivity.id && (
                <div style={{fontSize: 12, color: '#ff4d4f', fontStyle: 'italic', marginTop: 10}}>* Vui lòng Lưu hoạt động này trước khi có thể biên soạn nội dung tương tác.</div>
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
const containerStyle = { 
  background: 'var(--bg-main)', 
  minHeight: '100vh', 
  padding: '40px', 
  fontFamily: 'var(--font-nunito), system-ui, sans-serif' 
};

const headerStyle = { 
  display: 'flex', 
  justifyContent: 'space-between', 
  alignItems: 'center', 
  marginBottom: '40px',
  maxWidth: 1400,
  margin: '0 auto 40px auto'
};

const primaryBtn = { 
  background: 'var(--primary-gradient)', 
  color: '#fff', 
  border: 'none', 
  padding: '12px 28px', 
  borderRadius: 14, 
  fontWeight: 800, 
  cursor: 'pointer', 
  boxShadow: '0 10px 20px -5px rgba(0, 51, 128, 0.3)',
  fontSize: 14,
  transition: '0.3s'
};

const secondaryBtn = { 
  background: '#fff', 
  color: 'var(--text-main)', 
  border: '1px solid #e2e8f0', 
  padding: '12px 28px', 
  borderRadius: 14, 
  fontWeight: 700, 
  cursor: 'pointer', 
  textDecoration: 'none', 
  display: 'inline-block',
  fontSize: 14,
  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
};

const tabContainer = { 
  display: 'flex', 
  gap: 8, 
  marginBottom: 35, 
  borderBottom: '1px solid #e2e8f0', 
  maxWidth: 1400, 
  margin: '0 auto 35px auto' 
};

const tabBtn = { 
  padding: '14px 28px', 
  border: 'none', 
  background: 'none', 
  cursor: 'pointer', 
  fontWeight: 700, 
  color: 'var(--text-muted)', 
  borderBottom: '3px solid transparent',
  fontSize: 15,
  transition: '0.2s'
};

const activeTabBtn = { 
  ...tabBtn, 
  color: 'var(--primary)', 
  borderBottom: '3px solid var(--primary)',
  background: 'rgba(0, 51, 128, 0.03)'
};

const portalBody = { maxWidth: 1400, margin: '0 auto' };

const card = { 
  background: 'var(--bg-card)', 
  padding: 30, 
  borderRadius: 24, 
  boxShadow: 'var(--shadow-premium)', 
  border: '1px solid var(--border-glass)',
  backdropFilter: 'blur(10px)'
};

const formGrid = { display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 0.8fr)', gap: 30 };
const inputGroup = { marginBottom: 20 };
const inputStyle = { 
  width: '100%', 
  padding: '14px 18px', 
  borderRadius: 12, 
  border: '1px solid #e2e8f0', 
  marginTop: 10, 
  fontSize: 14, 
  outline: 'none',
  background: '#fff',
  transition: '0.2s focus'
};

const tagStyle = { 
  background: 'var(--primary-glow)', 
  color: 'var(--primary)', 
  padding: '6px 14px', 
  borderRadius: 12, 
  fontSize: 12, 
  fontWeight: 800, 
  display: 'inline-flex', 
  alignItems: 'center',
  border: '1px solid rgba(0, 51, 128, 0.1)'
};

const plusBtn = { 
  background: 'var(--primary)', 
  color: '#fff', 
  border: 'none', 
  width: 45,
  height: 45,
  borderRadius: 12, 
  cursor: 'pointer',
  fontSize: 20,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
};

const uploadBtnSm = { 
  background: 'var(--primary)', 
  color: '#fff', 
  padding: '10px 16px', 
  borderRadius: 10, 
  cursor: 'pointer', 
  fontSize: 12, 
  fontWeight: 800, 
  textAlign: 'center', 
  boxShadow: '0 4px 12px rgba(0, 51, 128, 0.2)'
};

const previewBtnSm = { 
  background: '#fff', 
  color: 'var(--primary)', 
  padding: '10px 16px', 
  borderRadius: 10, 
  border: '1px solid rgba(0, 51, 128, 0.2)', 
  cursor: 'pointer', 
  fontSize: 12, 
  fontWeight: 800, 
  textAlign: 'center' 
};

const contentLayout = { 
  background: 'var(--bg-card)', 
  padding: 40, 
  borderRadius: 28, 
  boxShadow: 'var(--shadow-premium)', 
  border: '1px solid var(--border-glass)',
  backdropFilter: 'blur(10px)'
};

const moduleList = { display: 'flex', flexDirection: 'column', gap: 25 };
const moduleCard = { 
  border: '1px solid #f1f5f9', 
  borderRadius: 20, 
  background: '#fff', 
  overflow: 'hidden',
  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)'
};

const moduleHeader = { 
  padding: '20px 25px', 
  background: '#f8fafc', 
  borderBottom: '1px solid #f1f5f9', 
  display: 'flex', 
  alignItems: 'center', 
  justifyContent: 'space-between' 
};

const moduleTitleInput = { 
  background: 'none', 
  border: 'none', 
  fontSize: 18, 
  fontWeight: 800, 
  color: 'var(--text-main)', 
  flex: 1, 
  outline: 'none',
  padding: '4px 0'
};

const moduleAddBtn = { 
  background: 'var(--success)', 
  color: '#fff', 
  border: 'none', 
  padding: '12px 24px', 
  borderRadius: 14, 
  fontWeight: 800, 
  cursor: 'pointer',
  boxShadow: '0 10px 15px -3px rgba(16, 185, 129, 0.2)'
};

const activityList = { padding: '15px' };
const activityItem = { 
  padding: '15px 20px', 
  borderRadius: 12,
  marginBottom: 8,
  display: 'flex', 
  justifyContent: 'space-between', 
  alignItems: 'center', 
  background: '#fff',
  border: '1px solid transparent',
  transition: '0.2s',
  cursor: 'default'
};

const addActBtn = { 
  width: '100%', 
  padding: '16px', 
  background: 'rgba(0, 51, 128, 0.02)', 
  border: '2px dashed rgba(0, 51, 128, 0.1)', 
  borderRadius: 16, 
  marginTop: 15, 
  cursor: 'pointer', 
  color: 'var(--primary)', 
  fontWeight: 800, 
  fontSize: 14,
  transition: '0.2s'
};

const dangerBtnSm = { 
  background: 'rgba(239, 68, 68, 0.08)', 
  border: 'none', 
  color: '#ef4444', 
  cursor: 'pointer', 
  fontSize: 14,
  padding: '8px',
  borderRadius: 8,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
};

const editBtnSm = { 
  background: 'rgba(0, 51, 128, 0.05)', 
  border: 'none', 
  color: 'var(--primary)', 
  cursor: 'pointer', 
  fontSize: 13,
  fontWeight: 700,
  padding: '8px 15px',
  borderRadius: 8
};

const modalOverlay = { 
  position: 'fixed', 
  top: 0, 
  left: 0, 
  right: 0, 
  bottom: 0, 
  background: 'rgba(15, 23, 42, 0.6)', 
  backdropFilter: 'blur(8px)',
  display: 'flex', 
  alignItems: 'center', 
  justifyContent: 'center', 
  zIndex: 1000 
};

const modalContent = { 
  background: '#fff', 
  width: 550, 
  maxHeight: '90vh',
  overflowY: 'auto',
  padding: 40, 
  borderRadius: 32, 
  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' 
};

function SectionHeader({ emoji, title }) {
  return (
    <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-main)', marginBottom: 25, display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{fontSize: 22}}>{emoji}</span> {title}
    </h3>
  );
}

function getActivityEmoji(type) {
  switch(type) {
    case 'video': return '🎥';
    case 'interactive_video': return '🎬';
    case 'quiz': return '📝';
    case 'assignment': return '📂';
    case 'forum': return '💬';
    case 'link': return '🔗';
    case 'label': return '🏷️';
    case 'scorm': return '📦';
    case 'game': return '🎮';
    default: return '📕';
  }
}
