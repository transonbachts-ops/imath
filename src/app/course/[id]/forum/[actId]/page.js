import pool from '@/lib/db';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import ForumClient from '@/app/components/ForumClient';

const JWT_SECRET = 'supersecret_smart_edu_key_999';

export default async function ForumPage({ params }) {
  const { id, actId } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get('token');
  if (!token) redirect('/login');

  let user = null;
  try { user = jwt.verify(token.value, JWT_SECRET); } catch(e) { redirect('/login'); }

  // Fetch activity details to get the title (teacher-defined name)
  const [activities] = await pool.query('SELECT * FROM course_activities WHERE id = ?', [actId]);
  if (!activities.length) return <div style={{ padding: '50px', textAlign: 'center' }}>Không tìm thấy tài nguyên thảo luận.</div>;
  const activity = activities[0];

  return (
    <div style={{ padding: '40px', maxWidth: '1000px', margin: '0 auto', fontFamily: 'Inter, system-ui, sans-serif', minHeight: '100vh', background: '#f8fafc' }}>
      <div style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link href={`/course/${id}/learn`} style={{ color: '#003380', textDecoration: 'none', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>←</span> Quay lại bài học
        </Link>
        <div style={{ background: '#003380', color: '#fff', padding: '6px 15px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>
          TÀI NGUYÊN HỎI ĐÁP
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: '20px', padding: '40px', boxShadow: '0 10px 40px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
        <header style={{ borderBottom: '2px solid #f1f5f9', paddingBottom: '30px', marginBottom: '40px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '10px' }}>
                <span style={{ fontSize: '32px' }}>💬</span>
                <h1 style={{ fontSize: '28px', margin: 0, fontWeight: 900, color: '#0f172a' }}>{activity.title}</h1>
            </div>
            <p style={{ color: '#64748b', fontSize: '15px', margin: 0 }}>
                Đây là không gian dành riêng cho nội dung: <b>{activity.title}</b>. Hãy cùng thảo luận và giải đáp các thắc mắc nhé!
            </p>
        </header>

        <ForumClient 
          id={id} 
          actId={actId} 
          userRole={user.role} 
          userName={user.full_name || user.fullName || user.username || 'Bạn'} 
        />
      </div>
    </div>
  );
}
