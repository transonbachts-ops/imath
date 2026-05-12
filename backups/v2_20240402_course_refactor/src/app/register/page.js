'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function Register() {
  const router = useRouter();
  const [form, setForm] = useState({ fullName: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
      setLoading(false);
    } else {
      router.push('/');
    }
  };

  return (
    <div className="centered-view">
      <div className="auth-form glass-panel floating">
        <h2 className="auth-title">Khởi Tạo Tài Khoản</h2>
        <p className="auth-subtitle">Sẵn sàng để học tập tại H2bmath</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="input-label">Họ và tên</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="Ví dụ: Nguyễn Văn A"
              value={form.fullName}
              onChange={(e) => setForm({...form, fullName: e.target.value})}
              required
            />
          </div>

          <div className="form-group">
            <label className="input-label">Email</label>
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
              placeholder="Tối thiểu 6 ký tự"
              value={form.password}
              onChange={(e) => setForm({...form, password: e.target.value})}
              required
            />
          </div>

          {error && <div className="error-text" style={{marginBottom: 15}}>{error}</div>}

          <button type="submit" className="btn btn-primary full-width" disabled={loading}>
            {loading ? 'Đang tạo tài khoản...' : 'Đăng Ký Ngay'}
          </button>
        </form>

        <div className="form-footer">
          Đã có tài khoản? <Link href="/">Đăng nhập tại đây</Link>
        </div>
      </div>
    </div>
  );
}
