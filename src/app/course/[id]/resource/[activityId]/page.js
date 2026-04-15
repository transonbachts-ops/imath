'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ResourceViewerPage() {
  const params = useParams();
  const { id: courseId, activityId } = params;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [activity, setActivity] = useState(null);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Create a small API endpoint to fetch just the activity or use an existing one if possible
      // Wait, we don't have a dedicated endpoint for just "get activity by id" for students except /api/admin/courses ... oh wait, learning page gets it via SSR.
      // For simplicity, let's fetch course activities via SSR-like approach or an API.
      // But this is a client component. Let's create an API endpoint `/api/activities/[id]` to get the single activity for a student.
      const res = await fetch(`/api/activities/${activityId}`);
      if (res.ok) {
        const data = await res.json();
        setActivity(data.activity);
        setIsCompleted(data.isCompleted);
      }
    } catch(e) {
      console.error(e);
    }
    setLoading(false);
  };

  const markComplete = async () => {
    try {
      const res = await fetch('/api/activities/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activityId })
      });
      if (res.ok) {
        setIsCompleted(true);
        // Optionally redirect back to course learn page
        router.push(`/course/${courseId}/learn`);
      } else {
        alert('Có lỗi xảy ra khi cập nhật tiến độ!');
      }
    } catch (e) {
      alert('Lỗi kết nối máy chủ!');
    }
  };

  const getEmbedVideoUrl = (url) => {
    if (!url) return null;
    // YouTube
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtu\.be\/|youtube\.com\/embed\/)?([\w-]{11})/);
    if (ytMatch && !url.includes('embed')) return `https://www.youtube.com/embed/${ytMatch[1]}`;
    
    // Google Drive
    if (url.includes('drive.google.com')) {
      const driveIdMatch = url.match(/\/file\/d\/([\w-]+)/) || url.match(/[?&]id=([\w-]+)/);
      if (driveIdMatch) return `https://drive.google.com/file/d/${driveIdMatch[1]}/preview`;
    }
    return url;
  };

  const isVideoFile = (url) => {
    if (!url) return false;
    const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov'];
    const lowerUrl = url.toLowerCase();
    return videoExtensions.some(ext => lowerUrl.endsWith(ext)) || lowerUrl.includes('video/mp4') || lowerUrl.includes('googlevideo.com');
  };

  const getPdfViewerUrl = (url) => {
    if (!url) return null;
    // If it's a local URL or already a Google viewer URL, return as-is
    if (url.startsWith('/') || url.includes('docs.google.com')) return url;
    // For external PDF links, wrap in Google Docs viewer as fallback
    if (url.toLowerCase().includes('.pdf') || url.includes('drive.google.com')) {
      return `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
    }
    return url;
  };

  if (loading) return <div style={{padding: 50, textAlign: 'center'}}>Đang tải nội dung...</div>;
  if (!activity) return <div style={{padding: 50, textAlign: 'center', color: '#e74c3c'}}>Không tìm thấy tài nguyên.</div>;

  return (
    <div style={{fontFamily: 'var(--font-nunito), sans-serif', background: '#f8fafc', minHeight: '100vh', display: 'flex', flexDirection: 'column'}}>
      
      {/* HEADER */}
      <div style={{background: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(20px)', color: '#0f172a', padding: '15px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', zIndex: 100, position: 'sticky', top: 0, borderBottom: '1px solid rgba(0,0,0,0.05)'}}>
         <div style={{display: 'flex', alignItems: 'center', gap: 20}}>
             <Link href={`/course/${courseId}/learn`} style={{color: '#003380', textDecoration: 'none', background: 'rgba(0,51,128,0.05)', padding: '8px 18px', borderRadius: 12, fontSize: 13, fontWeight: 700, transition: '0.2s'}}>
                <span style={{marginRight: 6}}>←</span> Trở về bài giảng
             </Link>
             <h1 style={{fontSize: 20, margin: 0, fontWeight: 800, color: '#1e293b'}}>
                <span style={{marginRight: 10, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'}}>{activity.type === 'resource' ? '📕' : activity.type === 'video' ? '🎥' : '📄'}</span> 
                {activity.title}
             </h1>
         </div>
         <div style={{display: 'flex', alignItems: 'center', gap: 15}}>
            {isCompleted ? (
                <div style={{background: '#ecfdf5', color: '#059669', padding: '8px 16px', borderRadius: 20, fontSize: 13, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6}}>
                  <span style={{fontSize: 16}}>✓</span> Đã hoàn tất bài học
                </div>
            ) : (
                <div style={{background: '#fff7ed', color: '#c2410c', padding: '8px 16px', borderRadius: 20, fontSize: 13, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6}}>
                  <div style={{width: 8, height: 8, borderRadius: '50%', background: '#f97316', animation: 'pulse 2s infinite'}}></div> Đang trong tiến trình học
                </div>
            )}
         </div>
      </div>

      {/* CONTENT AREA */}
      <div style={{flex: 1, display: 'flex', justifyContent: 'center', padding: '30px 0'}}>
         {activity.type === 'resource' && (
            <div style={{width: '95%', maxWidth: 1200, height: 'calc(100vh - 200px)', borderRadius: 24, overflow: 'hidden', boxShadow: '0 30px 60px rgba(0,0,0,0.12)', background: '#fff', border: '1px solid rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column'}}>
              {activity.url ? (
                <iframe 
                  src={getPdfViewerUrl(activity.url) || undefined} 
                  style={{width: '100%', flex: 1, border: 'none'}} 
                  title="PDF Viewer"
                  onError={(e) => { e.target.src = `https://docs.google.com/viewer?url=${encodeURIComponent(activity.url)}&embedded=true`; }}
                />
              ) : (
                <div style={{flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', gap: 15}}>
                   <span style={{fontSize: 48}}>📄</span>
                   <p style={{fontSize: 16, fontWeight: 600}}>Tài liệu này không có dữ liệu để hiển thị.</p>
                </div>
              )}
              {activity.url && (
                <div style={{background: '#f8fafc', padding: '12px 30px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                  <span style={{color: '#64748b', fontSize: 13, fontWeight: 500}}>Nếu bạn không xem được PDF?</span>
                  <a href={activity.url} target="_blank" rel="noreferrer" style={{color: '#003380', fontWeight: '800', fontSize: 13, textDecoration: 'none', background: '#fff', padding: '6px 15px', borderRadius: 10, border: '1px solid #00338020', boxShadow: '0 2px 4px rgba(0,0,0,0.05)'}}>
                    📥 Tải về thiết bị
                  </a>
                </div>
              )}
            </div>
         )}

         {activity.type === 'video' && (
            <div style={{width: '95%', maxWidth: 1100, margin: '0 auto'}}>
                <div style={{position: 'relative', borderRadius: 28, overflow: 'hidden', boxShadow: '0 40px 80px rgba(0,0,0,0.25)', background: '#000', border: '1px solid rgba(255,255,255,0.1)'}}>
                   {activity.url ? (
                     isVideoFile(activity.url) ? (
                        <video 
                          controls 
                          playsInline
                          preload="metadata"
                          controlsList="nodownload"
                          style={{width: '100%', display: 'block', maxHeight: '80vh', background: '#000'}} 
                        >
                           <source src={activity.url?.startsWith('/uploads/') ? '/api/stream/' + activity.url.replace('/uploads/', '') : activity.url} />
                           <p style={{color: '#fff', padding: 20}}>
                              Trình duyệt hoặc phần mềm máy của bạn không hỗ trợ định dạng video này (lỗi định dạng). Bạn có thể bấm vào nút "Mở trong tab mới" ở bên dưới. Khuyến nghị chỉ upload video đuôi .mp4!
                           </p>
                        </video>
                     ) : (
                        <div style={{position: 'relative', paddingBottom: '56.25%', height: 0}}>
                          <iframe 
                            src={getEmbedVideoUrl(activity.url) || undefined} 
                            style={{position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none'}} 
                            allowFullScreen 
                            allow="autoplay; encrypted-media"
                          />
                        </div>
                     )
                   ) : (
                     <div style={{height: 400, color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20}}>
                        <span style={{fontSize: 64}}>🎬</span>
                        <p style={{fontSize: 18, fontWeight: 700, color: '#94a3b8'}}>Nội dung video đang được chuẩn bị...</p>
                     </div>
                   )}
                </div>
                {activity.url && !activity.url.includes('youtube.com') && (
                  <div style={{marginTop: 25, textAlign: 'center'}}>
                    <a href={activity.url} target="_blank" rel="noreferrer" style={{color: '#475569', fontSize: 14, textDecoration: 'none', background: 'rgba(255,255,255,0.8)', padding: '10px 25px', borderRadius: 30, boxShadow: '0 10px 20px rgba(0,0,0,0.03)', fontWeight: 700, border: '1px solid #e2e8f0', transition: '0.3s'}}>
                      🔗 Mở trong tab mới
                    </a>
                  </div>
                )}
            </div>
         )}

         {activity.type === 'label' && (
            <div style={{width: '95%', maxWidth: 850, margin: '0 auto', background: '#fff', padding: '60px 80px', borderRadius: 32, boxShadow: '0 20px 50px rgba(0,0,0,0.05)', fontSize: 18, lineHeight: 1.8, color: '#334155', border: '1px solid rgba(0,0,0,0.03)'}}>
               <article 
                className="rich-text-content" 
                dangerouslySetInnerHTML={{ __html: activity.details || '' }} 
                style={{
                  fontFamily: 'inherit',
                }}
               />
            </div>
         )}
         
         {activity.type === 'link' && (
             <div style={{width: '95%', maxWidth: 550, margin: '60px auto', background: '#fff', padding: 50, borderRadius: 32, textAlign: 'center', boxShadow: '0 30px 60px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.05)'}}>
                 <div style={{fontSize: 64, marginBottom: 25}}>🔗</div>
                 <h2 style={{fontSize: 28, color: '#0f172a', fontWeight: 800, marginBottom: 15}}>Truy cập liên kết</h2>
                 <p style={{color: '#64748b', marginBottom: 35, lineHeight: 1.6}}>Nội dung này yêu cầu truy cập từ nguồn bên thứ ba. Sau khi xem xong, đừng quên quay lại để đánh dấu hoàn thành.</p>
                 <a href={activity.url} target="_blank" rel="noreferrer" style={{display: 'inline-block', background: 'linear-gradient(135deg, #003380 0%, #0056b3 100%)', color: '#fff', padding: '16px 45px', borderRadius: 16, textDecoration: 'none', fontWeight: 800, fontSize: 16, boxShadow: '0 10px 25px rgba(0, 51, 128, 0.25)', transition: '0.3s'}}>Mở tài nguyên mới</a>
             </div>
         )}
      </div>

      {/* ACTION BAR */}
      <div style={{background: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(20px)', padding: '25px 40px', borderTop: '1px solid rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'center', position: 'sticky', bottom: 0, zIndex: 100}}>
         {!isCompleted ? (
             <button 
                onClick={markComplete} 
                style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', 
                  color: '#fff', 
                  border: 'none', 
                  padding: '18px 60px', 
                  borderRadius: 20, 
                  fontSize: 18, 
                  fontWeight: 800, 
                  cursor: 'pointer', 
                  boxShadow: '0 15px 35px rgba(16, 185, 129, 0.3)',
                  transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-5px) scale(1.02)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0) scale(1)'}
             >
                Xác nhận hoàn thành bài học ➜
             </button>
         ) : (
             <button 
                onClick={() => router.push(`/course/${courseId}/learn`)} 
                style={{background: '#f1f5f9', color: '#475569', border: 'none', padding: '16px 50px', borderRadius: 20, fontSize: 16, fontWeight: 800, cursor: 'pointer', transition: '0.2s'}}
             >
                Hoàn thành • Sang bài kế tiếp ➜
             </button>
         )}
      </div>

      <style jsx global>{`
        @keyframes pulse {
          0% { transform: scale(0.95); opacity: 0.8; }
          50% { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(0.95); opacity: 0.8; }
        }
        .rich-text-content img { max-width: 100%; height: auto; border-radius: 16px; margin: 20px 0; border: 1px solid #eee; }
        .rich-text-content h1, .rich-text-content h2 { margin-top: 30px; margin-bottom: 15px; color: #1e293b; }
      `}</style>
    </div>
  );
}
