'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import ThemeToggle from '@/app/components/ThemeToggle';
import UserMenu from '@/app/components/UserMenu';
import CalendarBoard from '@/app/dashboard/CalendarBoard';

export default function EventsPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/profile')
      .then(r => r.json())
      .then(data => {
        if(data.user) setUser(data.user);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{fontFamily: 'system-ui, sans-serif', background: 'transparent', minHeight: '100vh', paddingBottom: 80}}>
      {/* HEADER */}
      <nav className="glass-panel" style={{color: 'var(--text-primary)', padding: '0 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 75, position: 'sticky', top: 0, zIndex: 100, borderBottom: '1px solid var(--border-muted)', borderRadius: '0 0 24px 24px', margin: '0 10px'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: '50px', height: '100%'}}>
          <Link href="/dashboard" style={{fontSize: 26, fontWeight: 950, color: 'var(--primary)', textDecoration: 'none', letterSpacing: -1.5}}>
            iMath<span style={{color: 'var(--secondary)'}}>.</span>
          </Link>
          <div style={{display: 'flex', gap: '30px', fontSize: 14, fontWeight: 700, height: '100%', alignItems: 'center'}}>
             <Link href="/dashboard" style={{color: 'var(--text-secondary)', textDecoration: 'none'}}>Trang chủ</Link>
             <Link href="/courses" style={{color: 'var(--text-secondary)', textDecoration: 'none'}}>Khóa học</Link>
             <Link href="/events" style={{color: 'var(--primary)', textDecoration: 'none', borderBottom: '3px solid var(--secondary)', height: '100%', display: 'flex', alignItems: 'center'}}>Lịch Học</Link>
             <Link href="/documents" style={{color: 'var(--text-secondary)', textDecoration: 'none'}}>Tài liệu</Link>
          </div>
        </div>
        
        <div style={{display: 'flex', gap: '15px', alignItems: 'center'}}>
           <ThemeToggle />
           {!loading && user && <UserMenu user={user} />}
        </div>
      </nav>

      <div style={{maxWidth: 1300, margin: '40px auto', padding: '0 20px'}}>
         <div className="glass-panel" style={{padding: '50px', borderRadius: 24, background: 'var(--card-bg)', boxShadow: 'var(--glass-shadow)', border: '1px solid var(--glass-border)', backdropFilter: 'blur(30px)'}}>
            <div style={{marginBottom: 40}}>
               <h1 style={{fontSize: 42, color: 'var(--primary)', marginBottom: 15, fontWeight: 950, letterSpacing: -2}}>📅 Lịch Học & Trực Tiếp</h1>
               <p style={{color: 'var(--text-secondary)', fontSize: 18, fontWeight: 500, maxWidth: 800}}>Quản lý thời gian học tập hiệu quả. Theo dõi các buổi học Zoom trực tiếp và thời hạn nộp bài tập ngay trên hệ thống iMath.</p>
            </div>

            <CalendarBoard variant="full" />
         </div>
      </div>
    </div>
  );
}
