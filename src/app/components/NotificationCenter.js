'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

export default function NotificationCenter({ userId }) {
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownRef]);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch (e) {
      console.error('Failed to fetch notifications', e);
    }
  };

  const markAsRead = async (id) => {
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      setNotifications(notifications.filter(n => n.id !== id));
    } catch (e) {
      console.error('Failed to mark as read', e);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllAsRead: true })
      });
      setNotifications([]);
    } catch (e) {
      console.error('Failed to mark all as read', e);
    }
  };

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      <button 
        onClick={() => setShowDropdown(!showDropdown)}
        style={{
          background: 'none',
          border: 'none',
          fontSize: 20,
          cursor: 'pointer',
          position: 'relative',
          padding: 5,
          color: '#555'
        }}
        title="Thông báo"
      >
        🔔
        {notifications.length > 0 && (
          <span style={{
            position: 'absolute',
            top: 0,
            right: 0,
            background: '#ff4d4d',
            color: 'white',
            borderRadius: '50%',
            width: 18,
            height: 18,
            fontSize: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
            border: '2px solid #fff'
          }}>
            {notifications.length}
          </span>
        )}
      </button>

      {showDropdown && (
        <div style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          width: 350,
          background: '#fff',
          borderRadius: 12,
          boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
          marginTop: 15,
          zIndex: 100,
          overflow: 'hidden',
          border: '1px solid #eee'
        }}>
          <div style={{
            padding: '15px 20px',
            borderBottom: '1px solid #eee',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#f8f9fa'
          }}>
            <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#333' }}>Thông báo</h4>
            {notifications.length > 0 && (
              <button 
                onClick={markAllAsRead}
                style={{ background: 'none', border: 'none', color: '#003380', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}
              >
                Đánh dấu tất cả đã đọc
              </button>
            )}
          </div>
          
          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#888', fontSize: 13 }}>
                <div style={{ fontSize: 30, marginBottom: 10 }}>📭</div>
                Bạn không có thông báo mới nào.
              </div>
            ) : (
              notifications.map(n => (
                <div key={n.id} style={{
                  padding: '15px 20px',
                  borderBottom: '1px solid #f5f5f5',
                  transition: '0.2s',
                  cursor: 'pointer',
                  position: 'relative'
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                >
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#333', marginBottom: 4, display: 'flex', gap: 5, alignItems: 'center' }}>
                    {n.type === 'assignment_deadline' ? '⚠️' : 'ℹ️'} {n.title}
                  </div>
                  <div style={{ fontSize: 13, color: '#666', lineHeight: 1.5 }}>{n.message}</div>
                  <div style={{ fontSize: 11, color: '#aaa', marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{new Date(n.created_at).toLocaleString('vi-VN')}</span>
                    <button 
                      onClick={(e) => { e.stopPropagation(); markAsRead(n.id); }}
                      style={{ background: '#f0f0f0', border: 'none', borderRadius: 4, padding: '2px 8px', fontSize: 10, cursor: 'pointer' }}
                    >
                      Đã đọc
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
          
          <div style={{ padding: 12, textAlign: 'center', borderTop: '1px solid #eee', background: '#f8f9fa' }}>
             <Link href="/notifications" style={{ fontSize: 12, color: '#003380', textDecoration: 'none', fontWeight: 700 }}>Xem tất cả thông báo</Link>
          </div>
        </div>
      )}
    </div>
  );
}
