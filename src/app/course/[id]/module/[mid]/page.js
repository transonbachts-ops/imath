import pool from '@/lib/db';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import ForumClient from '@/app/components/ForumClient';

const JWT_SECRET = 'supersecret_smart_edu_key_999';

export default async function ModulePage({ params }) {
  const { id, mid } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get('token');
  if (!token) redirect('/login');

  let user = null;
  try { user = jwt.verify(token.value, JWT_SECRET); } catch(e) { redirect('/login'); }

  // Fetch module details
  const [modules] = await pool.query('SELECT * FROM course_modules WHERE id = ?', [mid]);
  if (!modules.length) return <div>Không tìm thấy chương học.</div>;
  const module = modules[0];

  // Fetch activities in this module for quick list
  const [activities] = await pool.query('SELECT * FROM course_activities WHERE module_id = ? ORDER BY order_index ASC', [mid]);

  const getActivityIcon = (type) => {
    if (type === 'quiz') return '📝';
    if (type === 'assignment') return '📂';
    if (type === 'forum') return '💬';
    if (type === 'resource') return '📕';
    if (type === 'scorm') return '📦';
    return '📄';
  };

  return (
    <div style={{ padding: '40px', maxWidth: '1100px', margin: '0 auto', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ marginBottom: '30px' }}>
        <Link href={`/course/${id}/learn`} style={{ color: '#003380', textDecoration: 'none', fontWeight: 'bold' }}>← Quay lại bài học</Link>
      </div>

      {/* Header section representing the "Chapter Web" */}
      <div style={{ background: 'linear-gradient(135deg, #002255 0%, #0044aa 100%)', color: '#ffffff', borderRadius: '16px', padding: '40px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', marginBottom: '30px', position: 'relative', overflow: 'hidden' }}>
        {/* Subtle decorative circle */}
        <div style={{position: 'absolute', top: '-50px', right: '-50px', width: '200px', height: '200px', background: 'rgba(255,255,255,0.05)', borderRadius: '50%'}}></div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1 }}>
          <div>
            <h4 style={{ margin: '0 0 10px 0', opacity: 0.9, fontSize: '14px', textTransform: 'uppercase', letterSpacing: '2px', color: '#ffffff', fontWeight: 600 }}>CHƯƠNG HỌC</h4>
            <h1 style={{ fontSize: '36px', margin: 0, fontWeight: 900, color: '#ffffff', textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>{module.title}</h1>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)', padding: '20px 30px', borderRadius: '16px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.2)' }}>
            <div style={{ fontSize: '28px', fontWeight: 900, color: '#ffffff' }}>{activities.length}</div>
            <div style={{ fontSize: '12px', opacity: 0.9, color: '#ffffff', fontWeight: 600, textTransform: 'uppercase' }}>Hoạt động</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 350px', gap: '30px' }}>
        {/* Left Column: Placeholder for content or other info if needed, or just spacers */}
        <div style={{ background: '#fff', borderRadius: '16px', padding: '30px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: '1px solid #eee', height: 'fit-content' }}>
            <h2 style={{ fontSize: '20px', marginBottom: '20px', color: '#003380' }}>📖 Giới thiệu chương học</h2>
            <div style={{ color: '#555', lineHeight: '1.6' }}>
                Chào mừng bạn đến với chương <b>{module.title}</b>. Hãy xem danh sách các tài nguyên bên phải để bắt đầu học tập. 
                Nếu giáo viên đã tạo mục <b>Hỏi đáp</b>, bạn có thể nhấn vào đó để trao đổi với mọi người.
            </div>
        </div>

        {/* Right Column: Quick Links */}
        <div>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '25px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: '1px solid #eee', position: 'sticky', top: '20px' }}>
            <h3 style={{ fontSize: '16px', marginBottom: '20px', color: '#333', fontWeight: 800 }}>Nội dung bài học</h3>
            <style dangerouslySetInnerHTML={{ __html: `
              .act-link { background: #f8f9fa; border: 1px solid transparent; transition: all 0.2s ease; }
              .act-link:hover { background: #fff !important; border-color: #003380 !important; color: #003380 !important; }
            `}} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {activities.map(act => (
                <Link 
                  key={act.id}
                  className="act-link"
                  href={
                    act.type === 'quiz' ? `/course/${id}/quiz/${act.id}` : 
                    act.type === 'scorm' ? `/course/${id}/scorm/${act.id}` : 
                    act.type === 'assignment' ? `/course/${id}/assignment/${act.id}` :
                    act.type === 'forum' ? `/course/${id}/forum/${act.id}` :
                    `/course/${id}/resource/${act.id}`
                  }
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '12px', 
                    padding: '12px', 
                    borderRadius: '10px', 
                    textDecoration: 'none', 
                    color: '#444',
                    fontSize: '13px'
                  }}
                >
                  <span style={{ fontSize: '16px' }}>{getActivityIcon(act.type)}</span>
                  <span style={{ fontWeight: 600 }}>{act.title}</span>
                </Link>
              ))}
              {activities.length === 0 && (
                <div style={{ color: '#aaa', fontSize: '12px', textAlign: 'center', padding: '20px' }}>Chưa có nội dung.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
