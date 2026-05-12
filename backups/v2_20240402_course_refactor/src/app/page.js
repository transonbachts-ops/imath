import pool, { ensureTeachersTable } from '@/lib/db';
import Link from 'next/link';
import Image from 'next/image';
import TeacherSlider from './components/TeacherSlider';

export default async function Home() {
  let teachers = [];
  let feedbacks = [];
  let studentCount = { cnt: 0 };
  let courseCount = { cnt: 0 };

    try {
    await ensureTeachersTable();
    // Fetch all teachers for the slider
    const [tArr] = await pool.query('SELECT * FROM teachers ORDER BY id');
    teachers = tArr;
    
    // Fetch real reviews/feedbacks (only with text and from approved users potentially)
    const [fArr] = await pool.query(`
      SELECT f.*, u.full_name 
      FROM feedbacks f 
      JOIN users u ON f.user_id = u.id 
      WHERE f.message IS NOT NULL AND CHAR_LENGTH(f.message) > 10
      ORDER BY f.created_at DESC 
      LIMIT 6
    `);
    feedbacks = fArr;

    // Fetch real stats
    const [[sCnt]] = await pool.query("SELECT COUNT(*) as cnt FROM users WHERE role='student'");
    studentCount = sCnt;
    const [[cCnt]] = await pool.query("SELECT COUNT(*) as cnt FROM courses");
    courseCount = cCnt;

    // Fetch courses for the home page
    const [cArr] = await pool.query('SELECT * FROM courses LIMIT 6');
    var courses = cArr;

  } catch (e) {
    console.error('Home Page Data Fetch Error:', e.message);
  }

  return (
    <div style={{fontFamily: 'system-ui, sans-serif', color: '#333'}}>
      
      {/* NAVBAR */}
      <nav style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '25px 60px', position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100, color: '#fff'}}>
        <div style={{fontSize: 28, fontWeight: 950, color: '#fff', letterSpacing: -1.5}}>
          H2bmath<span style={{color: 'var(--secondary)'}}>.</span>
        </div>
        <div style={{display: 'flex', gap: 40, alignItems: 'center'}}>
          <Link href="#courses" style={{color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: 14, opacity: 0.9}}>Khóa học</Link>
          <Link href="/teachers" style={{color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: 14, opacity: 0.9}}>Giảng viên</Link>
          <Link href="/login" style={{color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: 14, opacity: 0.9}}>Đăng nhập</Link>
          <Link href="/register" style={{background: '#fff', color: 'var(--primary)', padding: '12px 30px', borderRadius: 14, textDecoration: 'none', fontWeight: 800, fontSize: 14, boxShadow: '0 10px 25px rgba(0,0,0,0.1)'}}>Bắt đầu ngay</Link>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section style={{height: '95vh', background: 'linear-gradient(rgba(79, 70, 229, 0.75), rgba(124, 58, 237, 0.45)), url(https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=2000) center/cover', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: '#fff', padding: '0 20px', borderRadius: '0 0 60px 60px', overflow: 'hidden'}}>
        <div style={{maxWidth: 900}}>
          <div style={{display: 'inline-block', background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)', padding: '10px 24px', borderRadius: 30, fontSize: 13, fontWeight: 800, marginBottom: 25, border: '1px solid rgba(255,255,255,0.2)', color: '#fff', textTransform: 'uppercase', letterSpacing: 1}}>Nền tảng học Toán trực tuyến hàng đầu Việt Nam</div>
          <h1 style={{fontSize: 72, fontWeight: 950, lineHeight: 1.1, marginBottom: 30, letterSpacing: -2, color: '#ffffff'}}>Khai phá tư duy học Toán <br/><span style={{color: 'var(--secondary)'}}>Vượt trội cùng H2bmath</span></h1>
          <p style={{fontSize: 22, color: '#f0f4ff', marginBottom: 45, lineHeight: 1.6, maxWidth: 750, margin: '0 auto 45px', opacity: 0.9}}>Hệ thống LMS chuyên nghiệp giúp học sinh tiếp cận phương pháp giải toán mới, luyện đề hiệu quả và theo sát lộ trình cá nhân hóa.</p>
          <div style={{display: 'flex', gap: 20, justifyContent: 'center'}}>
            <Link href="/register" style={{background: '#fff', color: '#1e3a8a', padding: '18px 45px', borderRadius: 16, textDecoration: 'none', fontWeight: 800, fontSize: 16, boxShadow: '0 15px 35px rgba(0,0,0,0.1)'}}>Khám phá lộ trình</Link>
            <Link href="/courses" style={{background: 'rgba(255,255,255,0.15)', color: '#fff', padding: '18px 45px', borderRadius: 16, textDecoration: 'none', fontWeight: 700, fontSize: 16, backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.2)'}}>Xem danh sách lớp</Link>
          </div>
        </div>
      </section>

      {/* STATS SECTION */}
      <section style={{padding: '0 50px', marginTop: -60, position: 'relative', zIndex: 10}}>
         <div className="glass-panel" style={{maxWidth: 1100, margin: '0 auto', padding: '45px 60px', display: 'flex', justifyContent: 'space-between'}}>
            <div style={{textAlign: 'center', flex: 1}}>
               <div style={{fontSize: 36, fontWeight: 950, color: 'var(--primary)'}}>{studentCount?.cnt || 0}+</div>
               <div style={{color: '#64748b', fontSize: 14, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5}}>Học Viên Theo Học</div>
            </div>
            <div style={{width: 1, background: 'rgba(0,0,0,0.05)', height: 50, alignSelf: 'center'}}></div>
            <div style={{textAlign: 'center', flex: 1}}>
               <div style={{fontSize: 36, fontWeight: 950, color: 'var(--primary)'}}>{courseCount?.cnt || 0}+</div>
               <div style={{color: '#64748b', fontSize: 14, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5}}>Lớp Học Chuyên Đề</div>
            </div>
            <div style={{width: 1, background: 'rgba(0,0,0,0.05)', height: 50, alignSelf: 'center'}}></div>
            <div style={{textAlign: 'center', flex: 1}}>
               <div style={{fontSize: 36, fontWeight: 950, color: 'var(--primary)'}}>5+</div>
               <div style={{color: '#64748b', fontSize: 14, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5}}>Năm Hoạt Động</div>
            </div>
            <div style={{width: 1, background: 'rgba(0,0,0,0.05)', height: 50, alignSelf: 'center'}}></div>
            <div style={{textAlign: 'center', flex: 1}}>
               <div style={{fontSize: 36, fontWeight: 950, color: 'var(--primary)'}}>98%</div>
               <div style={{color: '#64748b', fontSize: 14, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5}}>Tỉ Lệ Đỗ Đại Học</div>
            </div>
         </div>
      </section>

      {/* COURSES SECTION */}
      <section id="courses" style={{padding: '100px 50px', background: 'transparent'}}>
         <div style={{maxWidth: 1200, margin: '0 auto'}}>
            <div style={{textAlign: 'center', marginBottom: 60}}>
               <div style={{display: 'inline-block', background: 'var(--primary-light)', color: 'var(--primary)', padding: '8px 20px', borderRadius: 30, fontSize: 13, fontWeight: 700, marginBottom: 15, textTransform: 'uppercase', letterSpacing: 1.2}}>Khóa học nổi bật</div>
               <h2 style={{fontSize: 52, fontWeight: 950, color: 'var(--primary)', margin: 0, letterSpacing: -1.5}}>Chương trình đào tạo H2bmath</h2>
            </div>
            
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 35}}>
               {courses && courses.map(c => (
                 <div key={c.id} className="glass-panel floating" style={{overflow: 'hidden', padding: 0, border: '1px solid var(--glass-border)'}}>
                    <div style={{height: 220, backgroundImage: `url(${c.image_url || 'https://placehold.co/600x400/003380/fff?text=Course'})`, backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative'}}>
                       <span style={{position: 'absolute', top: 20, left: 20, background: '#ef4444', color: '#fff', padding: '6px 16px', borderRadius: 50, fontSize: 12, fontWeight: 800, boxShadow: '0 5px 15px rgba(239, 68, 68, 0.3)'}}>Nổi bật</span>
                    </div>
                    <div style={{padding: 35}}>
                       <h3 style={{margin: '0 0 15px 0', fontSize: 24, color: 'var(--text-primary)', lineHeight: 1.3, fontWeight: 900}}>{c.title}</h3>
                       <p style={{color: 'var(--text-secondary)', fontSize: 16, lineHeight: 1.7, marginBottom: 30, minHeight: 80, overflow: 'hidden'}}>{c.description || 'Tham gia cùng H2bmath để khám phá kho tàng tri thức toán học đồ sộ với lộ trình học tập tối ưu.'}</p>
                       <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-muted)', paddingTop: 25}}>
                          <Link href={`/login`} className="btn btn-primary" style={{padding: '12px 30px', fontSize: 14, borderRadius: 12}}>Vào Lớp →</Link>
                          {c.price > 0 && <span style={{fontWeight: 950, color: 'var(--primary)', fontSize: 18}}>{c.price.toLocaleString()}đ</span>}
                       </div>
                    </div>
                 </div>
               ))}
            </div>
            
            <div style={{textAlign: 'center', marginTop: 50}}>
               <Link href="/courses" style={{color: 'var(--primary)', fontWeight: 800, textDecoration: 'none', fontSize: 16, borderBottom: '2px solid var(--primary)', paddingBottom: 5}}>Xem tất cả khóa học</Link>
            </div>
         </div>
      </section>

      {/* TEACHERS - Horizontal Slider */}
      <section id="teachers" style={{background: 'transparent', padding: '100px 50px', position: 'relative'}}>
         <div style={{maxWidth: 1200, margin: '0 auto'}}>
            <div style={{textAlign: 'center', marginBottom: 60}}>
               <div style={{display: 'inline-block', background: 'var(--primary-light)', color: 'var(--primary)', padding: '8px 20px', borderRadius: 30, fontSize: 13, fontWeight: 700, marginBottom: 15, textTransform: 'uppercase', letterSpacing: 1.2}}>Đội Ngũ Giảng Viên</div>
               <h2 style={{fontSize: 52, fontWeight: 950, color: 'var(--primary)', margin: 0, letterSpacing: -1.5}}>Những người thầy tận tâm nhất</h2>
               <p style={{color: 'var(--text-secondary)', fontSize: 18, marginTop: 15, fontWeight: 500}}>Đồng hành cùng bạn là những giảng viên giàu kinh nghiệm và đầy nhiệt huyết</p>
            </div>

            <TeacherSlider teachers={teachers} />
            
            <div style={{textAlign: 'center', marginTop: 40}}>
              <Link href="/teachers" style={{color: '#4f46e5', fontWeight: 800, textDecoration: 'none', fontSize: 16}}>Xem tất cả thầy cô →</Link>
            </div>
         </div>
      </section>

      {/* STUDENT REVIEWS - real from DB */}
      <section style={{padding: '100px 50px'}}>
         <div style={{maxWidth: 1100, margin: '0 auto'}}>
            <div style={{textAlign: 'center', marginBottom: 50}}>
               <div style={{display: 'inline-block', background: 'var(--primary-light)', color: 'var(--primary)', padding: '8px 20px', borderRadius: 30, fontSize: 13, fontWeight: 700, marginBottom: 15, textTransform: 'uppercase'}}>Cảm nhận học viên</div>
               <h2 style={{fontSize: 48, fontWeight: 950, color: 'var(--primary)', margin: 0, letterSpacing: -1}}>Học viên nói gì về H2bmath?</h2>
            </div>
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 30}}>
               {(feedbacks.length > 0 ? feedbacks : [
                 {message: 'Thầy dạy cực dễ hiểu và nhiệt tình. Từ sợ Toán giờ mình đã yêu thích môn này rồi!', full_name: 'Minh Anh', rating: 5},
                 {message: 'Hệ thống học online tiện lợi, quiz ngay sau bài giúp nhớ bài cực nhanh.', full_name: 'Bảo Ngọc', rating: 5},
                 {message: 'Cách giảng phân tích bản chất thay vì học thuộc lòng — điều tôi tìm kiếm từ lâu!', full_name: 'Hoàng Phúc', rating: 5},
               ]).slice(0, 3).map((r, i) => (
                 <div key={i} className="glass-panel floating" style={{padding: 35}}>
                   <div style={{fontSize: 42, color: '#2563eb', marginBottom: 5, opacity: 0.2, fontWeight: 900}}>"</div>
                   <p style={{color: '#475569', fontSize: 16, lineHeight: 1.8, margin: '0 0 25px 0', fontStyle: 'italic', fontWeight: 500}}>{r.message}</p>
                   <div style={{display: 'flex', alignItems: 'center', gap: 15}}>
                     <div style={{width: 45, height: 45, borderRadius: 14, background: 'linear-gradient(135deg, #2563eb, #6366f1)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, flexShrink: 0}}>{(r.full_name||'U')[0]}</div>
                     <div>
                        <div style={{fontWeight: 800, color: '#1e293b', fontSize: 15}}>{r.full_name}</div>
                        <div style={{color: '#64748b', fontSize: 12, fontWeight: 600}}>Học viên H2bmath</div>
                     </div>
                     <div style={{marginLeft: 'auto', color: '#f59e0b', fontSize: 14, display: 'flex', gap: 2}}>
                        {[1, 2, 3, 4, 5].map(s => (
                          <span key={s} style={{opacity: s <= (r.rating || 5) ? 1 : 0.2}}>★</span>
                        ))}
                     </div>
                   </div>
                 </div>
               ))}
            </div>
         </div>
      </section>

      {/* FOOTER */}
      <footer style={{background: 'var(--primary)', color: '#fff', padding: '100px 50px 50px', borderRadius: '60px 60px 0 0'}}>
         <div style={{maxWidth: 1100, margin: '0 auto'}}>
            <div style={{display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 60, marginBottom: 60}}>
               <div>
                  <div style={{fontSize: 32, fontWeight: 950, marginBottom: 25, letterSpacing: -1.5}}>H2bmath<span style={{color: 'var(--secondary)'}}>.</span></div>
                  <p style={{color: '#c5d8ff', lineHeight: 1.8, fontSize: 16, opacity: 0.8}}>Nền tảng giáo dục hiện đại, mang đến trải nghiệm học tập đỉnh cao cho học sinh Việt Nam. H2bmath cam kết chất lượng đào tạo và sự tiến bộ vượt bậc của từng học viên.</p>
               </div>
               <div>
                  <h4 style={{fontSize: 18, fontWeight: 800, marginBottom: 25, color: '#fff', textTransform: 'uppercase', letterSpacing: 1}}>Liên kết</h4>
                  <ul style={{listStyle: 'none', padding: 0, margin: 0, fontSize: 15}}>
                     <li style={{marginBottom: 15}}><Link href="#courses" style={{color: '#f0f4ff', textDecoration: 'none', opacity: 0.8}}>Khóa học</Link></li>
                     <li style={{marginBottom: 15}}><Link href="#teachers" style={{color: '#f0f4ff', textDecoration: 'none', opacity: 0.8}}>Giảng viên</Link></li>
                     <li style={{marginBottom: 15, color: '#f0f4ff', opacity: 0.8}}>Gói giải pháp</li>
                  </ul>
               </div>
               <div>
                  <h4 style={{fontSize: 18, fontWeight: 800, marginBottom: 25, color: '#fff', textTransform: 'uppercase', letterSpacing: 1}}>Hỗ trợ</h4>
                  <ul style={{listStyle: 'none', padding: 0, margin: 0, fontSize: 15}}>
                     <li style={{marginBottom: 15, color: '#f0f4ff', opacity: 0.8}}>Điều khoản</li>
                     <li style={{marginBottom: 15, color: '#f0f4ff', opacity: 0.8}}>Bảo mật</li>
                     <li style={{marginBottom: 15, color: '#f0f4ff', opacity: 0.8}}>Liên hệ</li>
                  </ul>
               </div>
               <div>
                  <h4 style={{fontSize: 18, fontWeight: 800, marginBottom: 25, color: '#fff', textTransform: 'uppercase', letterSpacing: 1}}>Theo dõi</h4>
                  <div style={{display: 'flex', gap: 15}}>
                     {['FB', 'TW', 'IN'].map(s => (
                        <div key={s} style={{width: 45, height: 45, borderRadius: 14, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, cursor: 'pointer', color: '#fff', border: '1px solid rgba(255,255,255,0.15)'}}>{s}</div>
                     ))}
                  </div>
               </div>
            </div>
            <div style={{borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 40, textAlign: 'center', fontSize: 14, color: '#c5d8ff', opacity: 0.6, fontWeight: 600}}>
               &copy; 2026 H2bmath LMS Platform. All Rights Reserved.
            </div>
         </div>
      </footer>
    </div>
  );
}
