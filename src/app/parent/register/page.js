'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ParentRegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ fullName: '', email: '', password: '', inviteCode: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    setLoading(true);
    try {
      const res = await fetch('/api/parent/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(data.message + ' Đang chuyển hướng đến trang đăng nhập...');
        setTimeout(() => router.push('/parent/login'), 2500);
      } else {
        setError(data.error);
      }
    } catch(e) { setError('Lỗi kết nối máy chủ.'); }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: '100vh', background: 'linear-gradient(135deg, #001a5c 0%, #003380 50%, #0050cc 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Inter, system-ui, sans-serif', padding: 20
    }}>
      <div style={{
        background: '#fff', width: '100%', maxWidth: 460,
        borderRadius: 24, padding: '50px 45px', boxShadow: '0 30px 80px rgba(0,0,0,0.3)'
      }}>
        {/* LOGO */}
        <div style={{ textAlign: 'center', marginBottom: 35 }}>
          <div style={{ fontSize: 32, fontWeight: 900, color: '#003380', letterSpacing: -1.5 }}>
            iMath<span style={{ color: '#cc0000' }}>.</span>
          </div>
          <div style={{ color: '#666', fontSize: 13, marginTop: 5, fontWeight: 600 }}>
            Cổng Phụ Huynh
          </div>
          <div style={{ marginTop: 18, fontSize: 22, fontWeight: 800, color: '#222' }}>Tạo tài khoản phụ huynh</div>
          <div style={{ fontSize: 13, color: '#888', marginTop: 6 }}>Nhập mã mời từ tài khoản của con để liên kết</div>
        </div>

        {error && (
          <div style={{ background: '#fff5f5', color: '#cc0000', padding: '14px 18px', borderRadius: 12, marginBottom: 20, fontSize: 14, fontWeight: 600, border: '1px solid #ffcccc' }}>
            ❌ {error}
          </div>
        )}
        {success && (
          <div style={{ background: '#f0fff4', color: '#15803d', padding: '14px 18px', borderRadius: 12, marginBottom: 20, fontSize: 14, fontWeight: 600, border: '1px solid #bbf7d0' }}>
            ✅ {success}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={labelStyle}>Họ và tên</label>
            <input type="text" required placeholder="Nguyễn Văn An" value={form.fullName}
              onChange={e => setForm({...form, fullName: e.target.value})} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Địa chỉ Email</label>
            <input type="email" required placeholder="email@example.com" value={form.email}
              onChange={e => setForm({...form, email: e.target.value})} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Mật khẩu</label>
            <input type="password" required placeholder="Tối thiểu 8 ký tự" value={form.password}
              onChange={e => setForm({...form, password: e.target.value})} style={inputStyle} />
          </div>

          {/* INVITE CODE - Prominent */}
          <div style={{ background: '#f0f7ff', border: '1.5px dashed #003380', borderRadius: 14, padding: '16px 18px', marginTop: 4 }}>
            <label style={{ ...labelStyle, color: '#003380' }}>🔑 Mã mời của con (Invite Code)</label>
            <input type="text" required placeholder="VD: ABC12XYZ" value={form.inviteCode}
              onChange={e => setForm({...form, inviteCode: e.target.value.toUpperCase().trim()})}
              style={{ ...inputStyle, background: '#fff', borderColor: '#003380', fontWeight: 800, letterSpacing: 3, fontSize: 18, textAlign: 'center' }}
              maxLength={10}
            />
            <p style={{ fontSize: 11, color: '#666', margin: '8px 0 0 0' }}>
              💡 Mã này có thể tìm thấy trong phần "Hồ sơ" của tài khoản học sinh của con.
            </p>
          </div>

          <button type="submit" disabled={loading} style={{
            background: loading ? '#ccc' : 'linear-gradient(135deg, #003380, #1a56db)',
            color: '#fff', padding: '16px', borderRadius: 14, border: 'none', cursor: loading ? 'default' : 'pointer',
            fontWeight: 800, fontSize: 15, marginTop: 8, transition: '0.2s',
            boxShadow: loading ? 'none' : '0 8px 25px rgba(0,51,128,0.35)'
          }}>
            {loading ? '⏳ Đang xử lý...' : '🔗 Tạo Tài Khoản & Liên Kết'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 28, fontSize: 13, color: '#888' }}>
          Đã có tài khoản?{' '}
          <Link href="/parent/login" style={{ color: '#003380', fontWeight: 800, textDecoration: 'none' }}>
            Đăng nhập ngay
          </Link>
        </div>
      </div>
    </div>
  );
}

const labelStyle = { display: 'block', fontSize: 12, fontWeight: 700, color: '#555', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 };
const inputStyle = { width: '100%', padding: '13px 16px', borderRadius: 10, border: '1.5px solid #e0e0e0', fontSize: 14, outline: 'none', boxSizing: 'border-box', transition: '0.2s', color: '#333', background: '#fafafa' };
