'use client';
import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function InteractiveVideoEditorPage() {
  const params = useParams();
  const { id: courseId, activityId } = params;
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [activity, setActivity] = useState(null);
  const [interactions, setInteractions] = useState([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  const videoRef = useRef(null);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [editingMarker, setEditingMarker] = useState(null);

  useEffect(() => {
    fetchData();
  }, [activityId]);

  const fetchData = async () => {
    try {
      const res = await fetch(`/api/activities/${activityId}`);
      if (res.ok) {
        const data = await res.json();
        setActivity(data.activity);
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

  const saveInteractions = async () => {
    try {
      const res = await fetch(`/api/activities/${activityId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...activity,
          details: JSON.stringify(interactions)
        })
      });
      if (res.ok) {
        alert('Đã lưu cấu hình video tương tác!');
      } else {
        const errorData = await res.json();
        alert('Lỗi khi lưu cấu hình: ' + (errorData.error || 'Máy chủ từ chối'));
      }
    } catch(e) {
      alert('Lỗi kết nối server: ' + e.message);
    }
  };

  const addMarker = () => {
    const time = Math.floor(currentTime);
    const newMarker = {
      id: Date.now(),
      time,
      question: 'Nhập câu hỏi của bạn tại đây...',
      options: ['Đáp án A', 'Đáp án B', 'Đáp án C', 'Đáp án D'],
      correct: 0,
      type: 'multiple-choice'
    };
    setInteractions([...interactions, newMarker].sort((a,b) => a.time - b.time));
    setEditingMarker(newMarker);
    setShowQuestionForm(true);
    if (videoRef.current) videoRef.current.pause();
  };

  const updateMarker = (updated) => {
    setInteractions(interactions.map(m => m.id === updated.id ? updated : m).sort((a,b) => a.time - b.time));
    setEditingMarker(updated);
  };

  const deleteMarker = (id) => {
    if (confirm('Xóa marker này?')) {
      setInteractions(interactions.filter(m => m.id !== id));
      setShowQuestionForm(false);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const getYoutubeId = (url) => {
    if (!url) return null;
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)?([\w-]{11})/);
    return match ? match[1] : null;
  };

  const isYoutube = activity?.url && (activity.url.includes('youtube.com') || activity.url.includes('youtu.be'));
  const ytId = isYoutube ? getYoutubeId(activity.url) : null;

  if (loading) return <div style={{padding: 50, textAlign: 'center'}}>Đang tải dữ liệu biên soạn...</div>;
  if (!activity) return <div style={{padding: 50, textAlign: 'center'}}>Không tìm thấy hoạt động video.</div>;

  return (
    <div style={{fontFamily: 'Inter, system-ui, sans-serif', background: '#f8fafc', minHeight: '100vh', display: 'flex', flexDirection: 'column'}}>
      
      {/* HEADER */}
      <div style={{background: '#003380', color: '#fff', padding: '15px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.1)'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 15}}>
          <Link href={`/admin/course/manage/${courseId}`} style={{color: '#fff', textDecoration: 'none', background: 'rgba(255,255,255,0.2)', padding: '6px 15px', borderRadius: 20, fontSize: 13}}>← Quay Lại Quản Lý</Link>
          <h1 style={{fontSize: 18, margin: 0, fontWeight: 700}}>🎬 Trình biên soạn Video Tương Tác: {activity.title}</h1>
        </div>
        <button onClick={saveInteractions} style={{background: '#2ecc71', color: '#fff', border: 'none', padding: '8px 25px', borderRadius: 6, fontWeight: 'bold', cursor: 'pointer'}}>💾 Lưu Cấu Hình</button>
      </div>

      {/* MAIN CONTENT AREA */}
      <div style={{flex: 1, display: 'flex', padding: 20, gap: 20, height: 'calc(100vh - 70px)', overflow: 'hidden'}}>
        
        {/* LEFT: VIDEO PLAYER & TIMELINE */}
        <div style={{flex: 1, display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0}}>
          <div style={{background: '#000', borderRadius: 12, overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', position: 'relative', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
            {isYoutube ? (
              <div style={{textAlign: 'center', color: '#fff', padding: 40}}>
                <p>📺 Video YouTube: <b>{ytId}</b></p>
                <p style={{fontSize: 13, opacity: 0.7}}>Lưu ý: YouTube Player cần sử dụng API để đồng bộ timeline chính xác nhất. <br/>Trong trình biên soạn này, hãy sử dụng video tải lên để có trải nghiệm tốt nhất.</p>
                <iframe 
                  src={`https://www.youtube.com/embed/${ytId}?enablejsapi=1`} 
                  style={{width: '100%', aspectRatio: '16/9', border: 'none'}} 
                  title="YouTube Preview"
                />
              </div>
            ) : (
              <video 
                ref={videoRef}
                src={activity.url ? (activity.url.startsWith('/uploads/') ? '/api/stream/' + activity.url.replace('/uploads/', '') : activity.url) : undefined}
                controls
                style={{width: '100%', maxHeight: '100%'}}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
              />
            )}
            
            {/* Visual markers overlay (simplified) */}
            <div style={{position: 'absolute', bottom: 60, left: 20, right: 20, height: 6, background: 'rgba(255,255,255,0.3)', borderRadius: 3}}>
              {interactions.map(m => (
                <div 
                  key={m.id}
                  onClick={() => {
                    if (videoRef.current) videoRef.current.currentTime = m.time;
                    setEditingMarker(m);
                    setShowQuestionForm(true);
                  }}
                  style={{
                    position: 'absolute', 
                    left: `${(m.time / (duration || 1)) * 100}%`, 
                    width: 12, 
                    height: 12, 
                    background: '#f59e0b', 
                    borderRadius: '50%', 
                    top: -3, 
                    cursor: 'pointer', 
                    border: '2px solid #fff',
                    transform: 'translateX(-50%)'
                  }}
                  title={`Câu hỏi tại ${m.time}s`}
                />
              ))}
            </div>
          </div>

          <div style={{background: '#fff', padding: 20, borderRadius: 12, boxShadow: '0 4px 15px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: 20}}>
            <div style={{fontSize: 20, fontWeight: 900, color: '#003380', width: 80}}>
              {Math.floor(currentTime / 60)}:{(currentTime % 60).toFixed(0).padStart(2, '0')}
            </div>
            <button onClick={addMarker} style={{background: '#003380', color: '#fff', border: 'none', padding: '12px 25px', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8}}>
              ➕ Thêm điểm dừng (Add Question)
            </button>
            <p style={{margin: 0, color: '#666', fontSize: 13}}>Dừng video tại đây và yêu cầu học sinh trả lời câu hỏi để tiếp tục.</p>
          </div>
        </div>

        {/* RIGHT: CONFIGURATION PANEL */}
        <div style={{width: 400, background: '#fff', borderRadius: 12, boxShadow: '0 4px 15px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', overflow: 'hidden'}}>
          <div style={{padding: 20, borderBottom: '1px solid #eee', background: '#f8fafc'}}>
            <h3 style={{fontSize: 16, margin: 0, color: '#333'}}>📋 Danh sách tương tác ({interactions.length})</h3>
          </div>
          
          <div style={{flex: 1, overflowY: 'auto', padding: 15}}>
            {interactions.length === 0 && <div style={{textAlign: 'center', color: '#aaa', padding: 40, fontSize: 14}}>Chưa có câu hỏi nào. <br/>Hãy bấm "Thêm điểm dừng" để bắt đầu.</div>}
            {interactions.map((m, idx) => (
              <div 
                key={m.id} 
                onClick={() => { setEditingMarker(m); setShowQuestionForm(true); }}
                style={{
                  padding: 15, 
                  borderRadius: 10, 
                  background: editingMarker?.id === m.id ? '#eff6ff' : '#fff', 
                  border: editingMarker?.id === m.id ? '1px solid #3b82f6' : '1px solid #f0f0f0',
                  marginBottom: 10,
                  cursor: 'pointer',
                  transition: '0.2s'
                }}
              >
                <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 5}}>
                  <span style={{fontWeight: 'bold', color: '#3b82f6', fontSize: 13}}>#{idx + 1} - Tại {m.time} giây</span>
                  <span style={{fontSize: 12, color: '#999'}}>{m.type === 'multiple-choice' ? 'Trắc nghiệm' : 'Đúng/Sai'}</span>
                </div>
                <div style={{fontSize: 14, color: '#333', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{m.question}</div>
              </div>
            ))}
          </div>

          {/* QUESTION EDITOR MODAL/FORM */}
          {showQuestionForm && editingMarker && (
            <div style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(255,255,255,0.95)', zIndex: 100, padding: 30, overflowY: 'auto'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 20}}>
                <h3 style={{margin: 0}}>Biên soạn câu hỏi tại {editingMarker.time}s</h3>
                <button onClick={() => setShowQuestionForm(false)} style={{background: 'none', border: 'none', fontSize: 20, cursor: 'pointer'}}>✕</button>
              </div>

              <div style={{marginBottom: 20}}>
                <label style={{display: 'block', marginBottom: 5, fontSize: 13, fontWeight: 'bold'}}>Câu hỏi</label>
                <textarea 
                  value={editingMarker.question} 
                  onChange={e => updateMarker({...editingMarker, question: e.target.value})}
                  style={{width: '100%', padding: 12, borderRadius: 8, border: '1px solid #ddd', height: 80}}
                />
              </div>

              <div style={{marginBottom: 20}}>
                <label style={{display: 'block', marginBottom: 10, fontSize: 13, fontWeight: 'bold'}}>Các lựa chọn & Đáp án đúng</label>
                {editingMarker.options.map((opt, oIdx) => (
                  <div key={oIdx} style={{display: 'flex', gap: 10, marginBottom: 8, alignItems: 'center'}}>
                    <input 
                      type="radio" 
                      name="correct" 
                      checked={editingMarker.correct === oIdx} 
                      onChange={() => updateMarker({...editingMarker, correct: oIdx})}
                    />
                    <input 
                      value={opt} 
                      onChange={e => {
                        const newOpts = [...editingMarker.options];
                        newOpts[oIdx] = e.target.value;
                        updateMarker({...editingMarker, options: newOpts});
                      }}
                      style={{flex: 1, padding: '8px 12px', borderRadius: 6, border: '1px solid #eee'}}
                    />
                  </div>
                ))}
              </div>

              <div style={{display: 'flex', gap: 10, marginTop: 40}}>
                <button onClick={() => setShowQuestionForm(false)} style={{flex: 1, background: '#003380', color: '#fff', border: 'none', padding: '12px', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer'}}>Xong ✅</button>
                <button onClick={() => deleteMarker(editingMarker.id)} style={{background: '#fee2e2', color: '#ef4444', border: 'none', padding: '12px 20px', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer'}}>Xóa Marker 🗑️</button>
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
