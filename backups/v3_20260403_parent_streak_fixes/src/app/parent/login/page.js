'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ParentLoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (res.ok) {
        if (data.user?.role === 'parent') {
          router.push('/parent/dashboard');
        } else {
          // Not a parent - logout and show error
          await fetch('/api/auth/logout', { method: 'POST' });
          setError('Tài khoản này không phải tài khoản phụ huynh. Vui lòng dùng cổng đăng nhập phù hợp.');
        }
      } else {
        setError(data.error);
      }
    } catch(e) { setError('Lỗi kết nối.'); }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: '100vh', background: 'linear-gradient(135deg, #001a5c 0%, #003380 50%, #0050cc 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Inter, system-ui, sans-serif', padding: 20
    }}>
      <div style={{ width: '100%', maxWidth: 420, textAlign: 'center' }}>
        {/* TOP BADGE */}
        <div style={{ marginBottom: 30 }}>
          <div style={{ fontSize: 34, fontWeight: 900, color: '#fff', letterSpacing: -1.5 }}>
            H2bmath<span style={{ color: '#cc0000' }}>.</span>
          </div>
          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 5 }}>
            Cổng theo dõi dành cho Phụ Huynh
          </div>
        </div>

        <div style={{
          background: '#fff', borderRadius: 24, padding: '45px 40px',
          boxShadow: '0 30px 80px rgba(0,0,0,0.25)'
        }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#222', marginBottom: 6 }}>Đăng nhập</h1>
          <p style={{ color: '#888', fontSize: 13, marginBottom: 30 }}>Chào mừng quý phụ huynh trở lại</p>

          {error && (
            <div style={{ background: '#fff5f5', color: '#cc0000', padding: '12px 16px', borderRadius: 10, marginBottom: 20, fontSize: 13, fontWeight: 600 }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <input type="email" required placeholder="Email" value={form.email}
              onChange={e => setForm({...form, email: e.target.value})} style={inputStyle} />
            <input type="password" required placeholder="Mật khẩu" value={form.password}
              onChange={e => setForm({...form, password: e.target.value})} style={inputStyle} />

            <button type="submit" disabled={loading} style={{
              background: loading ? '#bbb' : 'linear-gradient(135deg, #003380, #1a56db)',
              color: '#fff', padding: '14px', borderRadius: 12, border: 'none',
              cursor: loading ? 'default' : 'pointer', fontWeight: 800, fontSize: 15,
              marginTop: 6, boxShadow: '0 6px 20px rgba(0,51,128,0.3)', transition: '0.2s'
            }}>
              {loading ? '⏳ Đang xử lý...' : '→ Đăng nhập'}
            </button>
          </form>

          <div style={{ marginTop: 25, paddingTop: 25, borderTop: '1px solid #eee', fontSize: 13, color: '#888' }}>
            Chưa có tài khoản?{' '}
            <Link href="/parent/register" style={{ color: '#003380', fontWeight: 800, textDecoration: 'none' }}>
              Đăng ký với Mã Mời
            </Link>
          </div>
        </div>

        <div style={{ marginTop: 20, fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
          Đây là cổng dành riêng cho Phụ Huynh. Học sinh và Giáo viên sử dụng{' '}
          <Link href="/login" style={{ color: 'rgba(255,255,255,0.8)', textDecoration: 'underline' }}>
            cổng đăng nhập chính
          </Link>.
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%', padding: '13px 16px', borderRadius: 10,
  border: '1.5px solid #e8e8e8', fontSize: 14, outline: 'none',
  boxSizing: 'border-box', color: '#333', background: '#fafafa'
};
