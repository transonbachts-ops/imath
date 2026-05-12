import pool, { ensureTeachersTable } from '@/lib/db';
import Link from 'next/link';

export default async function TeachersPage() {
  await ensureTeachersTable();
  const [teachers] = await pool.query('SELECT * FROM teachers ORDER BY id');

  return (
    <div style={{minHeight: '100vh', background: 'transparent', padding: '60px 20px', fontFamily: 'system-ui, sans-serif'}}>
      <div style={{maxWidth: 1200, margin: '0 auto'}}>
        <div style={{textAlign: 'center', marginBottom: 60}}>
          <Link href="/" style={{color: 'var(--primary)', textDecoration: 'none', fontWeight: 800, fontSize: 14, display: 'inline-block', marginBottom: 20}}>← Quay về trang chủ</Link>
          <h1 style={{fontSize: 48, fontWeight: 950, color: 'var(--text-primary)', marginBottom: 20, letterSpacing: -2}}>Đội Ngũ Giảng Viên H2bmath</h1>
          <p style={{fontSize: 18, color: 'var(--text-secondary)', maxWidth: 700, margin: '0 auto'}}>Những người thầy, người cô tận tâm luôn đồng hành cùng bạn trên con đường chinh phục đỉnh cao tri thức.</p>
        </div>

        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 40}}>
          {teachers.map((t) => (
            <div key={t.id} className="glass-panel" style={{padding: 40}}>
               <div style={{display: 'flex', alignItems: 'center', gap: 25, marginBottom: 30}}>
                  <div style={{width: 100, height: 100, borderRadius: '50%', overflow: 'hidden', border: '4px solid #fff', boxShadow: '0 10px 20px rgba(0,0,0,0.1)'}}>
                    <img src={t.avatar_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=300'} alt={t.name} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
                  </div>
                  <div>
                    <h3 style={{fontSize: 22, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 5}}>{t.name}</h3>
                    <p style={{color: 'var(--primary)', fontWeight: 800, fontSize: 13, textTransform: 'uppercase'}}>{t.role_title}</p>
                  </div>
               </div>
               <p style={{color: 'var(--text-secondary)', fontSize: 15, lineHeight: 1.8, marginBottom: 30, minHeight: 80}}>{t.bio}</p>
               
               <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-muted)', paddingTop: 20}}>
                 <div style={{display: 'flex', gap: 15}}>
                    {t.fb_url && <a href={t.fb_url} style={{color: '#1877F2', fontWeight: 900, textDecoration: 'none'}}>F</a>}
                    {t.twitter_url && <a href={t.twitter_url} style={{color: '#1DA1F2', fontWeight: 900, textDecoration: 'none'}}>TIN</a>}
                    {t.linkedin_url && <a href={t.linkedin_url} style={{color: '#0A66C2', fontWeight: 900, textDecoration: 'none'}}>IN</a>}
                 </div>
                 <button className="btn btn-primary" style={{padding: '10px 25px', borderRadius: 12, fontWeight: 700, fontSize: 13}}>Lộ trình</button>
               </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
