import { Nunito } from 'next/font/google';
import './globals.css';
import ChatBubble from './components/ChatBubble';
import ThemeManager from './components/ThemeManager';
import Script from 'next/script';

const nunito = Nunito({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '600', '700', '800'],
  variable: '--font-nunito',
  display: 'swap',
});

export const metadata = {
  title: 'SmartEdu LMS',
  description: 'A modern, clean, and bright LMS for students',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning className={nunito.variable}>
      <head>
        <Script id="theme-loader" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: `
          (function() {
            try {
              const theme = localStorage.getItem('theme');
              const isExcluded = window.location.pathname === '/' || window.location.pathname.startsWith('/admin');
              if (theme === 'dark' && !isExcluded) {
                document.documentElement.setAttribute('data-theme', 'dark');
              }
            } catch (e) {}
          })();
        `}} />
      </head>
      <body className={nunito.className} suppressHydrationWarning>
        <ThemeManager />
        {children}
        <ChatBubble />
      </body>
    </html>
  );
}
