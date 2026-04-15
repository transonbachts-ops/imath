'use client';
import { useState, useEffect } from 'react';

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      setIsDark(true);
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDark ? 'dark' : 'light';
    setIsDark(!isDark);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
  };

  return (
    <button 
      onClick={toggleTheme}
      style={{
        background: 'rgba(255, 255, 255, 0.2)',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        color: 'inherit',
        width: 38,
        height: 38,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        fontSize: 18,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
        outline: 'none',
        WebkitTapHighlightColor: 'transparent'
      }}
      title={isDark ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
      onMouseOver={(e) => {
        e.currentTarget.style.transform = 'scale(1.1) rotate(15deg)';
        e.currentTarget.style.background = 'rgba(255,255,255,0.4)';
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.transform = 'scale(1) rotate(0)';
        e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
      }}
    >
      {isDark ? '☀️' : '🌙'}
    </button>
  );
}
