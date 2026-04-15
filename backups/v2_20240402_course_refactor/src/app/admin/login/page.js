'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLogin() {
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

    if (!res.ok) {
        const data = await res.json();
      setError(data.error);
      setLoading(false);
    } else {
      router.push('/admin');
    }
  };

  return (
    <div className="centered-view" style={{background: '#1a252f', color: '#fff'}}>
      <div className="auth-form glass-panel floating" style={{background: 'rgba(0,0,0,0.5)', borderColor: '#333'}}>
        <h2 className="auth-title" style={{color: '#e74c3c', textShadow: 'none'}}>Cửa Quản Trị Hệ Thống</h2>
        <p className="auth-subtitle" style={{color: '#999'}}>Dành riêng cho iMath Administrators</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="input-label" style={{color: '#ddd'}}>Admin Email</label>
            <input 
              type="email" 
              className="input-field" 
              placeholder="admin@imath.com"
              value={form.email}
              onChange={(e) => setForm({...form, email: e.target.value})}
              required
            />
          </div>

          <div className="form-group">
            <label className="input-label" style={{color: '#ddd'}}>Mật khẩu</label>
            <input 
              type="password" 
              className="input-field" 
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm({...form, password: e.target.value})}
              required
            />
          </div>

          {error && <div className="error-text" style={{marginBottom: 15, color: '#e74c3c'}}>{error}</div>}

          <button type="submit" className="btn btn-primary full-width" style={{background: '#e74c3c', border: 'none'}} disabled={loading}>
            {loading ? 'Đang xác minh...' : 'Đăng Nhập Quản Trị'}
          </button>
        </form>
      </div>
    </div>
  );
}
