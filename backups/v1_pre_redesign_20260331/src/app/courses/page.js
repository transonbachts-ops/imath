import pool from '@/lib/db';
import { cookies } from 'next/headers';
import Link from 'next/link';
import jwt from 'jsonwebtoken';
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
    <div style={{fontFamily: 'system-ui, sans-serif', background: '#f5f7fa', minHeight: '100vh', paddingBottom: 80}}>
      {/* HEADER */}
      <nav style={{background: '#003380', color: '#fff', padding: '0 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', height: 75, position: 'sticky', top: 0, zIndex: 50}}>
        <div style={{display: 'flex', alignItems: 'center', gap: '50px', height: '100%'}}>
          <Link href="/dashboard" style={{fontSize: 26, fontWeight: 900, color: '#fff', textDecoration: 'none', letterSpacing: -1}}>
            iMath<span style={{color: '#ff6b6b'}}>.</span>
          </Link>
          <div style={{display: 'flex', gap: '30px', fontSize: 15, fontWeight: 'bold', height: '100%', alignItems: 'center'}}>
             <Link href="/dashboard" style={{color: '#ccd9f0', textDecoration: 'none'}}>Trang chủ</Link>
             <Link href="/courses" style={{color: '#fff', textDecoration: 'none', borderBottom: '3px solid #fff', height: '100%', display: 'flex', alignItems: 'center', boxSizing: 'border-box'}}>Khóa học</Link>
             <Link href="/events" style={{color: '#ccd9f0', textDecoration: 'none'}}>Lịch Học</Link>
             <Link href="/documents" style={{color: '#ccd9f0', textDecoration: 'none'}}>Tài liệu</Link>
          </div>
        </div>
        <div style={{display: 'flex', gap: '20px', alignItems: 'center'}}>
           {user ? <UserMenu user={user} /> : <Link href="/login" style={{color: '#fff', textDecoration: 'none', border: '1px solid rgba(255,255,255,0.4)', padding: '8px 20px', borderRadius: 20}}>Đăng nhập</Link>}
        </div>
      </nav>

      <div style={{maxWidth: 1100, margin: '40px auto', padding: '0 20px'}}>
        <div style={{background: 'linear-gradient(135deg, #003380 0%, #0050c8 100%)', borderRadius: 16, padding: '40px 50px', color: '#fff', marginBottom: 40}}>
          <h1 style={{fontSize: 36, fontWeight: 900, margin: '0 0 10px 0', color: '#ffffff'}}>📚 Danh sách Khóa học</h1>
          <p style={{color: '#c5d8ff', fontSize: 16, margin: 0}}>Tất cả các khóa học hiện hành của iMath — Tìm khóa học phù hợp với bạn.</p>
        </div>

        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 30}}>
           {courses.map(course => (
             <div key={course.id} style={{background: '#fff', borderRadius: 12, overflow: 'hidden', border: '1px solid #eee', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', transition: 'transform 0.2s, box-shadow 0.2s'}}>
                <div style={{height: 200, backgroundImage: `url(${course.image_url || 'https://placehold.co/600x400/003380/fff?text=Course'})`, backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative'}}>
                   <span style={{position: 'absolute', top: 15, left: 15, background: '#cc0000', color: '#fff', padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 'bold'}}>Nổi bật</span>
                </div>
                <div style={{padding: 25}}>
                   <h3 style={{margin: '0 0 10px 0', fontSize: 20, color: '#003380', lineHeight: 1.4, fontWeight: 800}}>{course.title}</h3>
                   <p style={{color: '#666', fontSize: 14, lineHeight: 1.6, marginBottom: 20, minHeight: 60, overflow: 'hidden'}}>{course.description || 'Chưa có mô tả.'}</p>
                   <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f0f0f0', paddingTop: 15}}>
                      <Link href={`/course/${course.id}`} style={{background: '#003380', color: '#fff', padding: '10px 22px', textDecoration: 'none', borderRadius: 6, fontWeight: 'bold', fontSize: 14}}>Vào Lớp →</Link>
                      <span style={{fontWeight: 'bold', color: '#e74c3c', fontSize: 15}}>{(course.price == null || course.price === 0) ? '' : course.price.toLocaleString() + 'đ'}</span>
                   </div>
                </div>
             </div>
           ))}
        </div>
      </div>
    </div>
  );
}
