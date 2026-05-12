'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import ThemeToggle from '@/app/components/ThemeToggle';
import UserMenu from '@/app/components/UserMenu';

export default function ParentProfilePage() {
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
      setMsg({ text: '✅ Cập nhật hồ sơ phụ huynh thành công!', type: 'success' });
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
  if (!user || user.role !== 'parent') return <div style={{textAlign: 'center', padding: 50}}>Lỗi chưa đăng nhập hoặc không có quyền.</div>;

  return (
    <div style={{fontFamily: 'Inter, system-ui, sans-serif', background: '#f8faff', minHeight: '100vh', paddingBottom: 80}}>
      {/* HEADER */}
      <nav style={{background: '#003380', color: '#fff', padding: '0 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', height: 75, position: 'sticky', top: 0, zIndex: 100}}>
        <div style={{display: 'flex', alignItems: 'center', gap: '50px', height: '100%'}}>
          <Link href="/parent/dashboard" style={{fontSize: 26, fontWeight: 900, color: '#fff', textDecoration: 'none', letterSpacing: -1.5}}>
            H2bmath<span style={{color: '#fff'}}>.</span>
          </Link>
          <div style={{display: 'flex', gap: '30px', fontSize: 14, fontWeight: 700, height: '100%', alignItems: 'center'}}>
             <Link href="/parent/dashboard" style={{color: '#fff', textDecoration: 'none', opacity: 0.8}}>Dashboard Phụ Huynh</Link>
             <Link href="/" style={{color: '#fff', textDecoration: 'none', opacity: 0.8}}>Trang chủ</Link>
          </div>
        </div>
        <div style={{display: 'flex', gap: '15px', alignItems: 'center'}}>
           <UserMenu user={user} />
        </div>
      </nav>

      <div style={{maxWidth: 1100, margin: '50px auto 0', display: 'flex', gap: 40, padding: '0 20px'}}>
         {/* SIDEBAR */}
         <div style={{width: 280, flexShrink: 0, background: '#fff', padding: '30px 20px', height: 'fit-content', borderRadius: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: '1px solid #eef2f7'}}>
            <h3 style={{fontSize: 12, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 20, paddingLeft: 10}}>Menu Cài Đặt</h3>
            <ul style={{listStyle: 'none', padding: 0, margin: 0}}>
               <li style={{marginBottom: 8}}><Link href="/parent/profile" style={{display: 'flex', alignItems: 'center', gap: 10, padding: '14px 20px', color: '#003380', background: '#f0f7ff', textDecoration: 'none', borderRadius: 12, fontSize: 14, fontWeight: 800, transition: '0.3s'}}>👤 Hồ sơ phụ huynh</Link></li>
               <li style={{marginBottom: 8}}><Link href="/parent/dashboard" style={{display: 'flex', alignItems: 'center', gap: 10, padding: '14px 20px', color: '#64748b', textDecoration: 'none', borderRadius: 12, fontSize: 14, fontWeight: 600, transition: '0.3s'}}>📊 Dashboard con cái</Link></li>
            </ul>
         </div>

         {/* MAIN AREA */}
         <div style={{flex: 1}}>
            <div style={{background: '#fff', borderRadius: 24, padding: '50px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: '1px solid #eef2f7'}}>
               <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 40}}>
                  <div>
                     <h2 style={{fontSize: 28, fontWeight: 950, color: '#003380', margin: '0 0 10px 0', letterSpacing: -1}}>Hồ Sơ Phụ Huynh</h2>
                     <p style={{color: '#64748b', margin: 0, fontSize: 14}}>Cập nhật thông tin cá nhân của người giám hộ</p>
                     {user?.linkedInfo && (
                       <div style={{marginTop: 15, fontSize: 14, color: '#166534', fontWeight: 700, background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '8px 16px', borderRadius: 8, display: 'inline-block'}}>
                         👨‍👧 Đã liên kết với con: {user.linkedInfo.full_name}
                       </div>
                     )}
                  </div>
                  <div style={{background: '#f0f7ff', color: '#003380', padding: '8px 16px', borderRadius: 30, fontSize: 12, fontWeight: 800}}>ROLE: PHỤ HUYNH</div>
               </div>
               
               {msg.text && (
                 <div style={{padding: '15px 25px', borderRadius: 16, marginBottom: 30, background: msg.type === 'success' ? '#f0fdf4' : '#fef2f2', color: msg.type === 'success' ? '#166534' : '#991b1b', fontWeight: 700, border: `1px solid ${msg.type === 'success' ? '#bbf7d0' : '#fecaca'}`}}>
                    {msg.text}
                 </div>
               )}

               <form onSubmit={handleSave}>
                  <div style={{display: 'flex', gap: 60, marginBottom: 50, alignItems: 'flex-start'}}>
                    {/* AVATAR UPLOAD */}
                    <div style={{width: 160, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20}}>
                       <div style={{width: 150, height: 150, borderRadius: '50%', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '5px solid #fff', boxShadow: '0 10px 30px rgba(0,0,0,0.1)'}}>
                         {form.avatar_url && form.avatar_url.startsWith('http') ? (
                           <img src={form.avatar_url} style={{width: '100%', height: '100%', objectFit: 'cover'}} alt="Avatar" />
                         ) : <span style={{fontSize: 65}}>👨‍👩‍👧</span>}
                       </div>
                       <label style={{fontSize: 12, background: 'linear-gradient(135deg, #003380, #1a56db)', color: '#fff', padding: '12px 20px', borderRadius: 30, cursor: 'pointer', fontWeight: 900, boxShadow: '0 6px 20px rgba(0,51,128,0.3)', transition: '0.3s', textAlign: 'center', width: '100%'}}>
                         📸 Tải ảnh mới
                         <input type="file" accept="image/*" onChange={handleUploadAvatar} style={{display: 'none'}} />
                       </label>
                    </div>

                    <div style={{flex: 1, display: 'flex', flexDirection: 'column', gap: 30}}>
                       <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20}}>
                          <div>
                            <label style={{display: 'block', fontSize: 13, fontWeight: 800, color: '#334155', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5}}>Tên Phụ Huynh</label>
                            <input type="text" value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} style={inputStyle} required />
                          </div>
                          <div>
                            <label style={{display: 'block', fontSize: 13, fontWeight: 800, color: '#334155', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5}}>Email liên hệ</label>
                            <input type="email" value={user.email} disabled style={{...inputStyle, background: '#f1f5f9', cursor: 'not-allowed', color: '#64748b'}} />
                          </div>
                       </div>

                       <div>
                         <label style={{display: 'block', fontSize: 13, fontWeight: 800, color: '#334155', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5}}>Đổi Mật Khẩu (Nếu cần)</label>
                         <input type="password" placeholder="Nhập mật khẩu mới để thay đổi..." value={form.password} onChange={e => setForm({...form, password: e.target.value})} style={inputStyle} />
                         <p style={{fontSize: 11, color: '#94a3b8', marginTop: 8}}>Giữ trống nếu bạn không muốn thay đổi mật khẩu hiện tại.</p>
                       </div>
                    </div>
                  </div>

                  <div style={{borderTop: '1px solid #eef2f7', paddingTop: 40, display: 'flex', justifyContent: 'flex-end'}}>
                    <button type="submit" disabled={saving} style={{background: 'linear-gradient(135deg, #003380, #1a56db)', color: '#fff', padding: '16px 40px', borderRadius: 16, border: 'none', fontWeight: 800, fontSize: 15, cursor: 'pointer', transition: '0.3s', boxShadow: '0 8px 25px rgba(0,51,128,0.3)'}}>
                      {saving ? '⏳ ĐANG LƯU...' : '💾 LƯU THAY ĐỔI'}
                    </button>
                  </div>
               </form>
            </div>
         </div>
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%', padding: '16px 20px', borderRadius: 14, border: '1.5px solid #e2e8f0',
  fontSize: 15, boxSizing: 'border-box', background: '#fff', color: '#1e293b',
  outline: 'none', transition: '0.3s', fontWeight: 600
};
