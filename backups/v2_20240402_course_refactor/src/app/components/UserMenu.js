'use client';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

export default function UserMenu({ user }) {
  const [open, setOpen] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [fbMsg, setFbMsg] = useState('');
  const [fbRating, setFbRating] = useState(5);
  const [fbSent, setFbSent] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
        setShowFeedback(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/';
  };

  const handleFeedback = async (e) => {
    e.preventDefault();
    if (!fbMsg.trim()) return;
    const res = await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: fbMsg, rating: fbRating })
    });
    if (res.ok) {
      setFbSent(true);
      setFbMsg('');
      setFbRating(5);
      setTimeout(() => { setFbSent(false); setShowFeedback(false); }, 2500);
    }
  };

  return (
    <div style={{position: 'relative'}} ref={menuRef}>
      <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
         <div
            onClick={() => setOpen(!open)}
            style={{display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '5px 16px', borderRadius: 30, background: 'rgba(255,255,255,0.3)', border: '1px solid rgba(255,255,255,0.4)', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', transition: 'all 0.3s ease'}}
            className="nav-element-prominent"
         >
           <div style={{width: 32, height: 32, borderRadius: '50%', background: 'var(--secondary)', color: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14}}>
             {(user.full_name || user.name || 'U')[0].toUpperCase()}
           </div>
           <div style={{display: 'flex', flexDirection: 'column', lineHeight: 1.2}}>
              <span style={{color: 'inherit', fontWeight: 700, fontSize: 13}}>{user.full_name || user.name}</span>
              <span style={{color: 'inherit', opacity: 0.7, fontSize: 11}}>{user.role}</span>
           </div>
           <span style={{color: 'inherit', opacity: 0.7, fontSize: 10}}>▼</span>
         </div>
      </div>

      {open && (
        <div className="glass-panel" style={{
          position: 'absolute', top: 52, right: 0, width: 260, 
          overflow: 'hidden', zIndex: 999, border: '1px solid rgba(255,255,255,0.4)'
        }}>
           {/* Header */}
           <div style={{padding: '18px 20px', background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.95), rgba(124, 58, 237, 0.9))'}}>
              <div style={{width: 45, height: 45, borderRadius: '50%', background: 'var(--secondary)', color: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 18, marginBottom: 8, boxShadow: '0 6px 15px rgba(0,0,0,0.1)'}}>
                {(user.full_name || user.name || 'U')[0].toUpperCase()}
              </div>
              <div style={{fontSize: 15, fontWeight: 800, color: '#fff'}}>{user.full_name || user.name}</div>
              <div style={{fontSize: 12, color: '#e8f0ff', opacity: 0.8}}>{user.email}</div>
           </div>
           
           <div style={{padding: '8px 0'}}>
              <Link href="/my-courses" onClick={() => setOpen(false)} style={{display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', color: 'var(--text-primary)', textDecoration: 'none', fontSize: 14}}>
                 <span style={{fontSize: 18}}>📚</span> Khóa học của tôi
              </Link>
              <Link href="/profile" onClick={() => setOpen(false)} style={{display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', color: 'var(--text-primary)', textDecoration: 'none', fontSize: 14}}>
                 <span style={{fontSize: 18}}>👤</span> Hồ sơ cá nhân
              </Link>
              {(user.role === 'admin' || user.role === 'teacher') && (
                 <Link href="/admin" onClick={() => setOpen(false)} style={{display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', color: 'var(--primary)', textDecoration: 'none', fontSize: 14, fontWeight: 600}}>
                   <span style={{fontSize: 18}}>⚙️</span> Trang Quản Trị
                 </Link>
              )}
              {user.role === 'student' && (
                 <button onClick={() => { setShowFeedback(!showFeedback); }} style={{display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', color: 'var(--text-primary)', background: 'none', border: 'none', fontSize: 14, cursor: 'pointer', width: '100%', textAlign: 'left'}}>
                   <span style={{fontSize: 18}}>💬</span> Gửi phản hồi
                 </button>
              )}
           </div>

           {/* Feedback Box */}
           {showFeedback && (
             <div style={{padding: '0 15px 15px', borderTop: '1px solid var(--border-muted)'}}>
               {fbSent ? (
                 <div style={{textAlign: 'center', padding: '15px', color: '#2ecc71', fontWeight: 600}}>✅ Cảm ơn bạn đã phản hồi!</div>
               ) : (
                 <form onSubmit={handleFeedback} style={{marginTop: 15}}>
                    <div style={{display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 15}}>
                       {[1, 2, 3, 4, 5].map((star) => (
                         <span 
                           key={star} 
                           onClick={() => setFbRating(star)}
                           style={{fontSize: 24, cursor: 'pointer', color: star <= fbRating ? '#f1c40f' : '#ddd', transition: '0.2s'}}
                         >
                           ★
                         </span>
                       ))}
                    </div>
                    <textarea
                      value={fbMsg}
                      onChange={e => setFbMsg(e.target.value)}
                      placeholder="Nhập ý kiến phản hồi của bạn..."
                      style={{width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #ddd', minHeight: 90, fontSize: 13, resize: 'none', boxSizing: 'border-box', outline: 'none'}}
                    />
                    <button type="submit" style={{width: '100%', padding: '10px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13, marginTop: 8}}>
                      Gửi phản hồi
                    </button>
                 </form>
               )}
             </div>
           )}
           
           <div style={{borderTop: '1px solid var(--border-muted)'}}>
              <button onClick={handleLogout} style={{display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', background: 'transparent', border: 'none', color: '#e74c3c', fontSize: 14, cursor: 'pointer', width: '100%'}}>
                 <span style={{fontSize: 18}}>🚪</span> Đăng xuất
              </button>
           </div>
        </div>
      )}
    </div>
  );
}
