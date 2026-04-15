'use client';
import { useState } from 'react';

export default function EnrollButton({ courseId, enrollmentStatus, userRole }) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(enrollmentStatus); // 'approved', 'pending', 'rejected', or null

  if (userRole === 'parent') {
    return (
      <span style={{background: 'linear-gradient(135deg, #003380, #1a56db)', color: '#fff', padding: '12px 25px', fontSize: 13, fontWeight: 800, borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 12px rgba(0,51,128,0.2)'}}>
        👁️ Chế độ Quan sát viên
      </span>
    );
  }

  const handleEnroll = async () => {
    setLoading(true);
    const res = await fetch('/api/enroll', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId }),
    });

    if (res.ok) {
      setStatus('pending'); // User just enrolled, it goes into pending
    } else {
      const data = await res.json();
      alert(data.error || 'Lỗi đăng ký');
    }
    setLoading(false);
  };

  if (status === 'approved') {
    return (
      <span style={{background: '#2ecc71', color: '#fff', padding: '12px 25px', fontSize: 15, fontWeight: 'bold', borderRadius: 4, display: 'inline-block'}}>
        ✓ Đã tham gia khóa học
      </span>
    );
  }

  if (status === 'pending') {
    return (
      <span style={{background: '#f39c12', color: '#fff', padding: '12px 25px', fontSize: 15, fontWeight: 'bold', borderRadius: 4, display: 'inline-block'}}>
        ⏳ Đang chờ duyệt
      </span>
    );
  }

  if (status === 'rejected') {
    return (
      <span style={{background: '#e74c3c', color: '#fff', padding: '12px 25px', fontSize: 15, fontWeight: 'bold', borderRadius: 4, display: 'inline-block'}}>
        ❌ Yêu cầu bị từ chối
      </span>
    );
  }

  return (
    <button 
      onClick={handleEnroll} 
      disabled={loading}
      style={{
        background: loading ? '#ccc' : '#e67e22', 
        color: '#fff', padding: '12px 25px', fontSize: 15, fontWeight: 'bold', 
        borderRadius: 4, cursor: loading ? 'not-allowed' : 'pointer', border: 'none'
      }}
    >
      {loading ? 'Đang xử lý...' : '+ Gửi yêu cầu tham gia học'}
    </button>
  );
}
