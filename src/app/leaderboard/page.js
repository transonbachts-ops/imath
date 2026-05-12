'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function LeaderboardPage() {
  const [board, setBoard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/leaderboard').then(r => r.json()).then(data => {
      if (data.leaderboard) setBoard(data.leaderboard);
      setLoading(false);
    });
  }, []);

  return (
    <div style={{minHeight: '100vh', background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)', fontFamily: 'system-ui, sans-serif', paddingBottom: 50}}>
      <div style={{padding: '30px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <Link href="/dashboard" style={{color: '#fff', textDecoration: 'none', background: 'rgba(255,255,255,0.2)', padding: '10px 20px', borderRadius: 20, fontWeight: 'bold'}}>← Về Bàn Làm Việc</Link>
        <span style={{color: '#fff', opacity: 0.8, fontSize: 14}}>Cập nhật trực tiếp</span>
      </div>

      <div style={{maxWidth: 800, margin: '20px auto', background: '#fff', borderRadius: 24, boxShadow: '0 20px 50px rgba(0,0,0,0.3)', overflow: 'hidden'}}>
         <div style={{background: 'linear-gradient(to right, #f39c12, #e67e22)', padding: 40, textAlign: 'center', color: '#fff'}}>
            <div style={{fontSize: 60, marginBottom: 10, animation: 'pulse 2s infinite'}}>🏆</div>
            <h1 style={{margin: 0, fontWeight: 900, fontSize: 32}}>Bảng Vàng Chuyên Cần</h1>
            <p style={{margin: '10px 0 0', opacity: 0.9, fontSize: 16}}>Tôn vinh những tinh thần học tập rực cháy nhất H2bmath</p>
         </div>

         <div style={{padding: 40}}>
           {loading ? (
             <div style={{textAlign: 'center', padding: 40, color: '#888'}}>Đang tải dữ liệu...</div>
           ) : board.length === 0 ? (
             <div style={{textAlign: 'center', padding: 40, color: '#888'}}>Chưa có kỷ lục nào được thiết lập. Hãy là người đầu tiên!</div>
           ) : (
             <div style={{display: 'flex', flexDirection: 'column', gap: 15}}>
               {board.map((u, i) => (
                 <div key={u.id} style={{display: 'flex', alignItems: 'center', padding: '20px 25px', background: i === 0 ? '#fff9f0' : i === 1 ? '#f8f9fa' : i === 2 ? '#fdf8f5' : '#fff', borderRadius: 16, border: `2px solid ${i === 0 ? '#f1c40f' : i === 1 ? '#bdc3c7' : i === 2 ? '#d35400' : '#eee'}`, position: 'relative', boxShadow: i < 3 ? '0 10px 20px rgba(0,0,0,0.05)' : 'none'}}>
                   <div style={{width: 50, fontSize: 24, fontWeight: 900, color: i === 0 ? '#f39c12' : i === 1 ? '#7f8c8d' : i === 2 ? '#d35400' : '#bdc3c7'}} >
                     #{i + 1}
                   </div>
                   
                   <div style={{flex: 1}}>
                     <div style={{fontSize: 18, fontWeight: 800, color: '#2c3e50', display: 'flex', alignItems: 'center', gap: 8}}>
                        {u.full_name} {i === 0 && '👑'}
                     </div>
                     <div style={{fontSize: 13, color: '#7f8c8d'}}>{u.email}</div>
                   </div>

                   <div style={{textAlign: 'right'}}>
                     <div style={{display: 'flex', alignItems: 'center', gap: 5, fontSize: 22, fontWeight: 900, justifyItems: 'flex-end', color: '#e74c3c'}}>
                        🔥 {u.current_streak}
                     </div>
                     <div style={{fontSize: 11, color: '#95a5a6', marginTop: 4, fontWeight: 'bold'}}>
                        Kỷ lục dài nhất: {u.longest_streak}
                     </div>
                   </div>
                 </div>
               ))}
             </div>
           )}
         </div>
      </div>
    </div>
  );
}
