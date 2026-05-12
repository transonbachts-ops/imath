import pool from '@/lib/db';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import ThemeToggle from '@/app/components/ThemeToggle';
import UserMenu from '@/app/components/UserMenu';

export default async function MyCertificatesPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token');
  if (!token) redirect('/');

  let user = null;
  try {
    user = jwt.verify(token.value, 'supersecret_smart_edu_key_999');
  } catch(e) {
    redirect('/');
  }

  const [courses] = await pool.query(`
    SELECT c.* FROM courses c 
    JOIN enrollments e ON c.id = e.course_id 
    WHERE e.user_id = ? AND e.status = 'approved'
    ORDER BY e.created_at DESC
  `, [user.userId]);

  const courseIds = courses.map(c => c.id);
  const eligibleCourses = [];

  if (courseIds.length > 0) {
    const [stats] = await pool.query(`
      SELECT 
        cm.course_id, 
        COUNT(DISTINCT ca.id) as total_acts,
        COUNT(DISTINCT CASE WHEN sp.student_id IS NOT NULL THEN ca.id END) as done_acts
      FROM course_modules cm
      LEFT JOIN course_activities ca ON cm.id = ca.module_id
      LEFT JOIN student_progress sp ON ca.id = sp.activity_id AND sp.student_id = ?
      WHERE cm.course_id IN (?)
      GROUP BY cm.course_id
    `, [user.userId, courseIds]);

    for (const c of courses) {
      const courseStat = stats.find(s => s.course_id === c.id) || { total_acts: 0, done_acts: 0 };
      const total = courseStat.total_acts || 0;
      const done = courseStat.done_acts || 0;
      // You get a certificate if there's at least one activity and you finished them all
      if (Number(total) > 0 && Number(done) === Number(total)) {
        eligibleCourses.push(c);
      }
    }
  }

  return (
    <div style={{fontFamily: 'system-ui, sans-serif', background: 'transparent', minHeight: '100vh', paddingBottom: 80}}>
      {/* HEADER */}
      <nav className="glass-panel" style={{color: 'var(--text-primary)', padding: '0 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 75, position: 'sticky', top: 0, zIndex: 100, borderBottom: '1px solid rgba(255,255,255,0.4)', borderRadius: '0 0 24px 24px', margin: '0 10px'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: '50px', height: '100%'}}>
          <Link href="/dashboard" style={{fontSize: 26, fontWeight: 950, color: 'var(--primary)', textDecoration: 'none', letterSpacing: -1.5}}>
            H2bmath<span style={{color: 'var(--secondary)'}}>.</span>
          </Link>
          <div style={{display: 'flex', gap: '30px', fontSize: 14, fontWeight: 700, height: '100%', alignItems: 'center'}}>
             <Link href="/dashboard" style={{color: 'var(--text-secondary)', textDecoration: 'none'}}>Trang chủ</Link>
             <Link href="/dashboard#courses-section" style={{color: 'var(--text-secondary)', textDecoration: 'none'}}>Khóa học</Link>
             <Link href="/dashboard#calendar-section" style={{color: 'var(--text-secondary)', textDecoration: 'none'}}>Lịch Học</Link>
             <Link href="/documents" style={{color: 'var(--text-secondary)', textDecoration: 'none'}}>Tài liệu</Link>
          </div>
        </div>

        <div style={{display: 'flex', gap: '15px', alignItems: 'center'}}>
           <ThemeToggle />
           <UserMenu user={user} />
        </div>
      </nav>

      {/* CONTENT GRID */}
      <div style={{maxWidth: 1200, margin: '40px auto 0', display: 'flex', gap: 40}}>
         {/* SIDEBAR */}
         <div className="glass-panel" style={{width: 280, flexShrink: 0, padding: '30px 20px', height: 'fit-content', borderRadius: 24}}>
            <ul style={{listStyle: 'none', padding: 0, margin: 0}}>
               <li style={{marginBottom: 12}}><Link href="/profile" style={{display: 'flex', alignItems: 'center', gap: 10, padding: '15px 20px', color: 'var(--text-secondary)', textDecoration: 'none', borderRadius: 16, fontSize: 15, fontWeight: 600, transition: '0.3s'}}>👤 Hồ sơ cá nhân</Link></li>
               <li style={{marginBottom: 12}}><Link href="/my-courses" style={{display: 'flex', alignItems: 'center', gap: 10, padding: '15px 20px', color: 'var(--text-secondary)', textDecoration: 'none', borderRadius: 16, fontSize: 15, fontWeight: 600, transition: '0.3s'}}>📚 Khóa học của tôi</Link></li>
               <li style={{marginBottom: 12}}><Link href="/my-certificates" style={{display: 'flex', alignItems: 'center', gap: 10, padding: '15px 20px', color: 'var(--primary)', background: 'var(--primary-light)', textDecoration: 'none', borderRadius: 16, fontSize: 15, fontWeight: 800, transition: '0.3s'}}>🎓 Chứng chỉ của tôi</Link></li>
            </ul>
         </div>

         {/* MAIN AREA */}
         <div style={{flex: 1}}>
           {eligibleCourses.length === 0 ? (
             <div style={{textAlign: 'center', padding: '100px 0', background: 'var(--card-bg)', borderRadius: 12, border: '1px solid var(--border-muted)'}}>
               <p style={{fontSize: 18, color: 'var(--text-secondary)', marginBottom: 20}}>Bạn chưa có chứng chỉ nào.</p>
               <Link href="/dashboard#courses-section" style={{background: '#e74c3c', color: '#fff', padding: '12px 30px', borderRadius: 30, textDecoration: 'none', fontWeight: 'bold'}}>Khám phá Khóa học Của H2bmath</Link>
             </div>
           ) : (
             <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 30}}>
                 {eligibleCourses.map(course => {
                    return (
                       <div key={course.id} style={{background: 'var(--card-bg)', borderRadius: 12, overflow: 'hidden', border: '1px solid #e0e0e0', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column'}}>
                          <div style={{position: 'relative', height: 160, backgroundImage: `url(${course.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center'}}>

                          </div>
                          <div style={{padding: '20px', flexGrow: 1, display: 'flex', flexDirection: 'column'}}>
                             <h3 style={{fontSize: 16, color: 'var(--text-primary)', fontWeight: 700, marginBottom: 20, lineHeight: 1.4, flexGrow: 1}}>{course.title}</h3>
                             
                             <p style={{color: 'var(--text-secondary)', fontSize: 13, marginBottom: 20}}>Trạng thái: <strong style={{color: '#2ecc71'}}>Đã hoàn thành 100%</strong></p>
                             
                             {/* Link to certificate */}
                             <Link href={`/course/${course.id}/certificate`} style={{background: '#003380', color: '#fff', textAlign: 'center', padding: '10px 0', borderRadius: 6, fontWeight: 'bold', fontSize: 13, textDecoration: 'none', display: 'block', transition: '0.2s'}}>
                                XEM VÀ IN CHỨNG CHỈ
                             </Link>
                          </div>
                       </div>
                    );
                 })}
             </div>
           )}
         </div>
      </div>
    </div>
  )
}
