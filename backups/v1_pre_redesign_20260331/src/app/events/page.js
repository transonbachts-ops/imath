import Link from 'next/link';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import UserMenu from '@/app/components/UserMenu';
import CalendarBoard from '@/app/dashboard/CalendarBoard';

export default async function EventsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token');
  let user = null;
  if (token) {
     try { user = jwt.verify(token.value, 'supersecret_smart_edu_key_999'); } catch(e){}
  }

  return (
    <div style={{fontFamily: 'system-ui, sans-serif', background: '#f5f7fa', minHeight: '100vh', paddingBottom: 80}}>
      {/* HEADER */}
      <nav style={{background: '#003380', color: '#fff', padding: '0 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', height: 75, position: 'sticky', top: 0, zIndex: 50}}>
        <div style={{display: 'flex', alignItems: 'center', gap: '50px', height: '100%'}}>
          <Link href="/dashboard" style={{fontSize: 26, fontWeight: 900, color: '#fff', textDecoration: 'none', letterSpacing: -1}}>
            iMath<span style={{color: '#cc0000'}}>.</span>
          </Link>
          <div style={{display: 'flex', gap: '30px', fontSize: 15, fontWeight: 'bold', height: '100%', alignItems: 'center'}}>
             <Link href="/dashboard" style={{color: '#fff', textDecoration: 'none'}}>Trang chủ</Link>
             <Link href="/courses" style={{color: '#fff', textDecoration: 'none'}}>Khóa học</Link>
             <Link href="/events" style={{color: '#fff', textDecoration: 'none', borderBottom: '3px solid #fff', height: '100%', display: 'flex', alignItems: 'center', boxSizing: 'border-box'}}>Lịch Học ▾</Link>
             <Link href="/documents" style={{color: '#fff', textDecoration: 'none'}}>Tài liệu</Link>
          </div>
        </div>
        
        <div style={{display: 'flex', gap: '20px', alignItems: 'center'}}>
           {user ? <UserMenu user={user} /> : <Link href="/">Đăng nhập</Link>}
        </div>
      </nav>

      <div style={{maxWidth: 1100, margin: '40px auto', background: '#fff', padding: '40px', borderRadius: 12, boxShadow: '0 10px 30px rgba(0,0,0,0.05)'}}>
         <h1 style={{fontSize: 28, color: '#cc0000', marginBottom: 10, fontWeight: 'bold'}}>📅 Lịch Học & Lịch Trực Tiếp</h1>
         <p style={{color: '#666', marginBottom: 40}}>Theo dõi sát sao lịch lên lớp và nộp bài để không bỏ lỡ kiến thức quan trọng.</p>

         <CalendarBoard />
      </div>
    </div>
  );
}
