import pool from '@/lib/db';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import Link from 'next/link';
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
    <div style={{fontFamily: 'system-ui, sans-serif', background: '#f5f7fa', minHeight: '100vh', paddingBottom: 80}}>
      {/* LIBERO STYLE HEADER */}
      <nav style={{background: '#003380', color: '#fff', padding: '0 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', height: 75, position: 'sticky', top: 0, zIndex: 50}}>
        <div style={{display: 'flex', alignItems: 'center', gap: '50px', height: '100%'}}>
          <Link href="/dashboard" style={{fontSize: 26, fontWeight: 900, color: '#fff', textDecoration: 'none', letterSpacing: -1}}>
            iMath<span style={{color: '#cc0000'}}>.</span>
          </Link>
          <div style={{display: 'flex', gap: '30px', fontSize: 15, fontWeight: 'bold', height: '100%', alignItems: 'center'}}>
             <Link href="/dashboard" style={{color: '#fff', textDecoration: 'none'}}>Trang chủ</Link>
             <Link href="/dashboard#courses-section" style={{color: '#fff', textDecoration: 'none'}}>Khóa học</Link>
             <Link href="/dashboard#calendar-section" style={{color: '#fff', textDecoration: 'none'}}>Lịch Học ▾</Link>
             <Link href="/documents" style={{color: '#fff', textDecoration: 'none', borderBottom: '3px solid #fff', height: '100%', display: 'flex', alignItems: 'center', boxSizing: 'border-box'}}>Tài liệu</Link>
          </div>
        </div>

        <div style={{display: 'flex', gap: '20px', alignItems: 'center'}}>
           <form action="/documents" style={{background: '#fff', padding: '0 15px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: 10, width: 300, border: '1px solid #ddd', height: 42}}>
             <button type="submit" style={{background: 'none', border: 'none', cursor: 'pointer', color: '#666', fontSize: 13, padding: 0}}>🔍</button>
             <input type="text" name="q" defaultValue={query} placeholder="Tìm kiếm tài liệu, sách, báo..." style={{border: 'none', outline: 'none', background: 'transparent', width: '100%', fontSize: 14, color: '#333'}}/>
           </form>
           
           {user ? (
             <UserMenu user={user} />
           ) : (
             <Link href="/" style={{background: '#fff', color: '#cc0000', padding: '10px 20px', borderRadius: 20, fontWeight: 'bold', fontSize: 14, textDecoration: 'none'}}>Đăng Nhập</Link>
           )}
        </div>
      </nav>

      {/* DOCUMENT GRID OVERVIEW */}
      <div className="container" style={{maxWidth: 1100, margin: '0 auto', textAlign: 'center', marginTop: 60}}>
        <h1 style={{fontSize: '32px', marginBottom: '50px', color: '#003380', fontWeight: 900}}>
          {query ? `Kết quả tìm kiếm cho: "${query}"` : 'Tủ Sách & Ấn Phẩm Tài Liệu iMath'}
        </h1>
        
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '30px', textAlign: 'left'}}>
          {documents.length === 0 ? <p style={{color: '#888', gridColumn: 'span 3', textAlign: 'center'}}>Gian sách hiện tại đang trống.</p> : documents.map(d => (
             <Link href={`/documents/${d.id}`} key={d.id} style={{textDecoration: 'none', background: '#fff', border: '1px solid #eee', borderRadius: '12px', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 10px 25px rgba(0,0,0,0.06)', transition: 'transform 0.2s', cursor: 'pointer'}}>
                {d.cover_image_url ? (
                  <div style={{backgroundImage: `url(${d.cover_image_url})`, backgroundSize: 'cover', backgroundPosition: 'center', height: '220px', width: '100%'}}></div>
                ) : (
                  <div style={{background: '#e0e0e0', height: '220px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888'}}>Không Có Bìa</div>
                )}
                <div style={{padding: '30px 25px', display: 'flex', flexDirection: 'column', flexGrow: 1}}>
                  <p style={{color: '#e74c3c', fontSize: 13, marginBottom: 8, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1}}>Tạp Chí iMath</p>
                  <h3 style={{marginBottom: '15px', color: '#2c3e50', fontSize: '24px', fontWeight: 800, lineHeight: 1.3}}>{d.title}</h3>
                  <p style={{color: '#666', fontSize: '15px', marginBottom: '30px', flexGrow: 1, lineHeight: '1.7'}}>{d.introduction ? (d.introduction.substring(0, 80) + '...') : ''}</p>
                  
                  <div style={{textAlign: 'center', marginTop: 'auto'}}>
                     <span style={{background: '#fff', border: '2px solid #003380', color: '#003380', padding: '10px 30px', fontSize: 14, fontWeight: 'bold', display: 'inline-block', borderRadius: 30}}>
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
