'use client';
import { useRouter } from 'next/navigation';

export default function LogoutButton() {
  const router = useRouter();
  
  const handleLogout = async () => {
    await fetch('/api/auth/login', { method: 'DELETE' });
    router.push('/');
  };
  
  return (
    <button onClick={handleLogout} style={{padding: '5px 15px', borderRadius: '20px', background: '#fff', border: '1px solid #7cb3d4', color: '#5289a8', fontWeight: 'bold', fontSize: 13, cursor: 'pointer', outline: 'none'}}>
      Đăng xuất
    </button>
  );
}
