'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function CourseAccordion({ 
  initialModules = [], 
  initialActivities = [], 
  isAdmin = false, 
  courseId,
  course = {},
  teacher = null 
}) {
  const [openIndex, setOpenIndex] = useState(0);
  const [modules, setModules] = useState(initialModules);
  const [activities, setActivities] = useState(initialActivities);
  const [isEditMode, setIsEditMode] = useState(false);
  const [completedParams, setCompletedParams] = useState([]);
  const [showSchedule, setShowSchedule] = useState(false);
  const [showTeacher, setShowTeacher] = useState(false);

  useEffect(() => {
     if (!isAdmin) {
        fetch(`/api/progress?courseId=${courseId}`)
          .then(res => res.json())
          .then(data => { if (data.completed) setCompletedParams(data.completed) })
          .catch(e => {});
     }
  }, [isAdmin, courseId]);

  const handleActivityClick = (actId, type) => {
     if (type === 'quiz') return; // Quizzes are handled Server Side upon submit
     fetch('/api/progress', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ activityId: actId })
     });
     if (!completedParams.includes(actId)) setCompletedParams([...completedParams, actId]);
  };

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeModuleId, setActiveModuleId] = useState(null);
  const [activityForm, setActivityForm] = useState(null); // { type: 'resource' | 'quiz' }

  // Modules CRUD
  const handleAddModule = async () => {
    const newModule = { course_id: courseId, title: 'Chuyên đề mới', content: '', order_index: modules.length };
    const res = await fetch('/api/modules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newModule)
    });
    if (res.ok) {
      const data = await res.json();
      setModules([...modules, data]);
    }
  };

  const handleUpdateModuleTitle = async (idx, id, newTitle) => {
    const newMods = [...modules];
    newMods[idx] = { ...newMods[idx], title: newTitle };
    setModules(newMods);
    if (id) {
      await fetch(`/api/modules/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMods[idx])
      });
    }
  };

  const handleDeleteModule = async (e, idx, id) => {
    e.stopPropagation();
    if (!confirm('Bạn có chắc muốn xóa chuyên đề này? Tất cả hoạt động cũng sẽ bị xóa.')) return;
    if (id) await fetch(`/api/modules/${id}`, { method: 'DELETE' });
    const newMods = [...modules];
    newMods.splice(idx, 1);
    setModules(newMods);
  };

  // Activities CRUD
  const openActivityModal = (moduleId) => {
    setActiveModuleId(moduleId);
    setActivityForm(null);
    setIsModalOpen(true);
  };

  const submitActivity = async (e) => {
    e.preventDefault();
    const data = {
       module_id: activeModuleId,
       type: activityForm.type,
       title: e.target.title.value,
       url: e.target.url.value,
       order_index: activities.filter(a => a.module_id === activeModuleId).length
    };
    
    const res = await fetch('/api/activities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    if (res.ok) {
      const saved = await res.json();
      setActivities([...activities, saved]);
      setIsModalOpen(false);
    }
  };

  const handleDeleteActivity = async (e, actId) => {
    e.stopPropagation();
    if (!confirm('Xóa hoạt động này?')) return;
    await fetch(`/api/activities/${actId}`, { method: 'DELETE' });
    setActivities(activities.filter(a => a.id !== actId));
  };
  
  const handleUpdateActivityUrl = async (actId, url) => {
     const act = activities.find(a => a.id === actId);
     await fetch(`/api/activities/${actId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...act, url })
     });
  };

  const handleUpdateActivityTitle = async (actId, title) => {
     const act = activities.find(a => a.id === actId);
     await fetch(`/api/activities/${actId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...act, title })
     });
  };

  const getActivityIcon = (type) => {
    if (type === 'quiz') return '📝';
    if (type === 'resource') return '📕';
    return '📄';
  };

  return (
    <div style={{width: '100%', marginBottom: 60, marginTop: 40, fontFamily: 'sans-serif', position: 'relative'}}>

      {isAdmin && (
         <button 
           onClick={() => setIsEditMode(!isEditMode)}
           style={{position: 'absolute', top: -10, right: 0, background: isEditMode ? '#e74c3c' : '#2ecc71', color: '#fff', padding: '8px 15px', borderRadius: 4, border: 'none', cursor: 'pointer', fontWeight: 'bold'}}
         >
           {isEditMode ? 'Tắt chế độ chỉnh sửa' : 'Bật chế độ chỉnh sửa'}
         </button>
      )}

      {/* Modal Thêm Hoạt động */}
      {isModalOpen && (
        <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
           <div style={{background: '#fff', width: 600, borderRadius: 8, padding: 25, boxShadow: '0 10px 30px rgba(0,0,0,0.2)'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 20, borderBottom: '1px solid #eee', paddingBottom: 15}}>
                 <h2 style={{fontSize: 18, color: '#333'}}>Thêm hoạt động hoặc tài nguyên</h2>
                 <button onClick={() => setIsModalOpen(false)} style={{background: 'none', border: 'none', fontSize: 20, cursor: 'pointer'}}>✖</button>
              </div>
              
              {!activityForm ? (
                <div>
                   <h3 style={{fontSize: 14, color: '#666', marginBottom: 15}}>Chọn loại hoạt động:</h3>
                   <div style={{display: 'flex', gap: 20}}>
                      <div onClick={() => setActivityForm({type: 'resource'})} style={{flex: 1, border: '1px solid #e0e0e0', padding: 20, textAlign: 'center', borderRadius: 8, cursor: 'pointer', hover: {background: '#f9f9f9'}}}>
                         <div style={{fontSize: 32, marginBottom: 10}}>📕</div>
                         <div style={{fontWeight: 'bold', color: '#333', fontSize: 13}}>Tài nguyên (File, Link)</div>
                      </div>
                      <div onClick={() => setActivityForm({type: 'quiz'})} style={{flex: 1, border: '1px solid #e0e0e0', padding: 20, textAlign: 'center', borderRadius: 8, cursor: 'pointer'}}>
                         <div style={{fontSize: 32, marginBottom: 10}}>📝</div>
                         <div style={{fontWeight: 'bold', color: '#333', fontSize: 13}}>Bài kiểm tra</div>
                      </div>
                   </div>
                </div>
              ) : (
                <form onSubmit={submitActivity}>
                   <div style={{marginBottom: 15}}>
                      <label style={{display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 'bold'}}>Tên hoạt động</label>
                      <input name="title" required style={{width: '100%', padding: 10, border: '1px solid #ddd', borderRadius: 4}} placeholder="Ví dụ: Đọc tài liệu chương 1..." />
                   </div>
                   <div style={{marginBottom: 20}}>
                      <label style={{display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 'bold'}}>{activityForm.type === 'quiz' ? 'Đường dẫn Bài thi' : 'Đường dẫn PDF / Link Drive'}</label>
                      <input name="url" style={{width: '100%', padding: 10, border: '1px solid #ddd', borderRadius: 4}} placeholder="https://..." />
                   </div>
                   <div style={{display: 'flex', justifyContent: 'flex-end', gap: 10}}>
                      <button type="button" onClick={() => setActivityForm(null)} style={{background: '#eee', border: 'none', padding: '10px 20px', borderRadius: 4, cursor: 'pointer'}}>Quay lại</button>
                      <button type="submit" style={{background: '#003380', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 4, cursor: 'pointer', fontWeight: 'bold'}}>Lưu hoạt động</button>
                   </div>
                </form>
              )}
           </div>
        </div>
      )}

      {/* Thông tin chính Box */}
      <h3 style={{fontSize: 16, color: '#333', marginBottom: 15, fontWeight: 'bold'}}>Thông tin chính</h3>
      <div style={{border: '1px solid #e0e0e0', borderRadius: 6, overflow: 'hidden', marginBottom: 40, boxShadow: '0 2px 10px rgba(0,0,0,0.02)', background: '#fff'}}>
         
         {/* THỜI KHÓA BIỂU */}
         <div 
           onClick={() => setShowSchedule(!showSchedule)}
           style={{padding: '16px 20px', borderBottom: '1px solid #e0e0e0', color: '#444', fontSize: 14, display: 'flex', justifyContent: 'space-between', cursor: 'pointer', background: showSchedule ? '#f8faff' : '#fff'}}
         >
           <span><span style={{color: '#003380', marginRight: 12}}>📅</span>Thời khóa biểu</span>
           <span style={{color: '#ccc', fontSize: 12, transform: showSchedule ? 'rotate(180deg)' : 'none', transition: '0.3s'}}>▼</span>
         </div>
         {showSchedule && (
           <div style={{padding: '20px', background: '#fff', borderBottom: '1px solid #e0e0e0'}}>
              {course.schedule_url ? (
                <div style={{textAlign: 'center'}}>
                   <p style={{fontSize: 14, color: '#666', marginBottom: 15}}>Lịch học cố định và các buổi live-stream của khóa học này.</p>
                   <a href={course.schedule_url} target="_blank" rel="noreferrer" style={{display: 'inline-block', background: '#003380', color: '#fff', padding: '10px 25px', borderRadius: 6, textDecoration: 'none', fontWeight: 'bold', fontSize: 13}}>
                     👁️ Xem thời khóa biểu (PDF/Link)
                   </a>
                </div>
              ) : (
                <div style={{textAlign: 'center', color: '#999', fontSize: 14, padding: '10px 0'}}>Chưa có thông tin thời khóa biểu cụ thể.</div>
              )}
           </div>
         )}
         
         {/* GIẢNG VIÊN */}
         <div 
           onClick={() => setShowTeacher(!showTeacher)}
           style={{padding: '16px 20px', color: '#444', fontSize: 14, display: 'flex', justifyContent: 'space-between', cursor: 'pointer', background: showTeacher ? '#f8faff' : '#fff'}}
         >
           <span><span style={{color: '#003380', marginRight: 12}}>👨‍🏫</span>Giảng viên</span>
           <span style={{color: '#ccc', fontSize: 12, transform: showTeacher ? 'rotate(180deg)' : 'none', transition: '0.3s'}}>▼</span>
         </div>
         {showTeacher && (
           <div style={{padding: '25px', background: '#fff', borderTop: '1px solid #e0e0e0'}}>
              {teacher ? (
                <div style={{display: 'flex', gap: 20, alignItems: 'center'}}>
                   <div style={{width: 80, height: 80, borderRadius: '50%', background: '#003380', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 900, overflow: 'hidden', flexShrink: 0}}>
                      {teacher.avatar_url ? (
                        <img src={teacher.avatar_url} style={{width: '100%', height: '100%', objectFit: 'cover'}} alt="Teacher" />
                      ) : teacher.name.split(' ').pop()[0]}
                   </div>
                   <div>
                      <h4 style={{margin: '0 0 5px 0', fontSize: 18, color: '#003380', fontWeight: 800}}>{teacher.name}</h4>
                      <div style={{color: '#cc0000', fontSize: 13, fontWeight: 700, marginBottom: 10}}>{teacher.role_title}</div>
                      <p style={{margin: 0, fontSize: 14, color: '#666', lineHeight: 1.5}}>{teacher.bio || 'Giảng viên giàu kinh nghiệm tại H2bmath.'}</p>
                   </div>
                </div>
              ) : (
                <div style={{textAlign: 'center', color: '#999', fontSize: 14, padding: '10px 0'}}>Chưa có thông tin giảng viên.</div>
              )}
           </div>
         )}
      </div>

      <h3 style={{fontSize: 16, color: '#333', marginBottom: 15, fontWeight: 'bold'}}>Nội dung học tập</h3>
      <div style={{border: '1px solid #e0e0e0', borderRadius: 6, overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.02)'}}>
        {modules.length === 0 && <div style={{padding: 20, textAlign: 'center', color: '#999'}}>Chưa có nội dung bài học.</div>}
        {modules.map((m, i) => {
           const modActivities = activities.filter(a => a.module_id === m.id);
           return (
           <div key={m.id || i} style={{borderBottom: i === modules.length-1 && !isEditMode ? 'none' : '1px solid #e0e0e0', position: 'relative'}}>
             <div 
               onClick={() => setOpenIndex(openIndex === i ? -1 : i)}
               style={{padding: '16px 20px', background: isEditMode ? '#fdfdfd' : '#fff', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#333', fontSize: 14}}
             >
               <div style={{display: 'flex', gap: 12, alignItems: 'center', width: '80%'}}>
                  <span style={{color: '#ccc'}}>📂</span>
                  {isEditMode ? (
                     <input 
                       value={m.title} 
                       onClick={(e) => e.stopPropagation()}
                       onChange={(e) => handleUpdateModuleTitle(i, m.id, e.target.value)}
                       style={{width: '100%', padding: '6px', border: '1px solid #ddd', borderRadius: 3, fontWeight: 'bold'}}
                     />
                  ) : <span style={{fontWeight: 'bold', color: '#003380'}}>{m.title}</span>}
               </div>

               {isEditMode ? (
                 <button onClick={(e) => handleDeleteModule(e, i, m.id)} style={{background: '#ff4d4f', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', padding: '5px 10px'}}>🗑 Xóa CD</button>
               ) : (
                 <span style={{transform: openIndex === i ? 'rotate(180deg)' : 'none', transition: '0.3s', color: '#ccc', fontSize: 12}}>▼</span>
               )}
             </div>

             {(openIndex === i || (isEditMode && openIndex !== i)) && (
               <div style={{padding: isEditMode ? '10px 20px 20px' : '0', background: '#fafafa', borderTop: '1px solid #f0f0f0'}}>
                  
                  {/* Render Moodle Activities inside Module */}
                  <div style={{display: 'flex', flexDirection: 'column'}}>
                     {modActivities.map(act => (
                        <div key={act.id} style={{padding: '12px 20px 12px 45px', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                           <div style={{display: 'flex', gap: 12, alignItems: 'center', flex: 1}}>
                              <span>{getActivityIcon(act.type)}</span>
                              {isEditMode ? (
                                <div style={{display: 'flex', flexDirection: 'column', gap: 5, width: '100%'}}>
                                  <input value={act.title} onChange={e => {
                                     const newActivities = [...activities];
                                     const idx = newActivities.findIndex(a => a.id === act.id);
                                     newActivities[idx].title = e.target.value;
                                     setActivities(newActivities);
                                  }} onBlur={e => handleUpdateActivityTitle(act.id, e.target.value)} style={{border: '1px solid #ccc', padding: 4, width: '80%'}} />
                                  <input value={act.url || ""} onChange={e => {
                                     const newActivities = [...activities];
                                     const idx = newActivities.findIndex(a => a.id === act.id);
                                     newActivities[idx].url = e.target.value;
                                     setActivities(newActivities);
                                  }} onBlur={e => handleUpdateActivityUrl(act.id, e.target.value)} style={{border: '1px outline #eee', padding: 4, fontSize: 11, width: '80%', color: '#666', display: act.type === 'quiz' ? 'none' : 'block'}} placeholder="URL Link..." />
                                  {act.type === 'quiz' && (
                                     <Link href={`/course/${courseId}/quiz/${act.id}`} style={{fontSize: 12, color: '#e74c3c', fontWeight: 'bold'}}>⚙️ Cấu hình Đề thi & Xem Điểm</Link>
                                  )}
                                </div>
                              ) : (
                                <Link 
                                  href={act.type === 'quiz' ? `/course/${courseId}/quiz/${act.id}` : (act.url || '#')} 
                                  target={act.type === 'quiz' ? "_self" : "_blank"} 
                                  onClick={() => handleActivityClick(act.id, act.type)}
                                  style={{textDecoration: 'none', color: '#1a56db', fontSize: 14, display: 'flex', alignItems: 'center', gap: 10}}
                                >
                                  {act.title}
                                  {completedParams.includes(act.id) && (
                                    <span style={{color: '#2ecc71', fontSize: 13, background: '#e8f5e9', padding: '2px 6px', borderRadius: 4, fontWeight: 'bold'}}>
                                      ✓ Đã hoàn thành
                                    </span>
                                  )}
                                </Link>
                              )}
                           </div>
                           {isEditMode && (
                              <button onClick={(e) => handleDeleteActivity(e, act.id)} style={{background: 'none', border: 'none', color: '#ff4d4f', cursor: 'pointer'}}>✖</button>
                           )}
                        </div>
                     ))}
                  </div>

                  {/* Nút Thêm Hoạt Động (Moodle Style) */}
                  {isEditMode && (
                    <div style={{paddingLeft: 45, paddingTop: 15}}>
                      <span onClick={() => openActivityModal(m.id)} style={{color: '#003380', cursor: 'pointer', fontSize: 13, fontWeight: 'bold'}}>
                        + Thêm hoạt động hoặc tài nguyên
                      </span>
                    </div>
                  )}
               </div>
             )}
           </div>
        )})}
      </div>
      
      {isEditMode && (
         <button onClick={handleAddModule} style={{marginTop: 15, background: '#f0f0f0', color: '#333', border: '1px dashed #ccc', width: '100%', padding: '15px', borderRadius: 6, cursor: 'pointer', fontWeight: 'bold'}}>
           + Thêm chuyên đề mới
         </button>
      )}
    </div>
  );
}
