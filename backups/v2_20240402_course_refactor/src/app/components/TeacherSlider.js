'use client';
import { useState } from 'react';
import Link from 'next/link';

export default function TeacherSlider({ teachers = [] }) {
  const [index, setIndex] = useState(0);
  
  // Show 3 teachers at a time
  const visibleTeachers = teachers.slice(index, index + 3);
  
  const handlePrev = () => {
    if (index > 0) setIndex(index - 1);
  };
  
  const handleNext = () => {
    if (index + 3 < teachers.length) setIndex(index + 1);
  };

  if (teachers.length === 0) return null;

  return (
    <div style={{position: 'relative', width: '100%'}}>
      <div style={{display: 'flex', gap: 30, transition: 'all 0.5s ease', overflow: 'hidden', padding: '10px 0'}}>
        {visibleTeachers.map((t, i) => (
          <div key={t.id || i} className="glass-panel floating" style={{flex: '1 0 30%', minWidth: 320, padding: '40px', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', animation: 'fadeIn 0.5s ease'}}>
            {/* Decorative Glow */}
            <div style={{position: 'absolute', top: '-10%', left: '-5%', width: '30%', height: '120%', background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.15) 0%, transparent 100%)', zIndex: 0, pointerEvents: 'none'}} />
            
            <div style={{textAlign: 'center', zIndex: 1, marginBottom: 25}}>
              <div style={{position: 'relative', width: 140, height: 140, margin: '0 auto'}}>
                <div style={{width: '100%', height: '100%', borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f644, #8b5cf644)', padding: 6}}>
                  <div style={{width: '100%', height: '100%', borderRadius: '50%', background: '#fff', border: '3px solid #fff', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', overflow: 'hidden'}}>
                    <img 
                      src={t.avatar_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=300'} 
                      alt={t.name} 
                      style={{width: '100%', height: '100%', objectFit: 'cover'}} 
                    />
                  </div>
                </div>
              </div>
            </div>

            <div style={{flex: 1, zIndex: 1, textAlign: 'center', position: 'relative'}}>
              <h3 style={{fontSize: 24, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 5}}>{t.name}</h3>
              <p style={{color: 'var(--primary)', fontSize: 14, fontWeight: 800, marginBottom: 15, textTransform: 'uppercase', letterSpacing: 0.5}}>{t.role_title}</p>
              <p style={{color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6, marginBottom: 25, height: 75, overflow: 'hidden', textOutline: 'none'}}>
                {t.bio || 'Giảng viên ưu tú với nền tảng kiến thức sâu rộng...'}
              </p>
              
              <div style={{display: 'flex', justifyContent: 'center', gap: 15, marginBottom: 25}}>
                {t.fb_url && <a href={t.fb_url} style={{color: '#2563eb', fontWeight: 900, textDecoration: 'none', fontSize: 13}}>F</a>}
                {t.twitter_url && <a href={t.twitter_url} style={{color: '#1DA1F2', fontWeight: 900, textDecoration: 'none', fontSize: 13}}>TIN</a>}
                {t.linkedin_url && <a href={t.linkedin_url} style={{color: '#0A66C2', fontWeight: 900, textDecoration: 'none', fontSize: 13}}>IN</a>}
              </div>

              <Link href="/teachers" style={{display: 'inline-block', background: 'linear-gradient(135deg, #3b82f6, #6366f1)', color: '#fff', padding: '12px 30px', borderRadius: 12, textDecoration: 'none', fontWeight: 700, fontSize: 14, boxShadow: '0 8px 20px rgba(59, 130, 246, 0.3)'}}>
                Xem chi tiết
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Controls */}
      {teachers.length > 3 && (
        <>
          <button onClick={handlePrev} disabled={index === 0} style={{position: 'absolute', left: -25, top: '50%', transform: 'translateY(-50%)', background: '#fff', border: '1px solid #eee', width: 50, height: 50, borderRadius: '50%', cursor: 'pointer', boxShadow: '0 5px 15px rgba(0,0,0,0.1)', zIndex: 10, opacity: index === 0 ? 0.3 : 1}}>←</button>
          <button onClick={handleNext} disabled={index + 3 >= teachers.length} style={{position: 'absolute', right: -25, top: '50%', transform: 'translateY(-50%)', background: '#fff', border: '1px solid #eee', width: 50, height: 50, borderRadius: '50%', cursor: 'pointer', boxShadow: '0 5px 15px rgba(0,0,0,0.1)', zIndex: 10, opacity: index + 3 >= teachers.length ? 0.3 : 1}}>→</button>
        </>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
