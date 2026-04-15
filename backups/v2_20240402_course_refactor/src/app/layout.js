import './globals.css';
import ChatBubble from './components/ChatBubble';
import ThemeManager from './components/ThemeManager';

export const metadata = {
  title: 'SmartEdu LMS',
  description: 'A modern, clean, and bright LMS for students',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
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
      <body>
        <ThemeManager />
        {children}
        <ChatBubble />
      </body>
    </html>
  );
}
