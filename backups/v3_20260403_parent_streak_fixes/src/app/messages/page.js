'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import UserMenu from '@/app/components/UserMenu';

export default function UnifiedMessengerPage() {
  const [user, setUser] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [activeContact, setActiveContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const scrollRef = useRef(null);
  const pollRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetch('/api/profile').then(r => r.json()).then(d => {
      if (d.user) setUser(d.user);
    });
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      const res = await fetch('/api/messages/contacts');
      if (res.ok) {
        const data = await res.json();
        setContacts(data.contacts || []);
      }
    } catch(e) {}
  };

  const fetchMessages = async (contact) => {
    if (!contact) return;
    try {
      // both endpoints accept student_id and other_user_id
      const res = await fetch(`/api/parent/messages?student_id=${contact.studentId}&course_id=${contact.courseId}&other_user_id=${contact.contactId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch(e) {}
  };

  useEffect(() => {
    if (activeContact) {
      fetchMessages(activeContact);
      pollRef.current = setInterval(() => fetchMessages(activeContact), 4000);
    }
    return () => clearInterval(pollRef.current);
  }, [activeContact]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleSend = async (content = '', attachment_url = null, attachment_type = null) => {
    if ((!content.trim() && !attachment_url) || loading || uploading || !activeContact) return;
    setSending(true);
    try {
      const res = await fetch('/api/parent/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiverId: activeContact.contactId, 
          studentId: activeContact.studentId, 
          courseId: activeContact.courseId, 
          content: content.trim(), 
          attachment_url, 
          attachment_type
        })
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, data.message]);
        setInput('');
      }
    } catch(e) {}
    setSending(false);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const isVideo = file.type.startsWith('video/');
    const MAX_SIZE = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024; 
    if (file.size > MAX_SIZE) {
      alert(`Dung lượng file quá lớn. Tối đa: ${isVideo ? '50MB' : '10MB'}`);
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/admin/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok) {
        await handleSend('', data.url, file.type);
      } else {
        alert(data.error || 'Lỗi tải lên file');
      }
    } catch(err) { alert('Không thể tải file.'); }
    
    setUploading(false);
    if(fileInputRef.current) fileInputRef.current.value = '';
  };

  // Determine back link target based on role
  const backHref = user?.role === 'parent' ? '/parent/dashboard' : '/teacher/dashboard';

  return (
    <div style={{fontFamily: 'Inter, system-ui, sans-serif', background: '#eef2f7', height: '100vh', display: 'flex', flexDirection: 'column'}}>
      {/* NAVBAR */}
      <nav style={{background: '#003380', color: '#fff', padding: '0 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 66, flexShrink: 0, zIndex: 100, boxShadow: '0 2px 10px rgba(0,0,0,0.1)'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 20}}>
          <span style={{fontSize: 24, fontWeight: 900, letterSpacing: -1, color: '#fff'}}>
            H2bmath<span style={{color: '#fff'}}>.</span>
          </span>
          <span style={{background: 'rgba(255,255,255,0.15)', fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 700}}>
            💬 SỔ LIÊN LẠC THÔNG MINH
          </span>
        </div>
        <div style={{display: 'flex', gap: 20, alignItems: 'center'}}>
           <Link href={backHref} style={{color: '#fff', textDecoration: 'none', fontSize: 13, fontWeight: 600}}>← Trở về Dashboard</Link>
           <UserMenu user={user} />
        </div>
      </nav>

      {/* 2-COLUMN LAYOUT */}
      <div style={{flex: 1, display: 'flex', maxWidth: 1400, margin: '0 auto', width: '100%', padding: '20px', minHeight: 0, gap: 20}}>
         
         {/* LEFT COLUMN: CONTACTS */}
         <div style={{width: 380, background: '#fff', borderRadius: 24, border: '1px solid #eef2f7', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 5px 25px rgba(0,51,128,0.03)'}}>
           <div style={{padding: '25px 25px 15px 25px', background: '#f8faff', borderBottom: '1px solid #eef2f7'}}>
              <h2 style={{fontSize: 20, fontWeight: 900, margin: 0, color: '#003380'}}>Danh Bạ</h2>
              <p style={{fontSize: 13, color: '#64748b', margin: '5px 0 0 0'}}>Lớp học quản lý & Liên hệ</p>
           </div>
           
           <div style={{flex: 1, overflowY: 'auto', padding: 15, display: 'flex', flexDirection: 'column', gap: 10}}>
             {contacts.length === 0 ? (
               <div style={{color: '#94a3b8', fontSize: 14, textAlign: 'center', marginTop: 40}}>Không tìm thấy liên hệ nào.</div>
             ) : (
               contacts.map((c, i) => {
                 const isActive = activeContact?.contactId === c.contactId && activeContact?.courseId === c.courseId;
                 return (
                   <button 
                     key={i} 
                     onClick={() => { setActiveContact(c); setMessages([]); }}
                     style={{
                       display: 'flex', alignItems: 'center', gap: 14, padding: '16px', background: isActive ? '#f0f7ff' : '#fff',
                       border: isActive ? '1px solid #c5e0ff' : '1px solid #f1f5f9', borderRadius: 16, cursor: 'pointer', textAlign: 'left',
                       transition: '0.2s', boxShadow: isActive ? '0 4px 15px rgba(0,51,128,0.05)' : 'none'
                     }}
                   >
                     <div style={{width: 46, height: 46, borderRadius: '50%', background: '#003380', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 20, overflow: 'hidden'}}>
                       {c.avatar ? <img src={c.avatar} style={{width: '100%', height: '100%', objectFit: 'cover'}} alt="A" /> : (c.role === 'teacher' ? '👨‍🏫' : '👤')}
                     </div>
                     <div style={{flex: 1, overflow: 'hidden'}}>
                       <div style={{fontSize: 15, fontWeight: 800, color: '#0f172a', marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{c.name}</div>
                       <div style={{fontSize: 12, color: isActive ? '#0284c7' : '#64748b', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
                         {c.role === 'teacher' ? `Lớp: ${c.courseTitle}` : `PH của bé: ${c.studentName}`}
                       </div>
                     </div>
                   </button>
                 );
               })
             )}
           </div>
         </div>

         {/* RIGHT COLUMN: CHAT INTERFACE */}
         <div style={{flex: 1, background: '#fff', borderRadius: 24, boxShadow: '0 5px 30px rgba(0,51,128,0.05)', display: 'flex', flexDirection: 'column', border: '1px solid #eef2f7', overflow: 'hidden'}}>
            {!activeContact ? (
               <div style={{flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', background: '#f8faff'}}>
                  <div style={{fontSize: 60, marginBottom: 20, opacity: 0.5}}>💬</div>
                  <h3 style={{fontSize: 20, color: '#003380', margin: '0 0 10px 0'}}>Sổ Liên Lạc & Trao Đổi Bằng Chứng</h3>
                  <p>Vui lòng chọn một liên hệ từ cột bên trái để bắt đầu nhắn tin.</p>
               </div>
            ) : (
              <>
                {/* CHAT HEADER */}
                <div style={{padding: '20px 30px', borderBottom: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', gap: 15, background: '#fff', boxShadow: '0 2px 10px rgba(0,0,0,0.02)', zIndex: 10}}>
                   <div style={{width: 50, height: 50, borderRadius: '50%', background: '#003380', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: '#fff', overflow: 'hidden'}}>
                     {activeContact.avatar ? <img src={activeContact.avatar} style={{width:'100%', height:'100%', objectFit:'cover'}} alt="A" /> : (activeContact.role==='teacher'?'👨‍🏫':'👤')}
                   </div>
                   <div>
                     <h2 style={{fontSize: 18, fontWeight: 900, color: '#003380', margin: 0}}>{activeContact.name}</h2>
                     <p style={{fontSize: 13, color: '#64748b', margin: '4px 0 0 0', fontWeight: 600}}>
                       {activeContact.role === 'parent' ? `Phụ huynh học sinh: ${activeContact.studentName}` : `Môn học: ${activeContact.courseTitle}`}
                     </p>
                   </div>
                </div>

                {/* MESSAGES LIST */}
                <div ref={scrollRef} style={{flex: 1, overflowY: 'auto', padding: '30px', background: '#e2e8f0', backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M54.627 0l.83.83-54.627 54.627-.83-.83L54.627 0zm-51.52.83l.83-.83-3.107-3.107-.83.83 3.107 3.107zM.83 51.52l-.83-.83 3.107-3.107.83.83-3.107 3.107z' fill='%2394a3b8' fill-opacity='0.05' fill-rule='evenodd'/%3E%3C/svg%3E")`, display: 'flex', flexDirection: 'column', gap: 15}}>
                   {messages.length === 0 ? (
                     <div style={{textAlign: 'center', margin: 'auto', color: '#64748b', fontSize: 15, background: 'rgba(255,255,255,0.5)', padding: '10px 20px', borderRadius: 20}}>Bắt đầu cuộc trò chuyện...</div>
                   ) : messages.map((m, i) => {
                     const isMe = m.sender_id === user?.id; // strict validation mapping to JWT state ID
                     return (
                       <div key={i} style={{alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '75%'}}>
                         {!isMe && <div style={{fontSize: 12, color: '#64748b', marginBottom: 5, paddingLeft: 10, fontWeight: 600}}>{m.sender_name}</div>}
                         <div style={{
                           padding: '14px 20px', background: isMe ? 'linear-gradient(135deg, #007aff, #0056b3)' : '#fff',
                           color: isMe ? '#ffffff' : '#1e293b', borderRadius: isMe ? '24px 24px 4px 24px' : '24px 24px 24px 4px',
                           boxShadow: '0 4px 15px rgba(0,0,0,0.05)', fontSize: 15, lineHeight: 1.5,
                           border: isMe ? 'none' : '1px solid #eef2f7'
                         }}>
                           {m.content && <div style={{color: isMe ? '#ffffff' : '#1e293b'}}>{m.content}</div>}
                           {m.attachment_url && m.attachment_type?.startsWith('image/') && (
                             <div style={{marginTop: m.content ? 12 : 0}}>
                               <a href={m.attachment_url} target="_blank" rel="noreferrer"><img src={m.attachment_url} style={{maxWidth: '100%', borderRadius: 12, cursor: 'pointer', maxHeight: 350, display: 'block'}} alt="attachment" /></a>
                             </div>
                           )}
                           {m.attachment_url && m.attachment_type?.startsWith('video/') && (
                             <div style={{marginTop: m.content ? 12 : 0}}>
                               <video src={m.attachment_url} controls style={{maxWidth: '100%', borderRadius: 12, maxHeight: 350, display: 'block'}}></video>
                             </div>
                           )}
                           {m.attachment_url && !m.attachment_type?.startsWith('image/') && !m.attachment_type?.startsWith('video/') && (
                             <div style={{marginTop: m.content ? 12 : 0}}>
                               <a href={m.attachment_url} target="_blank" rel="noreferrer" style={{color: isMe ? '#ffffff' : '#1a56db', fontWeight: 'bold', textDecoration: 'underline'}}>📎 Tải xuống tệp đính kèm</a>
                             </div>
                           )}
                         </div>
                         <div style={{fontSize: 11, color: '#94a3b8', marginTop: 6, textAlign: isMe ? 'right' : 'left', padding: '0 10px'}}>
                           {new Date(m.created_at).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'})}
                         </div>
                       </div>
                     );
                   })}
                   {uploading && (
                     <div style={{alignSelf: 'flex-end', background: '#e0e7ff', padding: '10px 20px', borderRadius: 20, fontSize: 13, color: '#3730a3', fontWeight: 600}}>
                       ⏳ Đang tải tệp lên...
                     </div>
                   )}
                </div>

                {/* INPUT AREA */}
                <div style={{padding: '20px 30px', background: '#fff', borderTop: '1px solid #eef2f7', display: 'flex', gap: 15, alignItems: 'center'}}>
                   
                   <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*,video/*" style={{display: 'none'}} />
                   <button 
                     onClick={() => fileInputRef.current?.click()}
                     disabled={uploading}
                     style={{width: 48, height: 48, borderRadius: '50%', background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', fontSize: 22, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '0.2s', flexShrink: 0}}
                     title="Gửi Ảnh / Video"
                   >
                     📎
                   </button>

                   <input 
                     value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend(input)}
                     placeholder="Viết tin nhắn..."
                     style={{flex: 1, padding: '16px 24px', borderRadius: 30, border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: 15, outline: 'none', transition: '0.2s'}}
                   />
                   
                   <button 
                     onClick={() => handleSend(input)}
                     disabled={loading || uploading || !input.trim()}
                     style={{width: 48, height: 48, borderRadius: '50%', background: input.trim() ? '#003380' : '#cbd5e1', color: '#fff', border: 'none', fontSize: 18, cursor: input.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '0.2s', flexShrink: 0, boxShadow: input.trim() ? '0 5px 15px rgba(0,51,128,0.2)' : 'none'}}
                   >
                     ➤
                   </button>
                </div>
              </>
            )}
         </div>
      </div>
    </div>
  );
}
