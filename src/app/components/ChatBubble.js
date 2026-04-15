'use client';
import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

export default function ChatBubble() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [hasAccess, setHasAccess] = useState(null); // null = loading, false = no access, true = access
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  const [canUseAi, setCanUseAi] = useState(false);
  const [selectedBot, setSelectedBot] = useState('openai'); // Default to Llama (openai)
  const [showBotMenu, setShowBotMenu] = useState(false);
  const menuRef = useRef(null);

  // Check access on mount
  useEffect(() => {
    async function checkAccess() {
      try {
        const res = await fetch(`/api/chat?t=${Date.now()}`, {
          method: 'GET',
          cache: 'no-store',
          credentials: 'include',
          headers: { 'Cache-Control': 'no-cache' }
        });
        const data = await res.json();
        console.log('Chat Access Data:', data);
        setHasAccess(data.hasAccess);
        setCanUseAi(!!data.canUseAi);
      } catch (err) {
        console.error('Chat Access Error:', err);
        setHasAccess(false);
      }
    }
    checkAccess();
  }, [pathname]);

  // Track global study time
  useEffect(() => {
    if (hasAccess === false || hasAccess === null) return;

    // Ping every 60 seconds (1 minute of study time)
    const interval = setInterval(() => {
      fetch('/api/track-time', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ increment: 1 })
      }).catch(err => console.error("Heartbeat error", err));
    }, 60000); // 60 seconds

    return () => clearInterval(interval);
  }, [hasAccess]);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowBotMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuRef]);

  // Set initial greeting
  useEffect(() => {
    if (hasAccess && messages.length === 0) {
      if (canUseAi) {
        setMessages([{ role: 'model', text: 'Chào bạn! Tôi là iMath AI. Tôi có thể giúp gì cho bạn hôm nay?' }]);
      } else {
        setMessages([{ role: 'model', text: 'Bạn đã đăng nhập hệ thống, nhưng hiện tại chức năng AI đang bị khóa với tài khoản của bạn. Vui lòng liên hệ bộ phận hỗ trợ hoặc Admin để xin cấp quyền sử dụng iMath AI.' }]);
      }
    }
  }, [hasAccess, canUseAi, messages]);

  // Scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMsg = { role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // Build history for API (last 6 messages to save context limit, excluding the first system prompt)
      const history = messages.slice(-6);

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg.text,
          history,
          bot: selectedBot
        })
      });

      const data = await res.json();

      if (res.ok) {
        setMessages(prev => [...prev, { role: 'model', text: data.reply }]);
      } else {
        setMessages(prev => [...prev, { role: 'model', text: data.error || 'Đã có lỗi xảy ra.' }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: 'model', text: 'Lỗi kết nối đến máy chủ.' }]);
    } finally {
      setLoading(false);
    }
  };

  // Only render if user has access
  if (!hasAccess) return null;

  return (
    <>
      {/* CHAT BUBBLE TRIGGER */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed', bottom: 30, right: 30, width: 60, height: 60, borderRadius: '50%',
          background: 'linear-gradient(135deg, #003380, #1a56db)', color: '#fff', fontSize: 24,
          border: 'none', cursor: 'pointer', boxShadow: '0 8px 25px rgba(0,51,128,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
          transition: 'transform 0.3s'
        }}
      >
        {isOpen ? '✕' : '✨'}
      </button>

      {/* CHAT WINDOW */}
      {isOpen && (
        <div style={{
          position: 'fixed', bottom: 100, right: 30, width: 350, height: 500, background: 'var(--card-bg)',
          borderRadius: 20, boxShadow: 'var(--glass-shadow)', zIndex: 9998,
          display: 'flex', flexDirection: 'column', border: '1px solid var(--border-muted)', overflow: 'hidden',
          backdropFilter: 'blur(20px)'
        }}>
          {/* HEADER */}
          <div style={{
            background: 'linear-gradient(135deg, #003380, #1a56db)', padding: '15px 20px', color: '#ffffff',
            display: 'flex', alignItems: 'center', gap: 10
          }}>
            <div style={{ width: 35, height: 35, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>🤖</div>
            <div style={{ color: '#ffffff' }}>
              <div style={{ fontWeight: 900, fontSize: 18, color: '#ffffff', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>iMath AI</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#ffffff', opacity: 1 }}>Trợ lý học tập thông minh</div>
            </div>
          </div>

          {/* MESSAGES */}
          <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 15, background: 'rgba(0,0,0,0.02)' }}>
            {messages.map((m, i) => (
              <div key={i} style={{
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '85%', padding: '10px 15px',
                background: m.role === 'user' ? 'var(--primary)' : 'var(--card-bg)',
                color: m.role === 'user' ? '#fff' : 'var(--text-primary)',
                borderRadius: m.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                border: m.role === 'user' ? 'none' : '1px solid var(--border-muted)',
                fontSize: 14, lineHeight: 1.5, boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
              }}>
                {m.role === 'model' ? (
                  <div className="markdown-body" style={{ fontSize: 14 }} dangerouslySetInnerHTML={{
                    __html:
                      m.text
                        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                        .replace(/\n\* (.*?)(?=\n|$)/g, '<li>$1</li>')
                        .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
                        .replace(/\n\n/g, '<br/><br/>')
                        .replace(/\n/g, '<br/>')
                  }}></div>
                ) : (
                  m.text
                )}
              </div>
            ))}
            {loading && (
              <div style={{ alignSelf: 'flex-start', background: 'var(--card-bg)', padding: '10px 15px', borderRadius: '18px 18px 18px 4px', border: '1px solid var(--border-muted)', fontSize: 13, color: 'var(--text-secondary)' }}>
                Đang suy nghĩ...
              </div>
            )}
          </div>

          {/* BOT SELECTOR MENU */}
          <div style={{
            padding: '10px 15px',
            background: 'var(--card-bg)',
            borderTop: '1px solid var(--border-muted)',
            position: 'relative',
            zIndex: 10
          }}>
            <div
              onClick={() => setShowBotMenu(!showBotMenu)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '6px 15px', borderRadius: 12,
                fontSize: 13, fontWeight: 700, cursor: 'pointer',
                background: 'rgba(0,0,0,0.04)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-muted)',
                width: 'fit-content',
                transition: '0.2s',
                userSelect: 'none'
              }}
            >
              {selectedBot === 'gemini' && <><span>✨</span> Gemini</>}
              {selectedBot === 'openai' && <><span>🤖</span> Llama 3.2</>}
              {selectedBot === 'claude' && <><span>🎭</span> Claude 3.5</>}
              <span style={{ fontSize: 10, opacity: 0.5 }}>{showBotMenu ? '▲' : '▼'}</span>
            </div>

            {showBotMenu && (
              <div ref={menuRef} style={{
                position: 'absolute', bottom: '100%', left: 15, marginBottom: 10,
                width: 220, background: 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(15px)', borderRadius: 16,
                boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                padding: 8, display: 'flex', flexDirection: 'column', gap: 4,
                animation: 'slideUp 0.2s ease-out'
              }}>
                <div style={{ padding: '5px 10px', fontSize: 11, fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }}>Chọn Trí Tuệ Nhân Tạo</div>

                {[
                  { id: 'gemini', name: 'Gemini', icon: '✨', desc: 'Google - Auto' },
                  { id: 'openai', name: 'Llama 3.2', icon: '🤖', desc: 'Meta - Chậm' },
                  { id: 'claude', name: 'Claude 3.5', icon: '🎭', desc: 'Anthropic - Chậm nhưng thông minh' }
                ].map(bot => (
                  <div
                    key={bot.id}
                    onClick={() => { setSelectedBot(bot.id); setShowBotMenu(false); }}
                    style={{
                      padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 12,
                      background: selectedBot === bot.id ? 'rgba(26, 86, 219, 0.08)' : 'transparent',
                      transition: '0.2s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.04)'}
                    onMouseLeave={e => e.currentTarget.style.background = selectedBot === bot.id ? 'rgba(26, 86, 219, 0.08)' : 'transparent'}
                  >
                    <div style={{ fontSize: 18 }}>{bot.icon}</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: selectedBot === bot.id ? '#1a56db' : 'var(--text-primary)' }}>{bot.name}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>{bot.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <style dangerouslySetInnerHTML={{
            __html: `
            @keyframes slideUp {
              from { opacity: 0; transform: translateY(10px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}} />

          {/* INPUT AREA */}
          <div style={{ padding: '12px 15px', background: 'var(--card-bg)', borderTop: '1px solid var(--border-muted)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <input
              type="text"
              placeholder="Nhập câu hỏi của bạn..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              style={{ flex: 1, padding: '10px 15px', borderRadius: 20, border: '1px solid var(--border-muted)', outline: 'none', background: 'rgba(0,0,0,0.05)', fontSize: 14, color: 'var(--text-primary)' }}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              style={{ background: '#1a56db', color: '#fff', width: 40, height: 40, borderRadius: '50%', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', opacity: (loading || !input.trim()) ? 0.5 : 1 }}
            >
              ➤
            </button>
          </div>
        </div>
      )}

      {/* ADD SOME STYLES FOR MARKDOWN */}
      <style dangerouslySetInnerHTML={{
        __html: `
        .markdown-body p { margin-bottom: 8px; margin-top: 0; }
        .markdown-body p:last-child { margin-bottom: 0; }
        .markdown-body strong { font-weight: bold; color: inherit; }
        .markdown-body ul { padding-left: 20px; margin-bottom: 8px; }
        .markdown-body li { margin-bottom: 4px; }
        .markdown-body table { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 13px; }
        .markdown-body th, .markdown-body td { border: 1px solid var(--border-muted); padding: 6px; }
        .markdown-body th { background: rgba(0,0,0,0.05); }
      `}} />
    </>
  );
}
