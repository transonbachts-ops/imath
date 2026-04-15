'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function ThemeManager() {
  const pathname = usePathname();

  useEffect(() => {
    const isLanding = pathname === '/';
    const isAdmin = pathname.startsWith('/admin');

    if (isLanding || isAdmin) {
      // Force light mode on landing page and admin pages
      document.documentElement.removeAttribute('data-theme');
    } else {
      // Re-apply saved theme on other pages
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.removeAttribute('data-theme');
      }
    }
  }, [pathname]);

  return null;
}
