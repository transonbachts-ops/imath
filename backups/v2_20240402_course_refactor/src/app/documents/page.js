import pool from '@/lib/db';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import Link from 'next/link';
import ThemeToggle from '@/app/components/ThemeToggle';
import UserMenu from '@/app/components/UserMenu';

export default async function DocumentsPage({ searchParams }) {
  const cookieStore = await cookies();
  const token = cookieStore.get('token');
  
  const resolvedParams = await searchParams;
  const query = resolvedParams?.q || '';
  
  let user = null;
  if (token) {
    try {
      user = jwt.verify(token.value, 'supersecret_smart_edu_key_999');
    } catch(e) {}
  }

  // Khởi tạo DB tự động nếu User vào nhầm trang này trước khi Admin tạo bảng
  await pool.query(`
    CREATE TABLE IF NOT EXISTS documents (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      cover_image_url VARCHAR(500),
      introduction TEXT,
      pdf_url VARCHAR(500),
      table_of_contents TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  let documents = [];
  if (query) {
    const [rows] = await pool.query('SELECT * FROM documents WHERE title LIKE ? OR introduction LIKE ? ORDER BY created_at DESC', [`%${query}%`, `%${query}%`]);
    documents = rows;
  } else {
    const [rows] = await pool.query('SELECT * FROM documents ORDER BY created_at DESC');
    documents = rows;
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
             <Link href="/documents" style={{color: 'var(--primary)', textDecoration: 'none', borderBottom: '3px solid var(--secondary)', height: '100%', display: 'flex', alignItems: 'center'}}>Tài liệu</Link>
          </div>
        </div>

        <div style={{display: 'flex', gap: '15px', alignItems: 'center'}}>
           <div style={{display: 'flex', gap: '15px', alignItems: 'center'}}>
              <form action="/documents" style={{background: 'rgba(255,255,255,0.5)', padding: '0 15px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 8, width: 260, height: 40, border: '1px solid rgba(255,255,255,0.5)', transition: 'all 0.3s ease', boxShadow: '0 4px 15px rgba(0,0,0,0.05)'}}>
                <button type="submit" style={{background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', fontSize: 13, padding: 0, opacity: 0.7}}>🔍</button>
                <input type="text" name="q" defaultValue={query} placeholder="Tìm tài liệu..." style={{border: 'none', outline: 'none', background: 'transparent', width: '100%', fontSize: 14, color: 'var(--text-primary)', fontWeight: 600}}/>
              </form>
              <ThemeToggle />
           </div>
           
           {user ? (
             <UserMenu user={user} />
           ) : (
             <Link href="/" style={{background: 'var(--primary)', color: '#fff', padding: '10px 25px', borderRadius: 20, fontWeight: 800, fontSize: 14, textDecoration: 'none'}}>Đăng Nhập</Link>
           )}
        </div>
      </nav>

      {/* DOCUMENT GRID OVERVIEW */}
      <div className="container" style={{maxWidth: 1100, margin: '0 auto', textAlign: 'center', marginTop: 60}}>
        <h1 style={{fontSize: '36px', marginBottom: '50px', color: 'var(--primary)', fontWeight: 950, letterSpacing: -1}}>
          {query ? `Kết quả tìm kiếm cho: "${query}"` : 'Tủ Sách & Ấn Phẩm Tài Liệu H2bmath'}
        </h1>
        
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '30px', textAlign: 'left'}}>
          {documents.length === 0 ? <p style={{color: '#888', gridColumn: 'span 3', textAlign: 'center'}}>Gian sách hiện tại đang trống.</p> : documents.map(d => (
             <Link href={`/documents/${d.id}`} key={d.id} style={{textDecoration: 'none', background: 'var(--card-bg)', border: '1px solid var(--border-muted)', borderRadius: '12px', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 10px 25px rgba(0,0,0,0.06)', transition: 'transform 0.2s', cursor: 'pointer'}}>
                {d.cover_image_url ? (
                  <div style={{backgroundImage: `url(${d.cover_image_url})`, backgroundSize: 'cover', backgroundPosition: 'center', height: '220px', width: '100%'}}></div>
                ) : (
                  <div style={{background: '#e0e0e0', height: '220px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888'}}>Không Có Bìa</div>
                )}
                <div style={{padding: '30px 25px', display: 'flex', flexDirection: 'column', flexGrow: 1}}>
                  <p style={{color: '#e74c3c', fontSize: 13, marginBottom: 8, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1}}>Tạp Chí H2bmath</p>
                  <h3 style={{marginBottom: '15px', color: 'var(--text-primary)', fontSize: '24px', fontWeight: 800, lineHeight: 1.3}}>{d.title}</h3>
                  <p style={{color: 'var(--text-secondary)', fontSize: '15px', marginBottom: '30px', flexGrow: 1, lineHeight: '1.7'}}>{d.introduction ? (d.introduction.substring(0, 80) + '...') : ''}</p>
                  
                  <div style={{textAlign: 'center', marginTop: 'auto'}}>
                     <span style={{background: 'var(--card-bg)', border: '2px solid var(--primary)', color: 'var(--primary)', padding: '10px 30px', fontSize: 14, fontWeight: 'bold', display: 'inline-block', borderRadius: 30}}>
                       Mở Lấy Phân Tích
                     </span>
                  </div>
                </div>
             </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
