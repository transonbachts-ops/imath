'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
      setLoading(false);
    } else {
      if (data.user?.role === 'parent') {
        router.push('/parent/dashboard');
      } else {
        router.push('/dashboard');
      }
    }
  };

  const [showReset, setShowReset] = useState(false);
  const [resetForm, setResetForm] = useState({ fullName: '', email: '', newPassword: '' });
  const [resetStatus, setResetStatus] = useState({ type: '', msg: '' });

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setResetStatus({ type: 'info', msg: 'Đang xử lý...' });
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resetForm)
      });
      const data = await res.json();
      if (res.ok) {
        setResetStatus({ type: 'success', msg: data.message });
        setTimeout(() => setShowReset(false), 2000);
      } else {
        setResetStatus({ type: 'error', msg: data.error });
      }
    } catch(e) {
      setResetStatus({ type: 'error', msg: 'Lỗi kết nối server' });
    }
  };

  return (
    <div className="centered-view">
      {/* Decorative floating elements */}
      <div className="glass-panel floating" style={{position: 'absolute', top: '15%', left: '10%', width: '120px', height: '120px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary) 0%, transparent 100%)', opacity: 0.6, zIndex: 1}}></div>
      <div className="glass-panel floating" style={{position: 'absolute', bottom: '15%', right: '10%', width: '180px', height: '180px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--secondary) 0%, transparent 100%)', opacity: 0.5, zIndex: 1}}></div>

      <div className="auth-form glass-panel floating" style={{zIndex: 10, position: 'relative', minWidth: 400}}>
        <h1 style={{fontSize: '36px', marginBottom: '5px', textAlign: 'center', background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 800}}>
          H2bmath
        </h1>
        
        {!showReset ? (
          <>
            <h2 className="auth-title" style={{fontSize: '24px'}}>Chào Mừng Trở Lại</h2>
            <p className="auth-subtitle">Đăng nhập để tiếp tục lộ trình học tập</p>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="input-label">Email của bạn</label>
                <input 
                  type="email" 
                  className="input-field" 
                  placeholder="hocsinh@example.com"
                  value={form.email}
                  onChange={(e) => setForm({...form, email: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                  <label className="input-label">Mật khẩu</label>
                  <button type="button" onClick={() => setShowReset(true)} style={{background: 'none', border: 'none', color: '#003380', fontSize: 12, fontWeight: 700, cursor: 'pointer', marginBottom: 8}}>Quên mật khẩu?</button>
                </div>
                <input 
                  type="password" 
                  className="input-field" 
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm({...form, password: e.target.value})}
                  required
                />
              </div>

              {error && <div className="error-text" style={{marginBottom: 15, fontWeight: 'bold'}}>{error}</div>}

              <button type="submit" className="btn btn-primary full-width" disabled={loading}>
                {loading ? 'Đang xác thực...' : 'Đăng Nhập'}
              </button>
            </form>

            <div className="form-footer">
              Chưa có tài khoản? <Link href="/register">Đăng ký ngay</Link>
            </div>
          </>
        ) : (
          <>
            <h2 className="auth-title" style={{fontSize: '22px'}}>Khôi Phục Mật Khẩu</h2>
            <p className="auth-subtitle">Nhập thông tin cá nhân để đặt lại mật khẩu</p>

            <form onSubmit={handleResetSubmit}>
              <div className="form-group">
                <label className="input-label">Họ và Tên đầy đủ</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="Nguyễn Văn A"
                  value={resetForm.fullName}
                  onChange={(e) => setResetForm({...resetForm, fullName: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label className="input-label">Email đăng ký</label>
                <input 
                  type="email" 
                  className="input-field" 
                  placeholder="example@mail.com"
                  value={resetForm.email}
                  onChange={(e) => setResetForm({...resetForm, email: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label className="input-label">Mật khẩu mới</label>
                <input 
                  type="password" 
                  className="input-field" 
                  placeholder="••••••••"
                  value={resetForm.newPassword}
                  onChange={(e) => setResetForm({...resetForm, newPassword: e.target.value})}
                  required
                />
              </div>

              {resetStatus.msg && (
                <div style={{
                  marginBottom: 15, 
                  padding: 10, 
                  borderRadius: 8, 
                  fontSize: 13, 
                  fontWeight: 700, 
                  background: resetStatus.type === 'error' ? '#ffeeee' : resetStatus.type === 'success' ? '#eeffee' : '#f0f7ff',
                  color: resetStatus.type === 'error' ? '#cc0000' : resetStatus.type === 'success' ? '#008800' : '#003380'
                }}>
                  {resetStatus.msg}
                </div>
              )}

              <button type="submit" className="btn btn-primary full-width">Xác nhận Đặt lại</button>
              <button type="button" onClick={() => { setShowReset(false); setResetStatus({type:'', msg:''}); }} className="btn btn-secondary full-width" style={{marginTop: 10, background: '#eee'}}>Hủy & Quay lại</button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
