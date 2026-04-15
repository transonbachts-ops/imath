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

  return (
    <div className="centered-view">
      {/* Decorative floating elements */}
      <div className="glass-panel floating" style={{position: 'absolute', top: '15%', left: '10%', width: '120px', height: '120px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary) 0%, transparent 100%)', opacity: 0.6, zIndex: 1}}></div>
      <div className="glass-panel floating" style={{position: 'absolute', bottom: '15%', right: '10%', width: '180px', height: '180px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--secondary) 0%, transparent 100%)', opacity: 0.5, zIndex: 1}}></div>

      <div className="auth-form glass-panel floating" style={{zIndex: 10, position: 'relative'}}>
        <h1 style={{fontSize: '36px', marginBottom: '5px', textAlign: 'center', background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 800}}>
          iMath
        </h1>
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
            <label className="input-label">Mật khẩu</label>
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
      </div>
    </div>
  );
}
