'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import ThemeToggle from '@/app/components/ThemeToggle';
import UserMenu from '@/app/components/UserMenu';

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [form, setForm] = useState({ full_name: '', avatar_url: '', password: '' });
  const [msg, setMsg] = useState({ text: '', type: '' });

  useEffect(() => {
    fetch('/api/profile')
      .then(r => r.json())
      .then(data => {
        if(data.user) {
          setUser(data.user);
          setForm({ full_name: data.user.full_name || '', avatar_url: data.user.avatar_url || '', password: '' });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg({text: '', type: ''});
    
    const res = await fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });
    
    if (res.ok) {
      setMsg({ text: '✅ Cập nhật thay đổi thành công!', type: 'success' });
      setForm(prev => ({...prev, password: ''}));
    } else {
      setMsg({ text: '❌ Cập nhật thất bại. Thử lại sau.', type: 'error' });
    }
    setSaving(false);
  };

  const handleUploadAvatar = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    
    setForm({...form, avatar_url: 'Đang tải lên...'});
    const res = await fetch('/api/admin/upload', { method: 'POST', body: formData });
    const data = await res.json();
    if (res.ok) {
      setForm({...form, avatar_url: data.url});
    } else {
      alert(data.error || 'Lỗi tải ảnh');
      setForm({...form, avatar_url: ''});
    }
  };

  if (loading) return <div style={{textAlign: 'center', padding: 50}}>Đang tải hồ sơ...</div>;
  if (!user) return <div style={{textAlign: 'center', padding: 50}}>Lỗi chưa đăng nhập.</div>;

  return (
    <div style={{fontFamily: 'system-ui, sans-serif', background: 'transparent', minHeight: '100vh', paddingBottom: 80}}>
      {/* HEADER */}
      <nav className="glass-panel" style={{color: 'var(--text-primary)', padding: '0 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 75, position: 'sticky', top: 0, zIndex: 100, borderBottom: '1px solid var(--border-muted)', borderRadius: '0 0 24px 24px', margin: '0 10px'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: '50px', height: '100%'}}>
          <Link href="/dashboard" style={{fontSize: 26, fontWeight: 950, color: 'var(--primary)', textDecoration: 'none', letterSpacing: -1.5}}>
            iMath<span style={{color: 'var(--secondary)'}}>.</span>
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

      <div style={{maxWidth: 1200, margin: '50px auto 0', display: 'flex', gap: 40, padding: '0 20px'}}>
         {/* SIDEBAR */}
         <div className="glass-panel" style={{width: 280, flexShrink: 0, padding: '30px 20px', height: 'fit-content', borderRadius: 24}}>
            <ul style={{listStyle: 'none', padding: 0, margin: 0}}>
               <li style={{marginBottom: 12}}><Link href="/profile" style={{display: 'flex', alignItems: 'center', gap: 10, padding: '15px 20px', color: 'var(--primary)', background: 'var(--primary-light)', textDecoration: 'none', borderRadius: 16, fontSize: 15, fontWeight: 800, transition: '0.3s'}}>👤 Hồ sơ cá nhân</Link></li>
               <li style={{marginBottom: 12}}><Link href="/my-courses" style={{display: 'flex', alignItems: 'center', gap: 10, padding: '15px 20px', color: 'var(--text-secondary)', textDecoration: 'none', borderRadius: 16, fontSize: 15, fontWeight: 600, transition: '0.3s'}}>📚 Khóa học của tôi</Link></li>
               <li style={{marginBottom: 12}}><Link href="/my-certificates" style={{display: 'flex', alignItems: 'center', gap: 10, padding: '15px 20px', color: 'var(--text-secondary)', textDecoration: 'none', borderRadius: 16, fontSize: 15, fontWeight: 600, transition: '0.3s'}}>🎓 Chứng chỉ của tôi</Link></li>
            </ul>
         </div>

         {/* MAIN AREA */}
         <div style={{flex: 1}}>
            <div className="glass-panel" style={{background: 'var(--card-bg)', borderRadius: 24, padding: '50px', boxShadow: 'var(--glass-shadow)', border: '1px solid var(--glass-border)', backdropFilter: 'blur(30px)'}}>
               <h2 style={{fontSize: 28, fontWeight: 950, color: 'var(--primary)', margin: '0 0 40px 0', letterSpacing: -1}}>🛠️ Cài Đặt Hồ Sơ Cá Nhân</h2>
               
               {msg.text && (
                 <div style={{padding: '15px 25px', borderRadius: 16, marginBottom: 30, background: msg.type === 'success' ? 'var(--primary-light)' : '#ffebee', color: msg.type === 'success' ? 'var(--primary)' : '#c62828', fontWeight: 800, border: '1px solid var(--glass-border)'}}>
                    {msg.text}
                 </div>
               )}

               <form onSubmit={handleSave}>
                  <div style={{display: 'flex', gap: 50, marginBottom: 50, alignItems: 'flex-start'}}>
                    {/* AVATAR UPLOAD */}
                    <div style={{width: 150, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20}}>
                       <div style={{width: 140, height: 140, borderRadius: '50%', background: 'rgba(255, 255, 255, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '4px solid var(--primary)', boxShadow: '0 10px 30px rgba(0,0,0,0.15)'}}>
                         {form.avatar_url && form.avatar_url.startsWith('http') ? (
                           <img src={form.avatar_url} style={{width: '100%', height: '100%', objectFit: 'cover'}} alt="Avatar" />
                         ) : <span style={{fontSize: 60}}>👤</span>}
                       </div>
                       <label style={{fontSize: 13, background: 'linear-gradient(135deg, var(--primary), #6366f1)', color: '#fff', padding: '12px 24px', borderRadius: 30, cursor: 'pointer', fontWeight: 900, boxShadow: '0 4px 15px rgba(0,0,0,0.15)', transition: '0.3s', textAlign: 'center', width: '100%'}}>
                         📸 Đổi ảnh đại diện
                         <input type="file" accept="image/*" onChange={handleUploadAvatar} style={{display: 'none'}} />
                       </label>
                    </div>

                    <div style={{flex: 1, display: 'flex', flexDirection: 'column', gap: 30}}>
                       <div>
                         <label style={{display: 'block', fontSize: 13, fontWeight: 900, color: 'var(--text-secondary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1}}>Họ và Tên</label>
                         <input type="text" value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} style={{width: '100%', padding: '18px 25px', borderRadius: 20, border: '1px solid var(--glass-border)', fontSize: 16, boxSizing: 'border-box', background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)', outline: 'none', transition: '0.3s', fontWeight: 600}} required />
                       </div>
                       <div>
                         <label style={{display: 'block', fontSize: 13, fontWeight: 900, color: 'var(--text-secondary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1}}>Địa chỉ Email</label>
                         <input type="email" value={user.email} disabled style={{width: '100%', padding: '18px 25px', borderRadius: 20, border: '1px solid var(--border-muted)', fontSize: 16, background: 'rgba(0,0,0,0.03)', color: 'var(--text-muted)', cursor: 'not-allowed', fontStyle: 'italic'}} />
                         <span style={{fontSize: 12, color: 'var(--text-muted)', marginTop: 10, display: 'block', opacity: 0.8, fontWeight: 600}}>⚠️ Thông tin bảo mật: Không thể tự đổi email.</span>
                       </div>
                       <div>
                         <label style={{display: 'block', fontSize: 13, fontWeight: 900, color: 'var(--text-secondary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1}}>Ngày tham gia hệ thống</label>
                         <input type="text" value={new Date(user.created_at).toLocaleString('vi-VN')} disabled style={{width: '100%', padding: '18px 25px', borderRadius: 20, border: '1px solid var(--border-muted)', fontSize: 16, background: 'rgba(0,0,0,0.03)', color: 'var(--text-muted)', fontWeight: 600}} />
                       </div>
                    </div>
                 </div>

                 <hr style={{border: 'none', borderTop: '1px solid var(--border-muted)', margin: '40px 0'}} />
                 
                 <h3 style={{fontSize: 22, fontWeight: 950, color: 'var(--primary)', margin: '0 0 30px 0', letterSpacing: -0.5}}>🔐 Bảo Mật & Mật Khẩu</h3>
                 <div style={{marginBottom: 40}}>
                   <input type="password" placeholder="Nhập mật khẩu mới (để trống nếu không đổi)..." value={form.password} onChange={e => setForm({...form, password: e.target.value})} style={{width: '100%', maxWidth: 480, padding: '18px 25px', borderRadius: 20, border: '1px solid var(--glass-border)', fontSize: 16, boxSizing: 'border-box', background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)', outline: 'none', fontWeight: 600}} />
                 </div>

                  {/* INVITE CODE SECTION (for students) */}
                  {user.role === 'student' && (
                    <div style={{marginTop: 30, borderTop: '1px solid var(--border-muted)', paddingTop: 20}}>
                      {user.linkedInfo ? (
                        <div style={{fontSize: 14, color: '#166534', fontWeight: 700}}>
                          Đã liên kết với phụ huynh: {user.linkedInfo.full_name}
                        </div>
                      ) : (
                        <>
                          <h3 style={{fontSize: 18, fontWeight: 950, color: 'var(--primary)', marginBottom: 10}}>🔑 Mã mời Phụ Huynh</h3>
                          <p style={{fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12}}>Gửi mã này cho phụ huynh để họ tạo tài khoản và theo dõi quá trình học tập.</p>
                          <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
                             <div style={{background: '#f8fafc', color: '#003380', padding: '10px 20px', borderRadius: 8, fontSize: 18, fontWeight: 900, fontFamily: 'monospace', border: '1px solid #e2e8f0'}}>{user.invite_code}</div>
                             <button type="button" onClick={() => {
                                const el = document.createElement('textarea'); el.value = user.invite_code; document.body.appendChild(el); el.select(); document.execCommand('copy'); document.body.removeChild(el); alert('✅ Đã sao chép!');
                             }} style={{background: 'var(--primary)', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13}}>Sao chép</button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                  <hr style={{border: 'none', borderTop: '1px solid var(--border-muted)', margin: '40px 0'}} />

                 <button type="submit" disabled={saving} style={{background: 'linear-gradient(135deg, var(--primary), #6366f1)', color: '#fff', padding: '18px 50px', borderRadius: 20, border: 'none', fontWeight: 950, fontSize: 16, cursor: 'pointer', transition: '0.3s', boxShadow: '0 10px 30px rgba(79, 70, 229, 0.4)', letterSpacing: 1.5, textTransform: 'uppercase'}}>
                   {saving ? '⏳ ĐANG LƯU THÔNG TIN...' : '💾 LƯU THAY ĐỔI NGAY'}
                 </button>
               </form>
            </div>
         </div>
      </div>
    </div>
  );
}
