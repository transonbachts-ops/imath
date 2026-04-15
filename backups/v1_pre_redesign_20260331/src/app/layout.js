import './globals.css';

export const metadata = {
  title: 'SmartEdu LMS',
  description: 'A modern, clean, and bright LMS for students',
};

import ChatBubble from './components/ChatBubble';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <ChatBubble />
      </body>
    </html>
  );
}
