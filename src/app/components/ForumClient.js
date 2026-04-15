'use client';
import { useState, useEffect } from 'react';

export default function ForumClient({ id, actId, moduleId, userRole, userName }) {
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [showReplies, setShowReplies] = useState({}); // { threadId: boolean }
  const [replies, setReplies] = useState({}); // { threadId: [] }
  const [replyInputs, setReplyInputs] = useState({}); // { threadId: string }

  useEffect(() => {
    fetchThreads();
  }, [actId, moduleId]);

  const fetchThreads = async () => {
    setLoading(true);
    try {
      const url = actId ? `/api/forum?activityId=${actId}` : `/api/forum?moduleId=${moduleId}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setThreads(data.threads || []);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handlePostThread = async () => {
    if (!newContent) return alert('Vui lòng nhập nội dung câu hỏi!');
    try {
      const res = await fetch('/api/forum', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          activity_id: actId || null, 
          module_id: moduleId || null, 
          title: newTitle, 
          content: newContent 
        })
      });
      if (res.ok) {
        setNewTitle('');
        setNewContent('');
        fetchThreads();
      } else {
        const errData = await res.json();
        alert('Lỗi: ' + (errData.error || 'Không thể đăng câu hỏi.'));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const toggleReplies = async (threadId) => {
    const isShowing = !!showReplies[threadId];
    setShowReplies({ ...showReplies, [threadId]: !isShowing });
    if (!isShowing) {
      fetchReplies(threadId);
    }
  };

  const fetchReplies = async (threadId) => {
    try {
      const res = await fetch(`/api/forum/${threadId}`);
      if (res.ok) {
        const data = await res.json();
        setReplies({ ...replies, [threadId]: data.replies || [] });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handlePostReply = async (threadId) => {
    const content = replyInputs[threadId];
    if (!content) return;
    try {
      const res = await fetch(`/api/forum/${threadId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });
      if (res.ok) {
        setReplyInputs({ ...replyInputs, [threadId]: '' });
        fetchReplies(threadId);
        setThreads(threads.map(t => t.id === threadId ? { ...t, reply_count: (t.reply_count || 0) + 1 } : t));
      } else {
        const errData = await res.json();
        alert('Lỗi: ' + (errData.error || 'Không thể gửi phản hồi.'));
      }
    } catch (e) {
      console.error(e);
      alert('Lỗi kết nối khi gửi phản hồi.');
    }
  };

  const toggleStatus = async (threadId, currentStatus) => {
    if (!confirm(currentStatus ? 'Bạn có muốn mở lại thảo luận này?' : 'Bạn có muốn đóng thảo luận này? Khi đóng, mọi người sẽ không thể bình luận thêm.')) return;
    try {
      const res = await fetch('/api/forum', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threadId, is_closed: !currentStatus })
      });
      if (res.ok) {
        setThreads(threads.map(t => t.id === threadId ? { ...t, is_closed: !currentStatus } : t));
      } else {
        const err = await res.json();
        alert('Lỗi: ' + err.error);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const [showNewForm, setShowNewForm] = useState(false);

  return (
    <div>
      <div id="forumHeader" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', borderBottom: '1px solid #e1e4e8', paddingBottom: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ background: '#2cbe4e', color: '#fff', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>Open</span>
            <b style={{ color: '#586069' }}>{threads.length} thảo luận</b>
        </div>
        <button 
           onClick={() => setShowNewForm(!showNewForm)}
           style={{ background: '#2ea44f', color: '#fff', border: '1px solid rgba(27,31,35,.15)', padding: '6px 16px', borderRadius: '6px', fontWeight: '600', fontSize: '14px', cursor: 'pointer', boxShadow: '0 1px 0 rgba(27,31,35,.1)' }}
        >
           {showNewForm ? '✕ Hủy bỏ' : '🟢 Nội dung mới'}
        </button>
      </div>

      {showNewForm && (
        <div style={{ background: '#f6f8fa', padding: '20px', borderRadius: '8px', marginBottom: '30px', border: '1px solid #d1d5da' }}>
          <input 
            type="text" 
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Tiêu đề thảo luận..." 
            style={{ ...inputBaseStyle, marginBottom: '12px', border: '1px solid #d1d5da' }}
          />
          <textarea 
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="Nội dung chi tiết..." 
            style={{ ...inputBaseStyle, height: '120px', marginBottom: '15px', border: '1px solid #d1d5da' }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={handlePostThread} style={{ background: '#2ea44f', color: '#fff', border: 'none', padding: '8px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Gửi thảo luận</button>
          </div>
        </div>
      )}

      <div id="threadsList" style={{ border: '1px solid #e1e4e8', borderRadius: '6px', overflow: 'hidden', background: '#fff' }}>
        {loading ? (
             <div style={{ textAlign: 'center', padding: '60px', color: '#586069' }}>🔄 Đang tải...</div>
        ) : threads.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px', color: '#586069' }}>
             <div style={{ fontSize: '40px', marginBottom: '20px' }}>💬</div>
             <h3>Chào mừng bạn đến với mục thảo luận!</h3>
             <p>Hãy nhấn vào "Nội dung mới" để bắt đầu đặt câu hỏi.</p>
          </div>
        ) : (
          threads.map(t => {
            const isTeacher = userRole?.toLowerCase() === 'teacher' || userRole?.toLowerCase() === 'admin';
            const isAuthor = t.author_name === userName; // Simplified author check
            const canClose = isTeacher || isAuthor;

            return (
              <div key={t.id} style={{ borderBottom: '1px solid #e1e4e8', padding: '16px', transition: 'background 0.1s', background: t.is_closed ? '#fafbfc' : '#fff' }} className="thread-row">
                <div style={{ display: 'flex', gap: '15px' }}>
                  <span style={{ color: t.is_closed ? '#d1d5da' : '#22863a', fontSize: '18px' }}>{t.is_closed ? '⊘' : '⊙'}</span>
                  <div style={{ flex: 1 }}>
                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <button 
                                onClick={() => toggleReplies(t.id)}
                                style={{ background: 'none', border: 'none', padding: 0, textAlign: 'left', fontWeight: 'bold', fontSize: '16px', color: t.is_closed ? '#586069' : '#0366d6', cursor: 'pointer' }}
                            >
                                {t.title}
                            </button>
                            {t.is_closed && <span style={{ background: '#f1f8ff', color: '#0366d6', fontSize: '10px', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold', border: '1px solid #c8e1ff' }}>ĐÃ ĐÓNG</span>}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {canClose && (
                                <button 
                                    onClick={() => toggleStatus(t.id, t.is_closed)}
                                    style={{ background: 'none', border: 'none', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', color: t.is_closed ? '#28a745' : '#cb2431', cursor: 'pointer', fontWeight: 'bold', border: `1px solid ${t.is_closed ? '#28a745' : '#cb2431'}` }}
                                >
                                    {t.is_closed ? '🔓 Mở lại' : '🔒 Khóa'}
                                </button>
                            )}
                            <span style={{ fontSize: '12px', color: '#586069' }}>#{t.id}</span>
                        </div>
                     </div>
                     <div style={{ fontSize: '12px', color: '#586069', marginTop: '4px' }}>
                        được đăng {new Date(t.created_at).toLocaleDateString('vi-VN')} bởi 
                        <b style={{ color: '#24292e', margin: '0 4px' }}>{t.author_name}</b>
                        {t.author_role === 'teacher' && <span style={{ border: '1px solid #0366d6', color: '#0366d6', fontSize: '10px', padding: '0 5px', borderRadius: '10px', marginLeft: '5px' }}>Giáo viên</span>}
                     </div>

                     {showReplies[t.id] && (
                       <div style={{ marginTop: '20px', background: '#f6f8fa', borderRadius: '8px', padding: '20px', border: '1px solid #d1d5da' }}>
                          <div style={{ marginBottom: '20px', paddingBottom: '15px', borderBottom: '1px solid #e1e4e8', whiteSpace: 'pre-wrap', color: '#24292e' }}>
                             {t.content}
                          </div>
                          
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                             {(replies[t.id] || []).map(r => (
                               <div key={r.id} style={{ display: 'flex', gap: '12px' }}>
                                 <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: r.author_role === 'teacher' ? '#0366d6' : '#28a745', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold' }}>
                                    {r.author_name.charAt(0)}
                                 </div>
                                 <div style={{ flex: 1, border: '1px solid #d1d5da', borderRadius: '6px', background: '#fff' }}>
                                    <div style={{ padding: '8px 12px', background: r.author_role === 'teacher' ? '#f1f8ff' : '#f6f8fa', borderBottom: '1px solid #d1d5da', borderTopLeftRadius: '6px', borderTopRightRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                       <div style={{ fontSize: '12px' }}>
                                          <b>{r.author_name}</b> {r.author_role === 'teacher' ? <span style={{ color: '#0366d6', fontWeight: 'bold' }}>(Giáo viên)</span> : ''} 
                                          <span style={{ color: '#586069', marginLeft: '8px' }}>đã phản hồi</span>
                                       </div>
                                       <span style={{ fontSize: '11px', color: '#586069' }}>{new Date(r.created_at).toLocaleTimeString('vi-VN')}</span>
                                    </div>
                                    <div style={{ padding: '12px', fontSize: '14px', color: '#24292e' }}>{r.content}</div>
                                 </div>
                               </div>
                             ))}
                          </div>

                          {!t.is_closed ? (
                            <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                               <input 
                                  type="text" 
                                  value={replyInputs[t.id] || ''}
                                  onChange={(e) => setReplyInputs({ ...replyInputs, [t.id]: e.target.value })}
                                  placeholder="Viết phản hồi của bạn..." 
                                  style={{ flex: 1, padding: '8px 12px', border: '1px solid #d1d5da', borderRadius: '6px' }} 
                               />
                               <button onClick={() => handlePostReply(t.id)} style={{ background: '#2ea44f', color: '#fff', border: 'none', padding: '8px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Gửi</button>
                            </div>
                          ) : (
                            <div style={{ marginTop: '20px', background: '#fff9db', border: '1px solid #ffe066', padding: '12px', borderRadius: '6px', color: '#856404', fontSize: '13px', textAlign: 'center', fontWeight: 'bold' }}>
                               🛈 Thảo luận này đã bị khóa. Bạn không thể thêm phản hồi mới.
                            </div>
                          )}
                       </div>
                     )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#586069' }}>
                     <span>💬</span> {t.reply_count}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

const inputBaseStyle = {
    width: '100%',
    padding: '12px 16px',
    borderRadius: '10px',
    border: '1px solid #cbd5e1',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s',
    background: '#fff'
};

const primaryBtnStyle = {
    background: '#003380',
    color: '#fff',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '10px',
    fontWeight: 'bold',
    cursor: 'pointer',
    fontSize: '14px',
    boxShadow: '0 4px 12px rgba(0, 51, 128, 0.2)'
};
