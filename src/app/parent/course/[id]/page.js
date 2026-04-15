import pool from '@/lib/db';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import Link from 'next/link';
import UserMenu from '@/app/components/UserMenu';
import CourseAccordion from '@/app/course/[id]/CourseAccordion';
import { redirect } from 'next/navigation';

export default async function ParentCoursePage({ params }) {
  const cookieStore = await cookies();
  const token = cookieStore.get('token');
  const { id } = await params;
  
  if (!token) redirect('/parent/login');

  let user = null;
  try {
    user = jwt.verify(token.value, 'supersecret_smart_edu_key_999');
    if (user.role !== 'parent') redirect('/dashboard');
  } catch(e) {
    redirect('/parent/login');
  }

  // Get course
  const [courses] = await pool.query('SELECT * FROM courses WHERE id=?', [id]);
  if (!courses.length) return <div style={{padding: 50, textAlign: 'center'}}>Khóa học không tồn tại.</div>;
  const course = courses[0];

  const [courseModules] = await pool.query('SELECT * FROM course_modules WHERE course_id=? ORDER BY order_index ASC', [course.id]);
  const [courseActivities] = await pool.query(`
    SELECT a.* FROM course_activities a 
    JOIN course_modules m ON a.module_id = m.id 
    WHERE m.course_id=? 
    ORDER BY a.order_index ASC
  `, [course.id]);

  // Get teacher info
  let teacher = null;
  if (course.teacher_id) {
    const [teachers] = await pool.query('SELECT * FROM teachers WHERE id=?', [course.teacher_id]);
    teacher = teachers[0] || null;
  }

  return (
    <div style={{fontFamily: 'Inter, system-ui, sans-serif', background: '#f8faff', minHeight: '100vh', paddingBottom: 80}}>

      {/* PARENT HEADER */}
      <nav style={{
        background: '#003380', color: '#fff', padding: '0 40px', height: 66,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        boxShadow: '0 4px 20px rgba(0,51,128,0.25)', position: 'sticky', top: 0, zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <span style={{ fontSize: 24, fontWeight: 900, letterSpacing: -1, color: '#fff' }}>
            iMath<span style={{ color: '#fff' }}>.</span>
          </span>
          <span style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 700, letterSpacing: 1 }}>
            PHỤ HUYNH
          </span>
        </div>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          <Link href="/parent/dashboard" style={{ color: '#fff', textDecoration: 'none', fontSize: 13, fontWeight: 600, opacity: 0.8 }}>← Về Dashboard</Link>
          <UserMenu user={user} />
        </div>
      </nav>

      {/* MAIN CONTAINER */}
      <div style={{maxWidth: 1000, margin: '0 auto', marginTop: 40, background: '#fff', padding: 60, borderRadius: 24, boxShadow: '0 10px 40px rgba(0,0,0,0.05)', border: '1px solid #eef2f7'}}>
         
         <div style={{display: 'flex', gap: 40, alignItems: 'flex-start', marginBottom: 40}}>
            <div style={{flex: '1'}}>
               <p style={{color: '#64748b', fontSize: 12, fontWeight: 800, textTransform: 'uppercase', marginBottom: 10, letterSpacing: 1}}>👁️ Chế độ chỉ xem nội dung</p>
               <h1 style={{fontSize: 32, color: '#003380', fontWeight: 950, lineHeight: 1.2, marginBottom: 20, letterSpacing: -0.5}}>{course.title}</h1>
               <p style={{color: '#475569', lineHeight: 1.6, fontSize: 15}}>{course.description}</p>
               {teacher && (
                 <div style={{marginTop: 25, display: 'flex', alignItems: 'center', gap: 15, background: '#f0f7ff', padding: '16px 20px', borderRadius: 16, border: '1px solid #e0efff'}}>
                   <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#ffeadb', color: '#e67e22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 900, overflow: 'hidden' }}>
                     {teacher.avatar_url ? (
                       <img src={teacher.avatar_url} style={{width:'100%', height:'100%', objectFit:'cover'}} alt="T" />
                     ) : (teacher.name ? teacher.name.split(' ').pop()[0] : 'T')}
                   </div>
                   <div>
                     <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', fontWeight: 700, letterSpacing: 1, marginBottom: 2 }}>
                       Bản Quyền Đào Tạo
                     </div>
                     <div style={{fontWeight: 800, color: '#003380', fontSize: 15}}>{teacher.name || 'Ban Chuyên Môn'}</div>
                     <div style={{fontSize: 12, color: '#0ea5e9', fontWeight: 700}}>{teacher.role_title}</div>
                   </div>
                 </div>
               )}
            </div>
            
            <div style={{width: 320, height: 200, borderRadius: 16, flexShrink: 0, overflow: 'hidden', border: '1px solid #eef2f7', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
               {course.image_url ? (
                  <div style={{width: '100%', height: '100%', backgroundImage: `url(${course.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center'}} />
               ) : (
                  <span style={{fontSize: 40}}>📚</span>
               )}
            </div>
         </div>

         <div style={{height: 1, background: '#eef2f7', marginBottom: 40}}></div>

         {/* ACCORDION KHÓA HỌC */}
         <div style={{marginBottom: 20}}>
            <h3 style={{fontSize: 18, fontWeight: 800, color: '#003380', marginBottom: 20}}>Chương trình học</h3>
            <CourseAccordion 
              initialModules={courseModules} 
              initialActivities={courseActivities} 
              isAdmin={false} 
              courseId={course.id}
              course={course}
              teacher={teacher}
              isParent={true}
            />
         </div>

      </div>
    </div>
  );
}
