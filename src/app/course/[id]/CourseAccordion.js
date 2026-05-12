'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export default function CourseAccordion({ 
  initialModules = [], 
  initialActivities = [], 
  isAdmin = false, 
  courseId,
  course = {},
  teacher = null,
  isParent = false,
  isPreview = false
}) {
  const searchParams = useSearchParams();
  const [openIndex, setOpenIndex] = useState(0);
  const [modules] = useState(initialModules);
  const [activities] = useState(initialActivities);
  const [completedParams, setCompletedParams] = useState([]);
  const [showSchedule, setShowSchedule] = useState(false);
  const [showTeacher, setShowTeacher] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null);

  useEffect(() => {
    const initialPdf = searchParams.get('view_pdf');
    if (initialPdf) setPdfPreviewUrl(initialPdf);

    if (!isAdmin) {
       fetch(`/api/progress?courseId=${courseId}`)
         .then(res => res.json())
         .then(data => { if (data.completed) setCompletedParams(data.completed) })
         .catch(e => {});
    }
  }, [isAdmin, courseId]);

  const handleActivityClick = (actId, type) => {
     if (type === 'quiz') return; 
     fetch('/api/progress', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ activityId: actId })
     });
     if (!completedParams.includes(actId)) setCompletedParams([...completedParams, actId]);
  };

  const getActivityIcon = (type) => {
    switch(type) {
      case 'quiz': return '📝';
      case 'video': return '🎥';
      case 'interactive_video': return '🎬';
      case 'link': return '🔗';
      case 'label': return '🏷️';
      case 'scorm': return '📦';
      default: return '📕';
    }
  };

  const renderActivity = (act) => {


    const youtubeId = act.type === 'video' && act.url ? extractYoutubeId(act.url) : null;
    if (youtubeId) {
      return (
        <div key={act.id} style={{padding: '20px 20px 20px 45px', borderBottom: '1px solid #eee', background: '#f9f9f9'}}>
           <div style={{display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12}}>
              <span>{getActivityIcon(act.type)}</span>
              <span style={{fontWeight: 'bold', fontSize: 14, color: '#003380'}}>{act.title}</span>
           </div>
           <div style={{position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}>
             <iframe 
               style={{position: 'absolute', top: 0, left: 0, width: '100%', height: '100%'}}
               src={`https://www.youtube.com/embed/${youtubeId}`}
               frameBorder="0"
               allowFullScreen
               title="YouTube Video"
             />
           </div>
        </div>
      );
    }

    const isPdf = act.url?.toLowerCase().endsWith('.pdf') || act.type === 'resource';

    return (
      <div key={act.id} style={{padding: '12px 20px 12px 45px', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', opacity: isPreview ? 0.8 : 1}}>
         <div style={{display: 'flex', gap: 12, alignItems: 'center', flex: 1}}>
            <span>{getActivityIcon(act.type)}</span>
            <div style={{display: 'flex', flexDirection: 'column'}}>
                {isParent || isPreview ? (
                  <span style={{color: isPreview ? '#444' : '#64748b', fontSize: 14, fontWeight: isPreview ? 500 : 600, opacity: isParent ? 0.8 : 1}}>{act.title}</span>
                ) : (
                  <Link 
                    href={act.type === 'quiz' ? `/course/${courseId}/quiz/${act.id}` : 
                          act.type === 'scorm' ? `/course/${courseId}/scorm/${act.id}` : 
                          (() => {
                            const studioPlayers = ['studio_player.html', 'quiz_player.html', 'fillin_player.html', 'steps_player.html'];
                            const isStudioGame = act.url && studioPlayers.some(p => act.url.includes(p));
                            if (isStudioGame && !act.url.includes('activityId=')) {
                              const separator = act.url.includes('?') ? '&' : '?';
                              return `${act.url}${separator}activityId=${act.id}`;
                            }
                            if (act.type === 'interactive_video') {
                              return `/course/${courseId}/interactive-video/${act.id}`;
                            }
                            return act.url || '#';
                          })()} 
                    target={ (act.type === 'quiz' || act.type === 'scorm' || act.type === 'interactive_video') ? "_self" : "_blank"} 
                    onClick={() => handleActivityClick(act.id, act.type)}
                    style={{textDecoration: 'none', color: '#1a56db', fontSize: 14, display: 'flex', alignItems: 'center', gap: 10, fontWeight: 500}}
                  >
                    {act.title}
                  </Link>
                )}
                 {completedParams.includes(act.id) && !isPreview && (
                   <span style={{color: '#2ecc71', fontSize: 11, background: '#e8f5e9', padding: '2px 6px', borderRadius: 4, fontWeight: 'bold'}}>
                     ✓ Hoàn thành
                   </span>
                 )}
                {isPdf && act.url && act.url.startsWith('/') && !isParent && !isPreview && (
                  <button 
                    onClick={() => setPdfPreviewUrl(act.url)} 
                    style={{background: 'none', border: 'none', color: '#cc0000', fontSize: 12, padding: 0, marginTop: 4, cursor: 'pointer', textAlign: 'left', fontWeight: 'bold'}}
                  >
                    👁️ Xem trực tuyến (Web)
                  </button>
                )}
            </div>
         </div>
      </div>
    );
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('vi-VN');
  };

  return (
    <div style={{width: '100%', marginBottom: 60, marginTop: 40, fontFamily: 'Inter, system-ui, sans-serif'}}>
      
      {/* PDF Viewer Modal */}
      {pdfPreviewUrl && (
        <div style={modalOverlay}>
           <div style={{...modalContent, width: '90%', maxWidth: 1100, height: '90vh', display: 'flex', flexDirection: 'column', position: 'relative'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 15}}>
                 <h3 style={{margin:0}}>Tài liệu học tập</h3>
                 <button onClick={()=>setPdfPreviewUrl(null)} style={{background:'#cc0000', color:'#fff', border:'none', padding: '8px 15px', borderRadius: 6, cursor: 'pointer', fontWeight: 'bold'}}>✖ Đóng lại</button>
              </div>
              <iframe 
                 src={pdfPreviewUrl} 
                 style={{flex: 1, width: '100%', border: 'none', borderRadius: 8}} 
                 title="PDF Viewer"
              />
           </div>
        </div>
      )}

      {/* Information Header */}
      <h3 style={{fontSize: 16, color: '#333', marginBottom: 15, fontWeight: 'bold'}}>Thông tin chính</h3>
      <div style={{border: '1px solid #e0e0e0', borderRadius: 12, overflow: 'hidden', marginBottom: 40, boxShadow: '0 4px 15px rgba(0,0,0,0.03)', background: '#fff'}}>
         <AccordionItem 
           title="Thời khóa biểu & Lịch học" 
           emoji="📅" 
           isOpen={showSchedule} 
           onClick={() => setShowSchedule(!showSchedule)}
         >
            <div style={{padding: 20, textAlign: 'center'}}>
               {course.schedule_date && (
                 <div style={{marginBottom: 20, padding: 15, background: '#f0f7ff', borderRadius: 8, display: 'inline-block', border: '1px solid #c5e0ff'}}>
                    <div style={{fontSize: 12, color: '#003380', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 5}}>Thời gian học</div>
                    <div style={{fontSize: 18, fontWeight: 800, color: '#333'}}>
                       {formatDate(course.schedule_date)} 
                       {course.schedule_date_end ? ` đến ${formatDate(course.schedule_date_end)}` : ''}
                    </div>
                 </div>
               )}
               {course.schedule_url ? (
                 <div>
                    <p style={{fontSize: 14, color: '#666', marginBottom: 15}}>Lịch học chi tiết và các hướng dẫn học tập khác.</p>
                    <a href={course.schedule_url} target="_blank" rel="noreferrer" style={actionBtnStyle}>
                      👁️ Xem chi tiết lịch học (PDF)
                    </a>
                 </div>
               ) : (course.schedule_date ? null : <NoDataMsg msg="Chưa có thông tin thời khóa biểu cụ thể." />)}
            </div>
         </AccordionItem>
         
         <AccordionItem 
           title="Giảng viên" 
           emoji="👨‍🏫" 
           isOpen={showTeacher} 
           onClick={() => setShowTeacher(!showTeacher)}
           isLast
         >
            {teacher ? (
              <div style={{display: 'flex', alignItems: 'center', gap: 15, background: '#f8fbfc', padding: 20, borderRadius: 12, border: '1px solid #e1eaf4'}}>
                 <div style={avatarStyle}>
                    {teacher.avatar_url ? <img src={teacher.avatar_url} style={imgStyle} alt="T" /> : (teacher.name ? teacher.name[0] : 'T')}
                 </div>
                 <div>
                    <h4 style={{margin: '0 0 5px 0', fontSize: 18, color: '#003380', fontWeight: 800}}>{teacher.name || 'Ban Chuyên Môn H2bmath'}</h4>
                    <div style={{color: '#cc0000', fontSize: 13, fontWeight: 700, marginBottom: 10}}>{teacher.role_title}</div>
                    <p style={{margin: 0, fontSize: 14, color: '#666', lineHeight: 1.5}}>{teacher.bio || 'Giảng viên giàu kinh nghiệm tại H2bmath.'}</p>
                 </div>
              </div>
            ) : <NoDataMsg msg="Chưa có thông tin giảng viên." />}
         </AccordionItem>
      </div>

      {/* Learning Content */}
      <h3 style={{fontSize: 16, color: '#333', marginBottom: 15, fontWeight: 'bold'}}>Nội dung học tập</h3>
      <div style={{border: '1px solid #e0e0e0', borderRadius: 12, overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', background: '#fff'}}>
        {modules.length === 0 && <div style={{padding: 40, textAlign: 'center', color: '#999'}}>Chưa có nội dung bài học.</div>}
        {modules.map((m, i) => (
          <div key={m.id} style={{borderBottom: i === modules.length - 1 ? 'none' : '1px solid #eee'}}>
            <div 
              onClick={() => setOpenIndex(openIndex === i ? -1 : i)}
              style={{padding: '18px 25px', background: openIndex === i ? '#f8faff' : '#fff', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}
            >
              <div style={{display: 'flex', gap: 15, alignItems: 'center'}}>
                 <span style={{fontSize: 20}}>📂</span>
                 <span style={{fontWeight: 'bold', color: '#003380', fontSize: 15}}>{m.title}</span>
              </div>
              <span style={{transform: openIndex === i ? 'rotate(180deg)' : 'none', transition: '0.3s', color: '#ccc'}}>▼</span>
            </div>

            {openIndex === i && (
              <div style={{background: '#fafafa', borderTop: '1px solid #f0f0f0'}}>
                {activities.filter(a => a.module_id === m.id).map(act => renderActivity(act))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function AccordionItem({ title, emoji, isOpen, onClick, children, isLast }) {
  return (
    <div style={{borderBottom: isLast ? 'none' : '1px solid #eee'}}>
      <div onClick={onClick} style={{padding: '16px 25px', display: 'flex', justifyContent: 'space-between', cursor: 'pointer', background: isOpen ? '#f8faff' : '#fff'}}>
        <span><span style={{marginRight: 12}}>{emoji}</span>{title}</span>
        <span style={{color: '#ccc', transform: isOpen ? 'rotate(180deg)' : 'none', transition: '0.3s'}}>▼</span>
      </div>
      {isOpen && children}
    </div>
  );
}

function NoDataMsg({ msg }) {
  return <div style={{textAlign: 'center', color: '#999', fontSize: 14, padding: '20px 0'}}>{msg}</div>;
}

function extractYoutubeId(url) {
  const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

const actionBtnStyle = { display: 'inline-block', background: '#003380', color: '#fff', padding: '10px 25px', borderRadius: 8, textDecoration: 'none', fontWeight: 'bold', fontSize: 13, boxShadow: '0 4px 10px rgba(0,51,128,0.2)' };
const avatarStyle = { width: 80, height: 80, borderRadius: '50%', background: '#003380', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 900, overflow: 'hidden', flexShrink: 0 };
const imgStyle = { width: '100%', height: '100%', objectFit: 'cover' };

const modalOverlay = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: 20 };
const modalContent = { background: '#fff', padding: 30, borderRadius: 16, boxShadow: '0 10px 40px rgba(0,0,0,0.3)' };
