'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

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
    <div style={{fontFamily: 'system-ui, sans-serif', background: '#f5f7fa', minHeight: '100vh', paddingBottom: 80}}>
      {/* HEADER */}
      <nav style={{background: '#003380', color: '#fff', padding: '0 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', height: 75, position: 'sticky', top: 0, zIndex: 50}}>
        <div style={{display: 'flex', alignItems: 'center', gap: '50px', height: '100%'}}>
          <Link href="/dashboard" style={{fontSize: 26, fontWeight: 900, color: '#fff', textDecoration: 'none', letterSpacing: -1}}>
            H2bmath<span style={{color: '#cc0000'}}>.</span>
          </Link>
          <div style={{display: 'flex', gap: '30px', fontSize: 15, fontWeight: 'bold', height: '100%', alignItems: 'center'}}>
             <Link href="/dashboard" style={{color: '#fff', textDecoration: 'none'}}>Trang chủ</Link>
             <Link href="/my-courses" style={{color: '#fff', textDecoration: 'none'}}>Khóa học của tôi</Link>
          </div>
        </div>
      </nav>

      <div style={{maxWidth: 1000, margin: '40px auto 0', display: 'flex', gap: 40, padding: '0 20px'}}>
         {/* SIDEBAR */}
         <div style={{width: 250, flexShrink: 0, borderRight: '1px solid #ddd', paddingRight: 20}}>
            <ul style={{listStyle: 'none', padding: 0, margin: 0}}>
               <li style={{marginBottom: 10}}><Link href="/profile" style={{display: 'block', padding: '12px 15px', color: '#003380', background: '#f0f4ff', textDecoration: 'none', borderRadius: 8, fontSize: 15, fontWeight: 'bold'}}>Hồ sơ cá nhân</Link></li>
               <li style={{marginBottom: 10}}><Link href="/my-courses" style={{display: 'block', padding: '12px 15px', color: '#555', textDecoration: 'none', borderRadius: 8, fontSize: 15}}>Khóa học của tôi</Link></li>
            </ul>
         </div>

         {/* MAIN AREA */}
         <div style={{flex: 1}}>
            <div style={{background: '#fff', borderRadius: 16, padding: '40px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: '1px solid #eee'}}>
               <h2 style={{fontSize: 24, fontWeight: 800, color: '#003380', margin: '0 0 30px 0'}}>Cài Đặt Hồ Sơ Cơ Bản</h2>
               
               {msg.text && (
                 <div style={{padding: '12px 20px', borderRadius: 8, marginBottom: 20, background: msg.type === 'success' ? '#e8f5e9' : '#ffebee', color: msg.type === 'success' ? '#2e7d32' : '#c62828', fontWeight: 'bold'}}>
                    {msg.text}
                 </div>
               )}

               <form onSubmit={handleSave}>
                 <div style={{display: 'flex', gap: 30, marginBottom: 30}}>
                    {/* AVATAR UPLOAD */}
                    <div style={{width: 120, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10}}>
                       <div style={{width: 100, height: 100, borderRadius: '50%', background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '2px solid #ddd'}}>
                         {form.avatar_url && form.avatar_url.startsWith('http') ? (
                           <img src={form.avatar_url} style={{width: '100%', height: '100%', objectFit: 'cover'}} alt="Avatar" />
                         ) : <span style={{fontSize: 40}}>👤</span>}
                       </div>
                       <label style={{fontSize: 12, background: '#eee', padding: '6px 15px', borderRadius: 20, cursor: 'pointer', fontWeight: 'bold'}}>
                         Tải ảnh lên
                         <input type="file" accept="image/*" onChange={handleUploadAvatar} style={{display: 'none'}} />
                       </label>
                    </div>

                    <div style={{flex: 1, display: 'flex', flexDirection: 'column', gap: 20}}>
                       <div>
                         <label style={{display: 'block', fontSize: 13, fontWeight: 700, color: '#555', marginBottom: 8}}>Họ và Tên</label>
                         <input type="text" value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} style={{width: '100%', padding: '12px 15px', borderRadius: 8, border: '1px solid #ddd', fontSize: 15, boxSizing: 'border-box'}} required />
                       </div>
                       <div>
                         <label style={{display: 'block', fontSize: 13, fontWeight: 700, color: '#555', marginBottom: 8}}>Địa chỉ Email</label>
                         <input type="email" value={user.email} disabled style={{width: '100%', padding: '12px 15px', borderRadius: 8, border: '1px solid #e0e0e0', fontSize: 15, background: '#f9f9f9', color: '#888', boxSizing: 'border-box'}} />
                         <span style={{fontSize: 11, color: '#aaa', marginTop: 4, display: 'block'}}>Không thể thay đổi email đã đăng ký.</span>
                       </div>
                       <div>
                         <label style={{display: 'block', fontSize: 13, fontWeight: 700, color: '#555', marginBottom: 8}}>Ngày tham gia hệ thống</label>
                         <input type="text" value={new Date(user.created_at).toLocaleString('vi-VN')} disabled style={{width: '100%', padding: '12px 15px', borderRadius: 8, border: '1px solid #e0e0e0', fontSize: 15, background: '#f9f9f9', color: '#888', boxSizing: 'border-box'}} />
                       </div>
                    </div>
                 </div>

                 <hr style={{border: 'none', borderTop: '1px solid #eee', margin: '30px 0'}} />
                 
                 <h3 style={{fontSize: 18, fontWeight: 700, color: '#003380', margin: '0 0 20px 0'}}>Đổi Mật Khẩu (Để trống nếu không đổi)</h3>
                 <div style={{marginBottom: 30}}>
                   <input type="password" placeholder="Mật khẩu mới..." value={form.password} onChange={e => setForm({...form, password: e.target.value})} style={{width: '100%', maxWidth: 400, padding: '12px 15px', borderRadius: 8, border: '1px solid #ddd', fontSize: 15, boxSizing: 'border-box'}} />
                 </div>

                 <button type="submit" disabled={saving} style={{background: '#003380', color: '#fff', padding: '14px 40px', borderRadius: 8, border: 'none', fontWeight: 800, fontSize: 15, cursor: 'pointer', transition: '0.2s', opacity: saving ? 0.7 : 1}}>
                   {saving ? 'Đang lưu...' : '💾 LƯU THAY ĐỔI'}
                 </button>
               </form>
            </div>
         </div>
      </div>
    </div>
  );
}
