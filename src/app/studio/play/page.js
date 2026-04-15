'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import MatchGamePlayer from '@/app/components/studio/MatchGamePlayer';
import WheelGamePlayer from '@/app/components/studio/WheelGamePlayer';

function GamePlayerContent() {
  const searchParams = useSearchParams();
  const code = searchParams.get('code');
  const [gameData, setGameData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (code) {
      fetch(`/api/studio/play?code=${code}`)
        .then(res => res.json())
        .then(data => {
          if (data.error) setError(data.error);
          else {
             // Parse config_json if it's a string
             const parsedGame = { ...data.game };
             if (typeof parsedGame.config_json === 'string') {
                try { parsedGame.config_json = JSON.parse(parsedGame.config_json); } catch(e) {}
             }
             setGameData(parsedGame);
          }
        })
        .catch(e => setError('Lỗi kết nối máy chủ'))
        .finally(() => setLoading(false));
    }
  }, [code]);

  const submitScore = async (score) => {
     if (!gameData?.id) return;
     try {
        await fetch('/api/studio/play', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ project_id: gameData.id, score })
        });
     } catch (e) { console.error('Failed to submit score', e); }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontSize: '18px', color: '#64748b' }}>Đang tải trò chơi...</div>;
  if (error) return <div style={{ textAlign: 'center', padding: '100px', color: '#ef4444' }}><h2>Lỗi: {error}</h2></div>;
  if (!gameData) return null;

  return (
    <div style={{ minHeight: '100vh', background: '#f5f7f9', padding: '40px 20px' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <header style={{ textAlign: 'center', marginBottom: '40px' }}>
           <h1 style={{ fontSize: '28px', color: '#1e293b', fontWeight: '900' }}>
             {gameData.game_type === 'match' ? '🧩 Trò chơi Ghép Cặp' : '🎡 Vòng Quay May Mắn'}
           </h1>
           <div style={{ fontSize: '14px', color: '#94a3b8', marginTop: '10px' }}>Mã phòng: {code}</div>
        </header>

        <div style={{ background: '#fff', borderRadius: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
           {gameData.game_type === 'match' && <MatchGamePlayer config={gameData.config_json} onComplete={(moves) => submitScore(100 - moves)} />}
           {gameData.game_type === 'wheel' && <WheelGamePlayer config={gameData.config_json} onComplete={(result) => submitScore(50)} />}
        </div>
      </div>
    </div>
  );
}

export default function PlayPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <GamePlayerContent />
    </Suspense>
  );
}
