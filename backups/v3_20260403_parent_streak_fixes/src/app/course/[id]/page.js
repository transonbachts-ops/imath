import pool from '@/lib/db';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import Link from 'next/link';
import UserMenu from '@/app/components/UserMenu';
import EnrollButton from './EnrollButton';
import CourseAccordion from './CourseAccordion';
import { redirect } from 'next/navigation';

export default async function CoursePage({ params }) {
  const cookieStore = await cookies();
  const token = cookieStore.get('token');
  const { id } = await params;
  
  if (!token) redirect('/');

  let user = null;
  try {
    user = jwt.verify(token.value, 'supersecret_smart_edu_key_999');
  } catch(e) {
    redirect('/');
  }

  // Lấy khóa học
  const [courses] = await pool.query('SELECT * FROM courses WHERE id=?', [id]);
  if (!courses.length) return <div style={{padding: 50, textAlign: 'center'}}>Lớp học không tồn tại.</div>;
  const course = courses[0];

  // Khởi tạo DDL bảng ghi danh chạy ngầm
  await pool.query(`
    CREATE TABLE IF NOT EXISTS enrollments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      course_id INT NOT NULL,
      status VARCHAR(20) DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_enrollment (user_id, course_id)
    )
  `);

  let enrollmentStatus = null;
  try {
    const [enrolls] = await pool.query('SELECT status FROM enrollments WHERE user_id=? AND course_id=?', [user.userId, course.id]);
    if (enrolls.length > 0) enrollmentStatus = enrolls[0].status;
  } catch(e) {}

  const [courseModules] = await pool.query('SELECT * FROM course_modules WHERE course_id=? ORDER BY order_index ASC', [course.id]);
  const [courseActivities] = await pool.query(`
    SELECT a.* FROM course_activities a 
    JOIN course_modules m ON a.module_id = m.id 
    WHERE m.course_id=? 
    ORDER BY a.order_index ASC
  `, [course.id]);

  // Fetch all courses for the "Khóa học liên quan" carousel mock
  const [allCourses] = await pool.query('SELECT * FROM courses');
  
  // Get teacher info
  let teacher = null;
  if (course.teacher_id) {
    const [teachers] = await pool.query('SELECT * FROM teachers WHERE id=?', [course.teacher_id]);
    teacher = teachers[0] || null;
  }

  return (
    <div style={{fontFamily: 'system-ui, sans-serif', background: '#f5f7fa', minHeight: '100vh', paddingBottom: 80}}>

      {/* HEADER TƯƠNG TỰ DASHBOARD */}
      <nav style={{background: '#003380', color: '#fff', padding: '0 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', height: 75, position: 'sticky', top: 0, zIndex: 50}}>
        <div style={{display: 'flex', alignItems: 'center', gap: '50px', height: '100%'}}>
          <Link href="/dashboard" style={{fontSize: 26, fontWeight: 900, color: '#fff', textDecoration: 'none', letterSpacing: -1}}>
            iMath<span style={{color: '#cc0000'}}>.</span>
          </Link>
          <div style={{display: 'flex', gap: '30px', fontSize: 15, fontWeight: 'bold', height: '100%', alignItems: 'center'}}>
             <Link href="/dashboard" style={{color: '#fff', textDecoration: 'none'}}>Trang chủ</Link>
             <Link href="/courses" style={{color: '#fff', textDecoration: 'none', borderBottom: '3px solid #fff', height: '100%', display: 'flex', alignItems: 'center', boxSizing: 'border-box'}}>Khóa học</Link>
             <Link href="/events" style={{color: '#fff', textDecoration: 'none'}}>Lịch Học ▾</Link>
             <Link href="/documents" style={{color: '#fff', textDecoration: 'none'}}>Tài liệu</Link>
          </div>
        </div>
        
        <div style={{display: 'flex', gap: '20px', alignItems: 'center'}}>
           <form action="/dashboard" style={{background: '#fff', padding: '0 15px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: 10, width: 300, border: '1px solid #ddd', height: 42}}>
             <button type="submit" style={{background: 'none', border: 'none', cursor: 'pointer', color: '#666', fontSize: 13, padding: 0}}>🔍</button>
             <input type="text" name="q" placeholder="Tìm kiếm khóa học, bài viết..." style={{border: 'none', outline: 'none', background: 'transparent', width: '100%', fontSize: 14, color: '#333'}}/>
           </form>
           
           <UserMenu user={user} />
        </div>
      </nav>

      {/* MAIN CONTAINER */}
      <div style={{maxWidth: 1000, margin: '0 auto', marginTop: 40, background: '#fff', padding: 60, borderRadius: 8, boxShadow: '0 5px 25px rgba(0,0,0,0.03)'}}>
         
         <div style={{display: 'flex', gap: 40, alignItems: 'flex-start', marginBottom: 20}}>
            <div style={{flex: '1'}}>
               <p style={{color: '#666', fontSize: 13, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 10}}>Khóa học Do iMath Tổ Chức</p>
               <h1 style={{fontSize: 34, color: '#cc0000', fontWeight: 900, lineHeight: 1.2, marginBottom: 20}}>{course.title}</h1>
               <p style={{color: '#444', lineHeight: 1.7, fontSize: 16}}>{course.description}</p>
               {teacher && (
                 <div style={{marginTop: 20, display: 'flex', alignItems: 'center', gap: 12, background: '#f0f7ff', padding: '12px 16px', borderRadius: 8, border: '1px solid #c5e0ff'}}>
                   <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#ffeadb', color: '#e67e22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 900, overflow: 'hidden' }}>
                     {teacher.avatar_url ? (
                       <img src={teacher.avatar_url} style={{width:'100%', height:'100%', objectFit:'cover'}} alt="T" />
                     ) : (teacher.name ? teacher.name.split(' ').pop()[0] : 'T')}
                   </div>
                   <div>
                     <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', fontWeight: 700, letterSpacing: 1, marginBottom: 2 }}>
                       Bản Quyền Đào Tạo
                     </div>
                     <div style={{fontWeight: 700, color: '#003380', fontSize: 15}}>{teacher.name || 'Ban Chuyên Môn'}</div>
                     <div style={{fontSize: 12, color: '#cc0000', fontWeight: 600}}>{teacher.role_title}</div>
                   </div>
                 </div>
               )}
            </div>
            
            <div style={{width: 400, height: 225, backgroundImage: `url(${course.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center', borderRadius: 8, flexShrink: 0, boxShadow: '0 5px 15px rgba(0,0,0,0.1)'}}></div>
         </div>

          {/* Nút hành động */}
          <div style={{display: 'flex', gap: 15, marginBottom: 40, borderBottom: '1px solid #eee', paddingBottom: 40, flexWrap: 'wrap'}}>
             <EnrollButton courseId={course.id} enrollmentStatus={enrollmentStatus} />
             
             {course.textbook_url && enrollmentStatus === 'approved' && (
                <Link 
                  href={`/course/${course.id}?view_pdf=${encodeURIComponent(course.textbook_url)}`} 
                  style={{background: '#cc0000', color: '#fff', padding: '12px 25px', fontSize: 15, fontWeight: 'bold', textDecoration: 'none', borderRadius: 4}}
                >
                  📖 Đọc SGK Online
                </Link>
             )}

             {(user?.role === 'admin' || user?.role === 'teacher') && (course.lesson_plan_link || course.lesson_plan_url) && (
                <a 
                  href={course.lesson_plan_link || course.lesson_plan_url} 
                  target="_blank" 
                  rel="noreferrer" 
                  style={{background: '#003380', color: '#fff', padding: '12px 25px', fontSize: 15, fontWeight: 'bold', textDecoration: 'none', borderRadius: 4}}
                >
                  📄 Giáo Án (Chỉ GV)
                </a>
             )}
          </div>

         {/* ACCORDION KHÓA HỌC */}
         {enrollmentStatus === 'approved' || user?.role === 'admin' || user?.role === 'teacher' || user?.role === 'parent' ? (
           <CourseAccordion 
             initialModules={courseModules} 
             initialActivities={courseActivities} 
             isAdmin={user?.role === 'admin' || user?.role === 'teacher'} 
             courseId={course.id}
             course={course}
             teacher={teacher}
             isParent={user?.role === 'parent'}
           />
         ) : (
           <div style={{padding: 40, textAlign: 'center', background: '#ffebee', borderRadius: 8, color: '#c62828', border: '1px solid #ffcdd2'}}>
             <h3 style={{fontSize: 20, marginBottom: 10, fontWeight: 'bold'}}>🔒 Nội dung bị khóa</h3>
             <p style={{fontSize: 15}}>Bạn cần được Giáo viên phê duyệt ghi danh để truy cập bài giảng và tài liệu của khóa học này.</p>
           </div>
         )}

         {/* KHÓA HỌC LIÊN QUAN */}
         <div style={{marginTop: 60, borderTop: '2px solid #eee', paddingTop: 40}}>
            <h3 style={{fontSize: 18, color: '#333', marginBottom: 25, fontWeight: 'bold'}}>Khóa học liên quan</h3>
            
            <div style={{display: 'flex', gap: 20, overflowX: 'auto', paddingBottom: 20}}>
               {allCourses.map(c => (
                  <Link href={`/course/${c.id}`} key={c.id} style={{textDecoration: 'none', width: 220, flexShrink: 0, border: '1px solid #eee', borderRadius: 6, overflow: 'hidden'}}>
                     <div style={{height: 120, backgroundImage: `url(${c.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center'}}></div>
                     <div style={{padding: 15}}>
                        <p style={{color: '#cc0000', fontSize: 11, fontWeight: 'bold', marginBottom: 5}}>KHÓA HỌC IMATH</p>
                        <h4 style={{fontSize: 15, color: '#333', fontWeight: 700, marginBottom: 10, lineHeight: 1.3}}>{c.title}</h4>
                        <div style={{display: 'flex', gap: 5}}>
                           <span style={{border: '1px solid #ddd', color: '#888', fontSize: 10, padding: '2px 6px', borderRadius: 3}}>Toán học</span>
                           <span style={{border: '1px solid #ddd', color: '#888', fontSize: 10, padding: '2px 6px', borderRadius: 3}}>Giáo dục</span>
                        </div>
                     </div>
                  </Link>
               ))}
               
               {/* MOCK EXTRA CARDS TO FILL CAROUSEL */}
               <div style={{width: 220, flexShrink: 0, border: '1px solid #eee', borderRadius: 6, overflow: 'hidden'}}>
                  <div style={{height: 120, backgroundImage: `url(https://placehold.co/400x200?text=iMath+Pro)`, backgroundSize: 'cover', backgroundPosition: 'center'}}></div>
                  <div style={{padding: 15}}>
                     <h4 style={{fontSize: 15, color: '#333', fontWeight: 700, marginBottom: 10, lineHeight: 1.3}}>Chuyên mục Ôn kiến thức</h4>
                     <div style={{display: 'flex', gap: 5}}><span style={{border: '1px solid #ddd', color: '#888', fontSize: 10, padding: '2px 6px'}}>Tư duy</span></div>
                  </div>
               </div>
            </div>
            
            {/* CAROUSEL DOTS */}
            <div style={{display: 'flex', justifyContent: 'center', gap: 8, marginTop: 10}}>
               <div style={{width: 8, height: 8, borderRadius: '50%', background: '#003380'}}></div>
               <div style={{width: 8, height: 8, borderRadius: '50%', border: '1px solid #999'}}></div>
            </div>
         </div>

      </div>
    </div>
  );
}
