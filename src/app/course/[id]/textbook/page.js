import pool from '@/lib/db';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default async function TextbookViewerPage({ params }) {
  const { id: courseId } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get('token');

  if (!token) redirect('/');
  let user = null;
  try {
    user = jwt.verify(token.value, 'supersecret_smart_edu_key_999');
  } catch(e) {
    redirect('/');
  }

  // Lấy dữ liệu khóa học trực tiếp từ DB
  const [courses] = await pool.query('SELECT * FROM courses WHERE id=?', [courseId]);
  const course = courses[0];

  if (!course || !course.textbook_url) {
    return (
      <div style={{padding: 100, textAlign: 'center', background: '#fff', height: '100vh', fontFamily: 'Inter, sans-serif'}}>
        <h2 style={{color: '#ef4444', fontWeight: 900}}>Không tìm thấy tài liệu!</h2>
        <p style={{color: '#64748b', marginBottom: 30}}>Khóa học này chưa được cập nhật sách giáo khoa online.</p>
        <Link href={`/course/${courseId}`} style={{background: '#003380', color: '#fff', padding: '12px 30px', borderRadius: 8, textDecoration: 'none', fontWeight: 'bold'}}> Quay lại khóa học</Link>
      </div>
    );
  }

  const getPdfViewerUrl = (url) => {
    if (!url) return '';
    // Use an absolute URL if it is local for Google Docs viewer
    // Note: In server components, window is not available. 
    // We should ideally have the base URL from env, but we can assume relative path works if the viewer handles it or just use the target original link.
    // However, Google Docs needs an absolute public URL.
    // Given the environment, I'll pass the URL as is or assume the standard IP.
    const baseUrl = 'http://26.170.136.218:3000'; // Hardcoded for this environment as per previous requirement
    const fullUrl = url.startsWith('/') ? (baseUrl + url) : url;
    return `https://docs.google.com/viewer?url=${encodeURIComponent(fullUrl)}&embedded=true`;
  };

  return (
    <div style={{fontFamily: 'Inter, system-ui, sans-serif', background: '#1a1a1b', height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden'}}>
      
      {/* PROFESSIONAL HEADER */}
      <div style={{background: '#002661', color: '#fff', padding: '0 25px', height: '65px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.3)', zIndex: 100}}>
         <div style={{display: 'flex', alignItems: 'center', gap: 20}}>
             <Link href={`/course/${courseId}`} style={{color: '#fff', textDecoration: 'none', background: 'rgba(255,255,255,0.1)', padding: '6px 15px', borderRadius: 6, fontSize: 13, fontWeight: 'bold', border: '1px solid rgba(255,255,255,0.2)'}}>← Thoát</Link>
             <div style={{height: '24px', width: '1px', background: 'rgba(255,255,255,0.2)'}}></div>
             <h1 style={{fontSize: 16, margin: 0, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '60vw'}}>
                {course.title}
             </h1>
         </div>
         <div style={{display: 'flex', alignItems: 'center', gap: 15}}>
            <a href={course.textbook_url} target="_blank" rel="noreferrer" style={{color: '#fff', textDecoration: 'none', fontSize: 12, fontWeight: 'bold', opacity: 0.8}}>📥 Tải về</a>
            <div style={{background: '#cc0000', color: '#fff', padding: '4px 12px', borderRadius: 4, fontSize: 11, fontWeight: 'bold'}}>SGK ONLINE</div>
         </div>
      </div>

      {/* FULLSCREEN PDF VIEWER */}
      <div style={{flex: 1, position: 'relative', background: '#333'}}>
        <iframe 
          src={getPdfViewerUrl(course.textbook_url)} 
          style={{width: '100%', height: '100%', border: 'none'}} 
          title="Sách giáo khoa"
        />
        
        <div style={{position: 'absolute', bottom: 20, right: 20, zIndex: 50}}>
           <a 
             href={course.textbook_url} 
             target="_blank" 
             rel="noreferrer" 
             style={{background: 'rgba(0,0,0,0.6)', color: '#fff', padding: '10px 20px', borderRadius: 30, fontSize: 12, textDecoration: 'none', backdropFilter: 'blur(5px)', border: '1px solid rgba(255,255,255,0.2)'}}
           >
              Mở trong tab mới nếu lỗi ↗
           </a>
        </div>
      </div>

    </div>
  );
}
