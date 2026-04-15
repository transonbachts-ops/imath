'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

export default function GamePlayer() {
  const router = useRouter();
  const params = useParams();
  const { id: courseId, activityId } = params;

  const [activity, setActivity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchActivity();
  }, [activityId]);

  const fetchActivity = async () => {
    try {
      const res = await fetch(`/api/course/activities/${activityId}`);
      if (!res.ok) throw new Error('Không thể tải thông tin trò chơi');
      const data = await res.json();
      setActivity(data.activity);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  if (loading) return (
    <div style={{height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', color: '#fff'}}>
       <div style={{textAlign: 'center'}}>
          <div style={{fontSize: 40, marginBottom: 20}}>🎮</div>
          <div style={{fontWeight: 'bold', letterSpacing: 2}}>ĐANG TẢI TRÒ CHƠI...</div>
       </div>
    </div>
  );

  if (error) return <div style={{padding: 40, textAlign: 'center', color: '#ef4444', background: '#0f172a', height: '100vh'}}>{error}</div>;

  // Append activityId to game URL so game can sync back
  const gameUrl = activity?.url ? `${activity.url}${activity.url.includes('?') ? '&' : '?'}activityId=${activityId}` : null;

  return (
    <div style={{height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#0f172a', fontFamily: "'Outfit', sans-serif"}}>
      {/* HUD HEADER */}
      <div style={{height: 60, background: 'rgba(30, 41, 59, 0.8)', backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 25px', color: '#fff', zIndex: 10}}>
         <div style={{display: 'flex', alignItems: 'center', gap: 20}}>
           <Link href={`/course/${courseId}/learn`} style={{color: '#94a3b8', textDecoration: 'none', fontSize: 20, display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '5px 12px', borderRadius: 10}}>❮</Link>
           <div>
              <div style={{fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, letterSpacing: 1}}>Mini-game Toán học</div>
              <h1 style={{fontSize: 16, fontWeight: 900, margin: 0, color: '#fff'}}>{activity?.title}</h1>
           </div>
         </div>
         
         <div style={{display: 'flex', alignItems: 'center', gap: 15}}>
            <button 
               onClick={() => router.push(`/course/${courseId}/learn`)}
               style={{background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', color: '#fff', border: 'none', padding: '8px 20px', borderRadius: 12, cursor: 'pointer', fontSize: 13, fontWeight: 800, boxShadow: '0 4px 15px rgba(139, 92, 246, 0.3)'}}
            >
               💾 THOÁT & LƯU
            </button>
         </div>
      </div>

      {/* GAME FRAME */}
      <div style={{flex: 1, position: 'relative', background: '#000'}}>
         {gameUrl ? (
            <iframe 
               src={gameUrl}
               style={{width: '100%', height: '100%', border: 'none'}}
               title="iMath Game"
               allowFullScreen
            />
         ) : (
            <div style={{color: '#fff', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
               Không tìm thấy đường dẫn trò chơi.
            </div>
         )}
      </div>

      <style jsx global>{`
        body { margin: 0; padding: 0; overflow: hidden; background: #000; }
      `}</style>
    </div>
  );
}
