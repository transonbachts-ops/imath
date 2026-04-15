import pool from '@/lib/db';
import Link from 'next/link';
import Image from 'next/image';

export default async function Home() {
  // Fetch real teachers from DB
  const [teachers] = await pool.query('SELECT * FROM teachers ORDER BY id LIMIT 8');
  
  // Fetch real reviews/feedbacks (only with text and from approved users potentially)
  const [feedbacks] = await pool.query(`
    SELECT f.*, u.full_name 
    FROM feedbacks f 
    JOIN users u ON f.user_id = u.id 
    WHERE f.message IS NOT NULL AND CHAR_LENGTH(f.message) > 10
    ORDER BY f.created_at DESC 
    LIMIT 6
  `);

  // Fetch real stats
  const [[studentCount]] = await pool.query("SELECT COUNT(*) as cnt FROM users WHERE role='student'");
  const [[courseCount]] = await pool.query("SELECT COUNT(*) as cnt FROM courses");

  return (
    <div style={{fontFamily: 'system-ui, sans-serif', color: '#333'}}>
      
      {/* NAVBAR */}
      <nav style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 50px', position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100}}>
        <div style={{fontSize: 28, fontWeight: 900, color: '#fff', letterSpacing: -1}}>
          iMath<span style={{color: '#cc0000'}}>.</span>
        </div>
        <div style={{display: 'flex', gap: 35, alignItems: 'center'}}>
          <Link href="#courses" style={{color: '#fff', textDecoration: 'none', fontWeight: 600, fontSize: 14}}>Khóa học</Link>
          <Link href="#teachers" style={{color: '#fff', textDecoration: 'none', fontWeight: 600, fontSize: 14}}>Giảng viên</Link>
          <Link href="/login" style={{color: '#fff', textDecoration: 'none', fontWeight: 600, fontSize: 14}}>Đăng nhập</Link>
          <Link href="/register" style={{background: '#cc0000', color: '#fff', padding: '10px 22px', borderRadius: 6, textDecoration: 'none', fontWeight: 800, fontSize: 14, boxShadow: '0 4px 15px rgba(204,0,0,0.3)'}}>Bắt đầu ngay</Link>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section style={{height: '95vh', background: 'linear-gradient(rgba(0,25,80,0.85), rgba(0,25,80,0.85)), url(https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=2000) center/cover', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: '#fff', padding: '0 20px'}}>
        <div style={{maxWidth: 900}}>
          <div style={{display: 'inline-block', background: 'rgba(255,255,255,0.1)', padding: '8px 20px', borderRadius: 30, fontSize: 13, fontWeight: 700, marginBottom: 25, border: '1px solid rgba(255,255,255,0.2)', color: '#fff'}}>Nền tảng học Toán trực tuyến hàng đầu Việt Nam</div>
          <h1 style={{fontSize: 68, fontWeight: 950, lineHeight: 1.1, marginBottom: 30, letterSpacing: -2, color: '#ffffff'}}>Khai phá tư duy học Toán <br/><span style={{color: '#ff4d4d'}}>Vượt trội cùng iMath</span></h1>
          <p style={{fontSize: 20, color: '#f0f4ff', marginBottom: 40, lineHeight: 1.6, maxWidth: 700, margin: '0 auto 40px'}}>Hệ thống LMS chuyên nghiệp giúp học sinh tiếp cận phương pháp giải toán mới, luyện đề hiệu quả và theo sát lộ trình cá nhân hóa.</p>
          <div style={{display: 'flex', gap: 20, justifyContent: 'center'}}>
            <Link href="/register" style={{background: '#fff', color: '#003380', padding: '16px 40px', borderRadius: 8, textDecoration: 'none', fontWeight: 800, fontSize: 16, transition: '0.3s'}}>Khám phá lộ trình</Link>
            <Link href="/courses" style={{background: 'rgba(255,255,255,0.15)', color: '#fff', padding: '16px 40px', borderRadius: 8, textDecoration: 'none', fontWeight: 700, fontSize: 16, backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.2)'}}>Xem danh sách lớp</Link>
          </div>
        </div>
      </section>

      {/* STATS SECTION */}
      <section style={{padding: '0 50px', marginTop: -60, position: 'relative', zIndex: 10}}>
         <div style={{maxWidth: 1100, margin: '0 auto', background: '#fff', borderRadius: 20, padding: '40px 60px', display: 'flex', justifyContent: 'space-between', boxShadow: '0 20px 40px rgba(0,0,0,0.1)'}}>
            <div style={{textAlign: 'center', flex: 1}}>
               <div style={{fontSize: 32, fontWeight: 900, color: '#003380'}}>{studentCount?.cnt || 0}+</div>
               <div style={{color: '#888', fontSize: 14, fontWeight: 600}}>Học Viên Đang Theo Học</div>
            </div>
            <div style={{width: 1, background: '#eee', height: 40, alignSelf: 'center'}}></div>
            <div style={{textAlign: 'center', flex: 1}}>
               <div style={{fontSize: 32, fontWeight: 900, color: '#003380'}}>{courseCount?.cnt || 0}+</div>
               <div style={{color: '#888', fontSize: 14, fontWeight: 600}}>Lớp Học & Chuyên Đề</div>
            </div>
            <div style={{width: 1, background: '#eee', height: 40, alignSelf: 'center'}}></div>
            <div style={{textAlign: 'center', flex: 1}}>
               <div style={{fontSize: 32, fontWeight: 900, color: '#003380'}}>5+</div>
               <div style={{color: '#888', fontSize: 14, fontWeight: 600}}>Năm Hoạt Động</div>
            </div>
            <div style={{width: 1, background: '#eee', height: 40, alignSelf: 'center'}}></div>
            <div style={{textAlign: 'center', flex: 1}}>
               <div style={{fontSize: 32, fontWeight: 900, color: '#003380'}}>98%</div>
               <div style={{color: '#888', fontSize: 14, fontWeight: 600}}>Tỉ Lệ Đỗ Đại Học</div>
            </div>
         </div>
      </section>

      {/* TEACHERS - from DB */}
      <section id="teachers" style={{background: '#fff', padding: '80px 50px'}}>
         <div style={{maxWidth: 1100, margin: '0 auto'}}>
            <div style={{textAlign: 'center', marginBottom: 60}}>
               <div style={{display: 'inline-block', background: '#fff0f0', color: '#cc0000', padding: '6px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600, marginBottom: 15}}>Đội Ngũ Giảng Viên</div>
               <h2 style={{fontSize: 38, fontWeight: 900, color: '#003380', margin: 0}}>Những người thầy tận tâm nhất</h2>
               <p style={{color: '#888', fontSize: 16, marginTop: 12}}>Đồng hành cùng bạn là những giảng viên giàu kinh nghiệm và đầy nhiệt huyết</p>
            </div>
            {teachers.length > 0 ? (
              <div style={{display: 'grid', gridTemplateColumns: `repeat(${Math.min(teachers.length, 4)}, 1fr)`, gap: 25}}>
                {teachers.map((t, i) => {
                  const colors = ['#003380', '#1a885c', '#cc0000', '#c89a00', '#7b2d8b', '#0077b6'];
                  const color = colors[i % colors.length];
                  return (
                    <div key={t.id} style={{textAlign: 'center', background: '#fff', border: '1px solid #f0f0f0', borderRadius: 16, padding: '30px 20px', boxShadow: '0 4px 15px rgba(0,0,0,0.04)'}}>
                       <div style={{width: 110, height: 110, margin: '0 auto 18px', borderRadius: '50%', background: `linear-gradient(135deg, ${color}, ${color}cc)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, border: '4px solid #fff', boxShadow: '0 8px 20px rgba(0,0,0,0.1)', color: '#fff', fontWeight: 800, overflow: 'hidden'}}>
                         {t.avatar_url ? (
                           <img src={t.avatar_url} style={{width: '100%', height: '100%', objectFit: 'cover'}} alt={t.name} />
                         ) : t.name.split(' ').pop()[0]}
                       </div>
                       <h3 style={{fontSize: 17, fontWeight: 800, color: '#003380', marginBottom: 6}}>{t.name}</h3>
                       <p style={{color: '#cc0000', fontSize: 12, fontWeight: 600, marginBottom: 8}}>{t.role_title || 'Giảng viên'}</p>
                       <p style={{color: '#777', fontSize: 13, lineHeight: 1.5}}>{t.bio || ''}</p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 25}}>
                {[
                   { name: 'Thầy Nguyễn Chí Chung', role: 'Thạc sĩ Toán ĐH Sư Phạm', exp: '20 năm kinh nghiệm', color: '#003380' },
                   { name: 'Thầy Nguyễn Công Nguyên', role: 'Chuyên gia Hình học', exp: 'Phương pháp logic đột phá', color: '#1a885c' },
                   { name: 'Cô Lê Thị Lan Anh', role: 'Giảng viên cấp cao', exp: 'Kỹ năng giải toán nhanh', color: '#cc0000' },
                   { name: 'Thầy Phạm Hùng Vương', role: 'Chuyên gia Giải tích', exp: 'Luyện thi THPT Quốc Gia', color: '#c89a00' }
                ].map((t, i) => (
                    <div key={i} style={{textAlign: 'center', background: '#fff', border: '1px solid #f0f0f0', borderRadius: 16, padding: '30px 20px'}}>
                       <div style={{width: 110, height: 110, margin: '0 auto 18px', borderRadius: '50%', background: `linear-gradient(135deg, ${t.color}, ${t.color}cc)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, border: '4px solid #fff', boxShadow: '0 8px 20px rgba(0,0,0,0.1)'}}>{'👨‍🏫'}</div>
                       <h3 style={{fontSize: 17, fontWeight: 800, color: '#003380', marginBottom: 6}}>{t.name}</h3>
                       <p style={{color: '#cc0000', fontSize: 12, fontWeight: 600, marginBottom: 8}}>{t.role}</p>
                       <p style={{color: '#777', fontSize: 13, lineHeight: 1.5}}>{t.exp}</p>
                    </div>
                ))}
              </div>
            )}
         </div>
      </section>

      {/* STUDENT REVIEWS - real from DB */}
      <section style={{background: '#f8faff', padding: '80px 50px'}}>
         <div style={{maxWidth: 1100, margin: '0 auto'}}>
            <div style={{textAlign: 'center', marginBottom: 50}}>
               <div style={{display: 'inline-block', background: '#e8f0fe', color: '#003380', padding: '6px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600, marginBottom: 15}}>Cảm nhận</div>
               <h2 style={{fontSize: 38, fontWeight: 900, color: '#003380', margin: 0}}>Học viên nói gì về iMath?</h2>
            </div>
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 25}}>
               {(feedbacks.length > 0 ? feedbacks : [
                 {message: 'Thầy dạy cực dễ hiểu và nhiệt tình. Từ sợ Toán giờ mình đã yêu thích môn này rồi!', full_name: 'Minh Anh', rating: 5},
                 {message: 'Hệ thống học online tiện lợi, quiz ngay sau bài giúp nhớ bài cực nhanh.', full_name: 'Bảo Ngọc', rating: 5},
                 {message: 'Cách giảng phân tích bản chất thay vì học thuộc lòng — điều tôi tìm kiếm từ lâu!', full_name: 'Hoàng Phúc', rating: 5},
               ]).slice(0, 3).map((r, i) => (
                 <div key={i} style={{background: '#fff', padding: 30, borderRadius: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: '1px solid #eee'}}>
                   <div style={{fontSize: 32, color: '#003380', marginBottom: 12, opacity: 0.3}}>"</div>
                   <p style={{color: '#555', fontSize: 15, lineHeight: 1.7, margin: '0 0 20px 0', fontStyle: 'italic'}}>{r.message}</p>
                   <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
                     <div style={{width: 40, height: 40, borderRadius: '50%', background: '#003380', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0}}>{(r.full_name||'U')[0]}</div>
                     <div>
                        <div style={{fontWeight: 700, color: '#222', fontSize: 14}}>{r.full_name}</div>
                        <div style={{color: '#888', fontSize: 12}}>Học viên iMath</div>
                     </div>
                     <div style={{marginLeft: 'auto', color: '#f39c12', fontSize: 13, display: 'flex', gap: 1}}>
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
      <footer style={{background: '#003380', color: '#fff', padding: '80px 50px 40px'}}>
         <div style={{maxWidth: 1100, margin: '0 auto'}}>
            <div style={{display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 50, marginBottom: 60}}>
               <div>
                  <div style={{fontSize: 28, fontWeight: 950, marginBottom: 25}}>iMath<span style={{color: '#cc0000'}}>.</span></div>
                  <p style={{color: '#c5d8ff', lineHeight: 1.8, fontSize: 15}}>Nền tảng giáo dục hiện đại, mang đến trải nghiệm học tập đỉnh cao cho học sinh Việt Nam. iMath cam kết chất lượng đào tạo và sự tiến bộ vượt bậc của từng học viên.</p>
               </div>
               <div>
                  <h4 style={{fontSize: 18, fontWeight: 700, marginBottom: 25, color: '#fff'}}>Liên kết</h4>
                  <ul style={{listStyle: 'none', padding: 0, margin: 0, fontSize: 14}}>
                     <li style={{marginBottom: 12}}><Link href="#courses" style={{color: '#f0f4ff', textDecoration: 'none'}}>Khóa học</Link></li>
                     <li style={{marginBottom: 12}}><Link href="#teachers" style={{color: '#f0f4ff', textDecoration: 'none'}}>Giảng viên</Link></li>
                     <li style={{marginBottom: 12, color: '#f0f4ff'}}>Gói giải pháp</li>
                  </ul>
               </div>
               <div>
                  <h4 style={{fontSize: 18, fontWeight: 700, marginBottom: 25, color: '#fff'}}>Hỗ trợ</h4>
                  <ul style={{listStyle: 'none', padding: 0, margin: 0, fontSize: 14}}>
                     <li style={{marginBottom: 12, color: '#f0f4ff'}}>Điều khoản</li>
                     <li style={{marginBottom: 12, color: '#f0f4ff'}}>Bảo mật</li>
                     <li style={{marginBottom: 12, color: '#f0f4ff'}}>Liên hệ</li>
                  </ul>
               </div>
               <div>
                  <h4 style={{fontSize: 18, fontWeight: 700, marginBottom: 25, color: '#fff'}}>Theo dõi</h4>
                  <div style={{display: 'flex', gap: 15}}>
                     {['FB', 'YT', 'INS'].map(s => (
                        <div key={s} style={{width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12, cursor: 'pointer', color: '#c5d8ff'}}>{s}</div>
                     ))}
                  </div>
               </div>
            </div>
            <div style={{borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 40, textAlign: 'center', fontSize: 13, color: '#c5d8ff'}}>
               &copy; 2026 iMath LMS Platform. All Rights Reserved.
            </div>
         </div>
      </footer>
    </div>
  );
}
