import pool from '@/lib/db';
import { cookies } from 'next/headers';
import Link from 'next/link';
import jwt from 'jsonwebtoken';
import ThemeToggle from '@/app/components/ThemeToggle';
import UserMenu from '@/app/components/UserMenu';

export default async function CoursesPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token');
  let user = null;
  if (token) {
     try { user = jwt.verify(token.value, 'supersecret_smart_edu_key_999'); } catch(e){}
  }

  const [courses] = await pool.query('SELECT * FROM courses');

  return (
    <div style={{fontFamily: 'system-ui, sans-serif', background: 'transparent', minHeight: '100vh', paddingBottom: 80}}>
      {/* HEADER */}
      <nav className="glass-panel" style={{color: 'var(--text-primary)', padding: '0 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 75, position: 'sticky', top: 0, zIndex: 100, borderBottom: '1px solid var(--border-muted)', borderRadius: '0 0 24px 24px', margin: '0 10px'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: '50px', height: '100%'}}>
          <Link href="/dashboard" style={{fontSize: 26, fontWeight: 950, color: 'var(--primary)', textDecoration: 'none', letterSpacing: -1.5}}>
            H2bmath<span style={{color: 'var(--secondary)'}}>.</span>
          </Link>
          <div style={{display: 'flex', gap: '30px', fontSize: 14, fontWeight: 700, height: '100%', alignItems: 'center'}}>
             <Link href="/dashboard" style={{color: 'var(--text-secondary)', textDecoration: 'none'}}>Trang chủ</Link>
             <Link href="/courses" style={{color: 'var(--primary)', textDecoration: 'none', borderBottom: '3px solid var(--secondary)', height: '100%', display: 'flex', alignItems: 'center'}}>Khóa học</Link>
             <Link href="/events" style={{color: 'var(--text-secondary)', textDecoration: 'none'}}>Lịch Học</Link>
             <Link href="/documents" style={{color: 'var(--text-secondary)', textDecoration: 'none'}}>Tài liệu</Link>
          </div>
        </div>
        <div style={{display: 'flex', gap: '15px', alignItems: 'center'}}>
           <ThemeToggle />
           {user ? <UserMenu user={user} /> : <Link href="/login" style={{color: 'var(--primary)', textDecoration: 'none', border: '1px solid var(--glass-border)', padding: '8px 20px', borderRadius: 20, fontWeight: 700}}>Đăng nhập</Link>}
        </div>
      </nav>

      <div style={{maxWidth: 1100, margin: '40px auto', padding: '0 20px'}}>
        <div style={{background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.9) 0%, rgba(37, 99, 235, 0.8) 100%)', borderRadius: 16, padding: '40px 50px', color: '#fff', marginBottom: 40, boxShadow: '0 15px 35px rgba(79, 70, 229, 0.2)', backdropFilter: 'blur(10px)'}}>
          <h1 style={{fontSize: 36, fontWeight: 950, margin: '0 0 10px 0', color: '#ffffff', letterSpacing: -1}}>📚 Danh sách Khóa học</h1>
          <p style={{color: '#e8f0ff', fontSize: 16, margin: 0, opacity: 0.9}}>Tất cả các khóa học hiện hành của H2bmath — Tìm khóa học phù hợp với bạn.</p>
        </div>

        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 30}}>
           {courses.map(course => (
             <div key={course.id} className="glass-panel floating" style={{overflow: 'hidden', padding: 0}}>
                <div style={{height: 200, backgroundImage: `url(${course.image_url || 'https://placehold.co/600x400/003380/fff?text=Course'})`, backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative'}}>
                   <span style={{position: 'absolute', top: 15, left: 15, background: '#ef4444', color: '#fff', padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 'bold'}}>Nổi bật</span>
                </div>
                <div style={{padding: 25}}>
                   <h3 style={{margin: '0 0 10px 0', fontSize: 20, color: 'var(--text-primary)', lineHeight: 1.4, fontWeight: 900}}>{course.title}</h3>
                   <p style={{color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6, marginBottom: 20, minHeight: 60, overflow: 'hidden'}}>{course.description || 'Chưa có mô tả.'}</p>
                   <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-muted)', paddingTop: 15}}>
                      <Link href={`/course/${course.id}`} className="btn btn-primary" style={{padding: '10px 22px', borderRadius: 10, fontSize: 13}}>Vào Lớp →</Link>
                      <span style={{fontWeight: 950, color: 'var(--primary)', fontSize: 16}}>{(course.price == null || course.price === 0) ? '' : course.price.toLocaleString() + 'đ'}</span>
                    </div>
                </div>
             </div>
           ))}
        </div>
      </div>
    </div>
  );
}
