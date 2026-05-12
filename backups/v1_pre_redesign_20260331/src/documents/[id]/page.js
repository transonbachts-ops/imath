import pool from '@/lib/db';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import Link from 'next/link';
import UserMenu from '@/app/components/UserMenu';

export default async function DocumentViewer({ params }) {
  const cookieStore = await cookies();
  const token = cookieStore.get('token');
  
  let user = null;
  if (token) {
    try {
      user = jwt.verify(token.value, 'supersecret_smart_edu_key_999');
    } catch(e) {}
  }

  // App router parsing params in newer versions requires awaiting
  const resolvedParams = await params;
  const docId = resolvedParams.id;
  
  // DDL Cứu hộ tự động tạo Table
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

  let doc = null;
  try {
    const [rows] = await pool.query('SELECT * FROM documents WHERE id = ?', [docId]);
    doc = rows[0];
  } catch(e) {}

  if (!doc) {
    return <div style={{padding: 100, textAlign: 'center', fontSize: 24}}>Ấn phẩm này không tồn tại hoặc đã bị gỡ.</div>;
  }

  // Formatting utility for multiline text
  const renderMultilineText = (text) => {
    if (!text) return null;
    return text.split('\n').map((line, i) => (
      <p key={i} style={{marginBottom: 20, lineHeight: 1.8}}>{line}</p>
    ));
  };

  return (
    <div style={{fontFamily: 'system-ui, sans-serif', background: '#fff', minHeight: '100vh'}}>
      {/* HEADER TƯƠNG TỰ DASHBOARD */}
      <nav style={{background: '#003380', color: '#fff', padding: '0 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', height: 75, position: 'sticky', top: 0, zIndex: 50}}>
        <div style={{display: 'flex', alignItems: 'center', gap: '50px', height: '100%'}}>
          <Link href="/dashboard" style={{fontSize: 26, fontWeight: 900, color: '#fff', textDecoration: 'none', letterSpacing: -1}}>
            H2bmath<span style={{color: '#cc0000'}}>.</span>
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
             <input type="text" name="q" placeholder="Tìm kiếm tài liệu, bài viết..." style={{border: 'none', outline: 'none', background: 'transparent', width: '100%', fontSize: 14, color: '#333'}}/>
           </form>
           
           {user ? (
             <UserMenu user={user} />
           ) : (
             <Link href="/" style={{background: '#fff', color: '#c0392b', padding: '10px 20px', borderRadius: 8, fontWeight: 'bold', fontSize: 14, textDecoration: 'none'}}>Đăng Nhập</Link>
           )}
        </div>
      </nav>

      {/* BANNER ẢNH NGÀN CHUẨN */}
      {doc.cover_image_url && (
         <div style={{width: '100%', background: '#fafafa', paddingTop: 50, paddingBottom: 50, borderBottom: '1px solid #eee'}}>
           <div style={{maxWidth: 900, margin: '0 auto', boxShadow: '0 20px 40px rgba(0,0,0,0.1)'}}>
              <img src={doc.cover_image_url} alt={doc.title} style={{width: '100%', display: 'block'}} />
           </div>
         </div>
      )}

      {/* LỜI NGỎ (INTRODUCTION) */}
      {doc.introduction && (
        <div style={{maxWidth: 800, margin: '0 auto', paddingTop: 80, paddingBottom: 60, color: '#444'}}>
          <h2 style={{fontSize: 27, fontWeight: 900, marginBottom: 30, color: '#333', textAlign: 'center'}}>LỜI NGỎ</h2>
          <div style={{fontSize: 16, textAlign: 'justify', lineHeight: 1.8}}>
            {renderMultilineText(doc.introduction)}
          </div>
        </div>
      )}

      {/* XEM PDF TRỰC TIẾP + TẢI VỀ */}
      <div style={{maxWidth: 950, margin: '0 auto', padding: '0 20px 80px'}}>
        <div style={{textAlign: 'center', marginBottom: 20}}>
          <h2 style={{fontSize: 25, fontWeight: 900, marginBottom: 8, color: '#333'}}>📖 ĐỌC TÀI LIỆU TRỰC TUYẾN</h2>
          <p style={{color: '#888', fontSize: 14, marginBottom: 20}}>Xem ngay trên trình duyệt — không cần tải xuống</p>
        </div>

        {doc.pdf_url ? (
          user ? (
            <div>
              {/* INLINE PDF VIEWER — direct embed */}
              <div style={{borderRadius: 12, overflow: 'hidden', boxShadow: '0 10px 40px rgba(0,0,0,0.1)', border: '1px solid #e0e0e0', marginBottom: 20}}>
                <iframe
                  src={doc.pdf_url}
                  width="100%"
                  height="800px"
                  style={{display: 'block', border: 'none'}}
                  title={doc.title}
                />
              </div>
              {/* DOWNLOAD BUTTON */}
              <div style={{textAlign: 'center'}}>
                <a href={doc.pdf_url} target="_blank" rel="noreferrer" download
                  style={{display: 'inline-flex', alignItems: 'center', gap: 8, background: '#e74c3c', color: '#fff', padding: '12px 35px', fontWeight: 900, fontSize: 15, textDecoration: 'none', borderRadius: 30, boxShadow: '0 5px 15px rgba(231,76,60,0.35)'}}>
                  📥 Tải xuống PDF
                </a>
              </div>
            </div>
          ) : (
            <div style={{textAlign: 'center', background: '#f9f9f9', padding: 50, borderRadius: 12, border: '2px dashed #ddd'}}>
              <div style={{fontSize: 50, marginBottom: 15}}>🔒</div>
              <p style={{fontSize: 16, color: '#555', marginBottom: 20}}>Vui lòng đăng nhập để xem và tải tài liệu này.</p>
              <a href="/" style={{display: 'inline-block', background: '#003380', color: '#fff', padding: '12px 30px', fontWeight: 900, fontSize: 15, textDecoration: 'none', borderRadius: 30}}>
                Đăng Nhập Ngay
              </a>
            </div>
          )
        ) : (
          <div style={{textAlign: 'center', background: '#f9f9f9', padding: 50, borderRadius: 12, border: '2px dashed #ddd'}}>
            <div style={{fontSize: 50, marginBottom: 15}}>📂</div>
            <p style={{color: '#888', fontSize: 15}}>Tài liệu PDF chưa được cập nhật cho ấn phẩm này.</p>
          </div>
        )}
      </div>

      {/* NỘI DUNG TẠP CHÍ */}
      {doc.table_of_contents && (
        <div style={{maxWidth: 800, margin: '0 auto', paddingTop: 60, paddingBottom: 100, textAlign: 'center'}}>
          <h2 style={{fontSize: 25, fontWeight: 900, marginBottom: 15, color: '#333'}}>NỘI DUNG TẠP CHÍ</h2>
          <p style={{color: '#888', marginBottom: 40, fontSize: 13}}>Tạp chí được trình bày với đa nhóm nội dung</p>
          
          <div style={{textAlign: 'left', background: '#fff', padding: 30, borderRadius: 12, border: '1px solid #eee', color: '#555', display: 'inline-block', minWidth: '50%'}}>
             {renderMultilineText(doc.table_of_contents)}
          </div>
        </div>
      )}
    </div>
  );
}
