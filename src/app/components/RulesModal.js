'use client';
import { useState } from 'react';

export default function RulesModal({ courseId, rules, onAccept }) {
  const [accepted, setAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!accepted) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/enrollments/accept-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId })
      });
      if (res.ok) {
        onAccept();
      }
    } catch (error) {
      console.error('Lỗi khi chấp nhận nội quy:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!rules) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '20px'
    }}>
      <div style={{
        background: 'rgba(255, 255, 255, 0.95)',
        maxWidth: '600px',
        width: '100%',
        borderRadius: '24px',
        padding: '40px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        animation: 'modalSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes modalSlideUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .rules-content::-webkit-scrollbar { width: 6px; }
          .rules-content::-webkit-scrollbar-track { background: transparent; }
          .rules-content::-webkit-scrollbar-thumb { background: #ddd; border-radius: 10px; }
        `}} />

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📜</div>
          <h2 style={{ 
            fontSize: '24px', 
            fontWeight: 900, 
            color: '#003380',
            margin: 0,
            letterSpacing: '-0.5px'
          }}>Nội Quy Tham Gia Lớp Học</h2>
          <p style={{ color: '#666', fontSize: '14px', marginTop: '8px' }}>
            Vui lòng đọc kỹ và cam kết tuân thủ các quy định dưới đây để bắt đầu học tập.
          </p>
        </div>

        <div className="rules-content" style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          padding: '24px',
          maxHeight: '300px',
          overflowY: 'auto',
          fontSize: '15px',
          lineHeight: '1.7',
          color: '#334155',
          whiteSpace: 'pre-wrap'
        }}>
          {rules}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <label style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px', 
            cursor: 'pointer',
            padding: '12px 16px',
            background: accepted ? '#eff6ff' : 'transparent',
            border: `1px solid ${accepted ? '#3b82f6' : '#e2e8f0'}`,
            borderRadius: '12px',
            transition: 'all 0.2s'
          }}>
            <input 
              type="checkbox" 
              checked={accepted} 
              onChange={(e) => setAccepted(e.target.checked)}
              style={{ width: '20px', height: '20px', cursor: 'pointer' }}
            />
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>
              Tôi đã hiểu và cam kết tuân thủ nội quy lớp học.
            </span>
          </label>

          <button 
            disabled={!accepted || isSubmitting}
            onClick={handleSubmit}
            style={{
              width: '100%',
              padding: '16px',
              borderRadius: '14px',
              border: 'none',
              background: accepted ? 'linear-gradient(135deg, #003380 0%, #1e40af 100%)' : '#e2e8f0',
              color: accepted ? '#fff' : '#94a3b8',
              fontSize: '16px',
              fontWeight: 800,
              cursor: accepted ? 'pointer' : 'not-allowed',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: accepted ? '0 10px 25px -5px rgba(0, 51, 128, 0.3)' : 'none',
              transform: accepted && !isSubmitting ? 'scale(1)' : 'scale(1)',
            }}
            onMouseOver={(e) => accepted && (e.currentTarget.style.transform = 'translateY(-2px)')}
            onMouseOut={(e) => accepted && (e.currentTarget.style.transform = 'translateY(0)')}
          >
            {isSubmitting ? 'Đang xử lý...' : 'Bắt đầu học ngay →'}
          </button>
        </div>
      </div>
    </div>
  );
}
