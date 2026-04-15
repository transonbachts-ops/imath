'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import InteractiveVideoPlayer from '@/app/components/InteractiveVideoPlayer';

export default function StudentInteractiveVideoPage() {
  const params = useParams();
  const { id: courseId, activityId } = params;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [activity, setActivity] = useState(null);
  const [interactions, setInteractions] = useState([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [progress, setProgress] = useState({ answeredCount: 0, totalCount: 0 });

  useEffect(() => {
    fetchData();
  }, [activityId]);

  const fetchData = async () => {
    try {
      const res = await fetch(`/api/activities/${activityId}`);
      if (res.ok) {
        const data = await res.json();
        setActivity(data.activity);
        setIsCompleted(data.isCompleted);
        
        if (data.activity.details) {
          try {
            const parsed = JSON.parse(data.activity.details);
            setInteractions(Array.isArray(parsed) ? parsed : []);
          } catch(e) {
            setInteractions([]);
          }
        }
      }
    } catch(e) {
      console.error(e);
    }
    setLoading(false);
  };

  const markComplete = async () => {
    if (progress.answeredCount < progress.totalCount) {
      alert(`Vui lòng trả lời hết ${progress.totalCount} câu hỏi trước khi hoàn thành!`);
      return;
    }
    try {
      const res = await fetch('/api/activities/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activityId })
      });
      if (res.ok) {
        setIsCompleted(true);
        window.location.href = `/course/${courseId}/learn`;
      }
    } catch (e) {
      alert('Lỗi khi cập nhật tiến độ!');
    }
  };

  if (loading) return <div style={{padding: 50, textAlign: 'center'}}>Đang tải bài học tương tác...</div>;
  if (!activity) return <div style={{padding: 50, textAlign: 'center'}}>Nội dung không tồn tại.</div>;

  const allAnswered = progress.answeredCount >= progress.totalCount;

  return (
    <div style={{fontFamily: 'Inter, system-ui, sans-serif', background: '#f0f4f8', minHeight: '100vh', display: 'flex', flexDirection: 'column'}}>
      
      {/* HEADER */}
      <div style={{
        background: 'linear-gradient(135deg, #003380 0%, #001a4d 100%)', 
        color: '#fff', 
        padding: '20px 30px', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)', 
        zIndex: 10
      }}>
         <div style={{display: 'flex', alignItems: 'center', gap: 20}}>
             <Link href={`/course/${courseId}/learn`} style={{
               color: '#fff', 
               textDecoration: 'none', 
               background: 'rgba(255,255,255,0.15)', 
               padding: '8px 18px', 
               borderRadius: 25, 
               fontSize: 13,
               fontWeight: 600,
               transition: '0.3s',
               border: '1px solid rgba(255,255,255,0.1)'
             }}
             onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
             onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
             >
               ← Quay Lại
             </Link>
             <h1 style={{fontSize: 20, margin: 0, fontWeight: 800, color: '#fff', letterSpacing: '0.5px'}}>
               🎬 {activity.title}
             </h1>
         </div>
         <div style={{display: 'flex', alignItems: 'center', gap: 15}}>
           <div style={{
             background: 'rgba(255,255,255,0.1)', 
             padding: '8px 20px', 
             borderRadius: 12, 
             fontSize: 14,
             border: '1px solid rgba(255,255,255,0.1)'
           }}>
              Tiến độ: <b style={{color: '#f39c12'}}>{progress.answeredCount}/{progress.totalCount}</b> câu hỏi
           </div>
           {isCompleted ? (
              <span style={{
                background: '#00c853', 
                color: '#fff', 
                padding: '8px 20px', 
                borderRadius: 30, 
                fontSize: 13, 
                fontWeight: 800,
                boxShadow: '0 4px 12px rgba(0, 200, 83, 0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}>
                <span style={{fontSize: 16}}>✓</span> Đã hoàn thành
              </span>
           ) : (
              <span style={{
                background: 'linear-gradient(90deg, #f39c12, #e67e22)', 
                color: '#fff', 
                padding: '8px 20px', 
                borderRadius: 30, 
                fontSize: 13, 
                fontWeight: 800,
                boxShadow: '0 4px 12px rgba(243, 156, 18, 0.3)'
              }}>
                🎬 Đang học
              </span>
           )}
         </div>
      </div>

      {/* MAIN PLAYER AREA */}
      <div style={{flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px 20px'}}>
         <div style={{width: '100%', maxWidth: 1000}}>
            <InteractiveVideoPlayer 
              url={activity.url?.startsWith('/uploads/') ? '/api/stream/' + activity.url.replace('/uploads/', '') : activity.url} 
              interactions={interactions} 
              onProgress={(p) => setProgress(p)}
              onComplete={() => {
                if (!isCompleted) {
                  // Optional: Automatically mark complete or show button
                }
              }}
            />
            
            <div style={{marginTop: 30, background: '#fff', padding: 25, borderRadius: 16, boxShadow: '0 4px 15px rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
               <div>
                  <h3 style={{margin: '0 0 5px 0', fontSize: 16, color: '#333'}}>Hướng dẫn học tập</h3>
                  <p style={{margin: 0, fontSize: 14, color: '#666'}}>
                    {allAnswered 
                      ? 'Bạn đã trả lời hết các câu hỏi. Bấm nút bên phải để ghi nhận hoàn thành.' 
                      : `Bạn cần trả lời hết ${progress.totalCount} câu hỏi xuất hiện trong video để có thể bấm Hoàn Thành.`}
                  </p>
               </div>
               {!isCompleted ? (
                 <button 
                   onClick={markComplete} 
                   disabled={!allAnswered}
                   style={{
                     background: allAnswered ? '#2ecc71' : '#ccc', 
                     color: '#fff', 
                     border: 'none', 
                     padding: '14px 40px', 
                     borderRadius: 30, 
                     fontSize: 16, 
                     fontWeight: 'bold', 
                     cursor: allAnswered ? 'pointer' : 'not-allowed', 
                     boxShadow: allAnswered ? '0 4px 15px rgba(46, 204, 113, 0.4)' : 'none',
                     transition: '0.3s'
                   }}
                 >
                   XÁC NHẬN HOÀN THÀNH ✅
                 </button>
               ) : (
                 <button onClick={() => { window.location.href = `/course/${courseId}/learn`; }} style={{background: '#003380', color: '#fff', border: 'none', padding: '14px 40px', borderRadius: 30, fontSize: 16, fontWeight: 'bold', cursor: 'pointer'}}>
                   BÀI TIẾP THEO →
                 </button>
               )}
            </div>
         </div>
      </div>

    </div>
  );
}
