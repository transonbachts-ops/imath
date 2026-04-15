'use client';
import { useState, useRef, useEffect } from 'react';

export default function AnalyticsAI({ analytics }) {
  const [history, setHistory] = useState([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [model, setModel] = useState('gemini'); // gemini, openai, claude
  const [showModels, setShowModels] = useState(false);
  const chatEndRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, thinking]);

  const handleChat = async (e) => {
    if (e) e.preventDefault();
    if (!input.trim() || thinking) return;

    const userMsg = { role: 'user', content: input };
    setHistory(prev => [...prev, userMsg]);
    const currentInput = input;
    setInput('');
    setThinking(true);

    try {
      const res = await fetch('/api/admin/analytics/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: currentInput,
          analyticsSnapshot: analytics,
          history: history,
          bot: model
        })
      });
      const data = await res.json();
      if (data.reply) {
        setHistory(prev => [...prev, { role: 'model', content: data.reply, model: model }]);
      } else {
        alert(data.error || 'Lỗi kết nối AI');
      }
    } catch (err) {
      alert('Lỗi hệ thống AI');
    } finally {
      setThinking(false);
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
       {/* Mistakes Section (Enhanced) - Keep as is (Clean White) */}
       <div style={{ background: '#fff', borderRadius: '24px', padding: '35px', border: '1px solid #e2e8f0', marginBottom: '30px', boxShadow: '0 10px 40px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
             <h3 style={{ fontSize: '20px', fontWeight: '900', color: '#1e293b' }}>⚠️ Phân tích điểm yếu & Gợi ý sư phạm</h3>
             <span style={{ fontSize: '13px', color: '#94a3b8', background: '#f8fafc', padding: '5px 12px', borderRadius: '10px' }}>Sắp xếp theo tỉ lệ sai nhiều nhất</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '25px' }}>
            {analytics.mistakesAnalytics.map((m, i) => {
              const accentColor = m.category === 'Yêu' ? '#ef4444' : m.category === 'Trung bình' ? '#f59e0b' : '#10b981';
              return (
                <div key={i} style={{ 
                  padding: '28px', borderRadius: '22px', 
                  background: '#fff',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                  borderLeft: `6px solid ${accentColor}`,
                  transition: '0.3s all',
                  cursor: 'default',
                  position: 'relative',
                  overflow: 'hidden'
                }} onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.boxShadow = '0 12px 30px rgba(0,0,0,0.08)'; }} onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.03)'; }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
                     <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '11px', fontWeight: '900', color: accentColor, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>{m.category}</div>
                        <h4 style={{ fontWeight: '900', fontSize: '18px', color: '#1e293b', margin: 0 }}>{m.tag}</h4>
                     </div>
                     <div style={{ 
                        background: `${accentColor}15`, color: accentColor, padding: '6px 14px', borderRadius: '12px', fontSize: '13px', fontWeight: '900'
                     }}>{m.correctPercent}%</div>
                  </div>
                  
                  <div style={{ height: '10px', width: '100%', background: '#f1f5f9', borderRadius: '10px', marginBottom: '20px' }}>
                     <div style={{ width: `${m.correctPercent}%`, height: '100%', borderRadius: '10px', background: accentColor }} />
                  </div>

                  <p style={{ margin: 0, fontSize: '14px', color: '#475569', lineHeight: 1.7, fontWeight: '500' }}>
                     {m.advice}
                  </p>
                  
                  <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px border-dashed #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                     <span style={{ fontSize: '12px', color: '#94a3b8' }}>Dựa trên <b>{m.totalAttempts}</b> lượt trả lời</span>
                     <span style={{ fontSize: '18px' }}>{m.category === 'Yêu' ? '📉' : m.category === 'Trung bình' ? '⚖️' : '📈'}</span>
                  </div>
                </div>
              );
            })}
          </div>
       </div>

       {/* AI Chat Box - LIGHT HARMONIOUS THEME */}
       <div style={{ background: '#ffffff', borderRadius: '32px', padding: '35px', boxShadow: '0 20px 60px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div style={{ width: '45px', height: '45px', background: 'linear-gradient(45deg, #3b82f6, #8b5cf6)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>🤖</div>
                <div>
                   <h4 style={{ color: '#1e293b', fontSize: '20px', fontWeight: '900', margin: 0 }}>Cố vấn AI iMath</h4>
                   <span style={{ color: '#64748b', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase' }}>Ai của mọi nhà</span>
                </div>
             </div>
             
             {/* Model Selector (Light Mode) */}
             <div style={{ position: 'relative' }}>
                <button 
                  onClick={() => setShowModels(!showModels)}
                  style={{ background: '#f8fafc', color: '#334155', border: '1px solid #e2e8f0', padding: '10px 18px', borderRadius: '14px', fontSize: '12px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', transition: '0.2s' }}
                  onMouseOver={e => e.currentTarget.style.background = '#f1f5f9'}
                  onMouseOut={e => e.currentTarget.style.background = '#f8fafc'}
                >
                  <span style={{ color: '#3b82f6' }}>✨</span>
                  {model === 'gemini' ? 'Gemini 2.5' : model === 'openai' ? 'GPT (Llama)' : 'Claude 4.6'}
                  <span style={{ fontSize: '10px', opacity: 0.5 }}>{showModels ? '▲' : '▼'}</span>
                </button>
                {showModels && (
                  <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '10px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '18px', overflow: 'hidden', zIndex: 10, width: '200px', boxShadow: '0 15px 40px rgba(0,0,0,0.1)' }}>
                    <ModelBtn active={model === 'gemini'} onClick={() => { setModel('gemini'); setShowModels(false); }} text="Gemini 2.5 Flash" desc="Nhanh & Thông minh" />
                    <ModelBtn active={model === 'openai'} onClick={() => { setModel('openai'); setShowModels(false); }} text="OpenAI Llama 3.2" desc="Logic & Chặt chẽ" />
                    <ModelBtn active={model === 'claude'} onClick={() => { setModel('claude'); setShowModels(false); }} text="Claude 4.6 Sonnet" desc="Sáng tạo & Sư phạm" />
                  </div>
                )}
             </div>
          </div>

          <div style={{ background: '#f8fafc', borderRadius: '24px', overflow: 'hidden', border: '1px solid #f1f5f9' }}>
             {/* Messages View */}
             <div id="ai-chat-view" className="no-scrollbar" style={{ height: '480px', overflowY: 'auto', padding: '30px', display: 'flex', flexDirection: 'column', gap: '20px', scrollBehavior: 'smooth' }}>
                {history.length === 0 ? (
                   <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ width: '64px', height: '64px', background: '#ffffff', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', marginBottom: '25px', boxShadow: '0 8px 25px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>🎓</div>
                      <h3 style={{ color: '#1e293b', fontSize: '22px', fontWeight: '900', marginBottom: '10px' }}>Trung tâm Cố vấn iMath</h3>
                      <p style={{ color: '#64748b', fontSize: '15px', maxWidth: '400px', textAlign: 'center', lineHeight: 1.6 }}>Chào mừng bạn. Hãy đặt câu hỏi để nhận được những phân tích dữ liệu và lời khuyên dạy học chuyên sâu.</p>
                   </div>
                ) : (
                   history.map((msg, idx) => {
                      const isUser = msg.role === 'user';
                      return (
                        <div key={idx} style={{ 
                           alignSelf: isUser ? 'flex-end' : 'flex-start',
                           maxWidth: '85%',
                           display: 'flex',
                           flexDirection: 'column',
                           alignItems: isUser ? 'flex-end' : 'flex-start',
                           animation: 'fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
                        }}>
                           <div style={{ 
                              padding: '16px 22px', 
                              borderRadius: isUser ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                              background: isUser ? '#3b82f6' : '#ffffff',
                              color: isUser ? '#ffffff' : '#1e293b',
                              fontSize: '15px',
                              lineHeight: 1.6,
                              fontWeight: isUser ? '600' : '500',
                              boxShadow: '0 10px 25px rgba(0,0,0,0.05)',
                              border: isUser ? 'none' : '1px solid #e2e8f0'
                           }}>
                              <div style={{ whiteSpace: 'pre-wrap' }}>
                                 {msg.content}
                              </div>
                           </div>
                           <span style={{ fontSize: '10px', color: '#94a3b8', marginTop: '6px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                              {isUser ? 'Người dạy' : `AI (Mô hình ${msg.model || 'Gốc'})`}
                           </span>
                        </div>
                      );
                   })
                )}
                {thinking && (
                   <div style={{ alignSelf: 'flex-start', background: '#ffffff', color: '#1e293b', padding: '15px 25px', borderRadius: '20px 20px 20px 4px', fontSize: '14px', display: 'flex', gap: '15px', alignItems: 'center', fontWeight: '700', boxShadow: '0 8px 20px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0' }}>
                      <div className="dot-pulse" style={{ background: '#3b82f6' }}></div> 
                      <span style={{ color: '#94a3b8' }}>Đang phân tích dữ liệu...</span>
                   </div>
                )}
                <div ref={chatEndRef} />
             </div>

             {/* Premium Light Input Box */}
             <div style={{ padding: '25px', background: '#ffffff', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '15px' }}>
                <input 
                   value={input}
                   onChange={e => setInput(e.target.value)}
                   onKeyPress={e => e.key === 'Enter' && handleChat()}
                   placeholder="Nhắn tin để nhận lời khuyên ngay lập tức..." 
                   style={{ 
                      flex: 1, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', 
                      padding: '14px 22px', color: '#1e293b', outline: 'none', transition: '0.3s',
                      fontSize: '15px'
                   }}
                   onFocus={e => { e.target.style.borderColor = '#3b82f6'; e.target.style.background = '#ffffff'; }}
                   onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.background = '#f8fafc'; }}
                />
                <button 
                   onClick={handleChat}
                   disabled={thinking || !input.trim()}
                   style={{ 
                      background: '#3b82f6', color: '#ffffff', border: 'none', padding: '0 32px', 
                      borderRadius: '16px', fontWeight: '900', cursor: 'pointer', opacity: (thinking || !input.trim()) ? 0.5 : 1, 
                      transition: '0.3s', boxShadow: '0 6px 20px rgba(59, 130, 246, 0.2)'
                   }}
                   onMouseOver={e => { if(!thinking && input.trim()) e.currentTarget.style.transform = 'translateY(-2px)'; }}
                   onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
                >
                   {thinking ? '...' : 'GỬI'}
                </button>
             </div>
          </div>
       </div>

       <style jsx>{`
         .no-scrollbar::-webkit-scrollbar { display: none; }
         @keyframes fadeInUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
         .dot-pulse { width: 10px; height: 10px; border-radius: 5px; animation: pulse 1s infinite alternate; }
         @keyframes pulse { from { opacity: 0.4; } to { opacity: 1; } }
       `}</style>
    </div>
  );
}

const ModelBtn = ({ active, onClick, text, desc }) => (
  <button 
    onClick={onClick}
    style={{ 
      width: '100%', padding: '14px 18px', border: 'none', background: active ? '#f1f5f9' : 'transparent', 
      textAlign: 'left', cursor: 'pointer', transition: '0.2s', borderLeft: active ? '4px solid #3b82f6' : '4px solid transparent'
    }}
  >
    <div style={{ color: '#1e293b', fontWeight: '900', fontSize: '13px', marginBottom: '2px' }}>{active && '✓ '} {text}</div>
    <div style={{ color: '#94a3b8', fontSize: '11px' }}>{desc}</div>
  </button>
);
