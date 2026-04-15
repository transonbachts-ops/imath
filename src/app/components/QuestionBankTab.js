'use client';
import { useState, useEffect } from 'react';

export default function QuestionBankTab() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterGrade, setFilterGrade] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({ id: null, grade: '10', question_text: '', options_json: { A: '', B: '', C: '', D: '' }, correct_answer: 'A', tags: '', hint: '', image_url: '', video_url: '' });

  useEffect(() => {
    fetchQuestions();
  }, [filterGrade]);

  // MathJax injection for Question Bank
  useEffect(() => {
    if (!document.getElementById('mathjax-config')) {
      const configScript = document.createElement('script');
      configScript.id = 'mathjax-config';
      configScript.type = 'text/javascript';
      configScript.innerHTML = `
        window.MathJax = {
          tex: { inlineMath: [['$','$'], ['\\\\(','\\\\)']], displayMath: [['$$','$$'], ['\\\\[','\\\\]']] },
          svg: { fontCache: 'global' },
          startup: { typeset: false }
        };
      `;
      document.head.appendChild(configScript);
    }
    if (!document.getElementById('mathjax-script')) {
      const script = document.createElement('script');
      script.id = 'mathjax-script';
      script.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js';
      script.async = true;
      document.head.appendChild(script);
    }
  }, []);

  useEffect(() => {
     const timer = setTimeout(() => {
        if (window.MathJax && window.MathJax.typesetPromise) {
           window.MathJax.typesetPromise().catch(e => console.log(e.message));
        }
     }, 300);
     return () => clearTimeout(timer);
  }, [questions, form]);

  const fetchQuestions = async () => {
    setLoading(true);
    let url = '/api/admin/question-bank';
    if (filterGrade) url += `?grade=${filterGrade}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      setQuestions(data.questions || []);
    }
    setLoading(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const isNew = !form.id;
    const url = '/api/admin/question-bank';
    const method = isNew ? 'POST' : 'PUT';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });

    if (res.ok) {
      setIsEditing(false);
      setForm({ id: null, grade: '10', question_text: '', options_json: { A: '', B: '', C: '', D: '' }, correct_answer: 'A', tags: '', hint: '', image_url: '', video_url: '' });
      fetchQuestions();
    } else {
      alert('Lỗi khi lưu!');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Xóa câu hỏi này khỏi ngân hàng?')) return;
    const res = await fetch('/api/admin/question-bank', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    if (res.ok) fetchQuestions();
  };

  const handleUploadImage = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/admin/upload', { method: 'POST', body: formData });
    const data = await res.json();
    if (res.ok) setForm({ ...form, image_url: data.url });
    else alert(data.error);
  };

  return (
    <div style={{background: '#fff', borderRadius: 16, padding: 30, boxShadow: '0 5px 20px rgba(0,0,0,0.04)'}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25}}>
        <h3 style={{fontSize: 22, color: '#333'}}>📚 Ngân Hàng Câu Hỏi Tổng Hợp</h3>
        <button 
          onClick={() => { setIsEditing(true); setForm({ id: null, grade: filterGrade || '10', question_text: '', options_json: { A: '', B: '', C: '', D: '' }, correct_answer: 'A', tags: '', hint: '', image_url: '', video_url: '' }); }} 
          style={{background:'#e67e22',color:'#fff',border:'none',padding:'10px 20px',borderRadius:8,fontWeight:'bold',cursor:'pointer'}}
        >
          + Thêm Câu Hỏi
        </button>
      </div>

      {!isEditing && (
        <div style={{marginBottom: 20}}>
          <label style={{fontWeight: 'bold', marginRight: 10}}>Lọc theo khối:</label>
          <select value={filterGrade} onChange={e => setFilterGrade(e.target.value)} style={{padding: '8px 15px', borderRadius: 6, border: '1px solid #ddd'}}>
            <option value="">Tất cả</option>
            <option value="9">Lớp 9</option>
            <option value="10">Lớp 10</option>
            <option value="11">Lớp 11</option>
            <option value="12">Lớp 12</option>
          </select>
        </div>
      )}

      {isEditing ? (
        <form onSubmit={handleSave} style={{background: '#fff9f0', border: '1px solid #f39c12', padding: 25, borderRadius: 12, marginBottom: 30}}>
          <h4 style={{marginBottom: 20, color: '#e67e22'}}>{form.id ? 'Sửa Câu Hỏi' : 'Thêm Câu Hỏi Mới'}</h4>
          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15, marginBottom: 15}}>
            <div>
              <label style={{display: 'block', fontWeight: 'bold', marginBottom: 5}}>Khối Lớp</label>
              <select value={form.grade} onChange={e => setForm({...form, grade: e.target.value})} style={{width: '100%', padding: 10, borderRadius: 6, border: '1px solid #ccc'}}>
                <option value="9">Lớp 9</option>
                <option value="10">Lớp 10</option>
                <option value="11">Lớp 11</option>
                <option value="12">Lớp 12</option>
              </select>
            </div>
            <div>
              <label style={{display: 'block', fontWeight: 'bold', marginBottom: 5}}>Chuyên đề / Tag</label>
              <input value={form.tags || ''} onChange={e => setForm({...form, tags: e.target.value})} placeholder="Đại số, Hình học..." style={{width: '100%', padding: 10, borderRadius: 6, border: '1px solid #ccc'}} />
            </div>
          </div>

          <div style={{marginBottom: 15}}>
             <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 5}}>
               <label style={{fontWeight: 'bold'}}>Nội dung câu hỏi</label>
               <span style={{fontSize: 11, color: '#e67e22', fontStyle: 'italic'}}>Hỗ trợ toán học LaTeX: $...$</span>
             </div>
            <textarea required value={form.question_text || ''} onChange={e => setForm({...form, question_text: e.target.value})} rows={3} style={{width: '100%', padding: 10, borderRadius: 6, border: '1px solid #ccc', fontFamily: '"Cambria Math", "Noto Sans Math", "Arial Unicode MS", "system-ui", sans-serif', fontSize: 15}} />
            {form.question_text && (
               <div style={{marginTop: 5, padding: '10px 14px', background: '#fff', border: '1px dashed #ccc', fontSize: 15, color: '#333', borderRadius: 6}}>
                  <strong style={{color: '#888'}}>Bản xem trước (Preview): </strong> 
                  <span className="math-preview">{form.question_text}</span>
               </div>
            )}
          </div>

          <div style={{display: 'flex', gap: 10, marginBottom: 15}}>
            <div style={{flex: 1}}>
              <label style={{display: 'block', fontSize: 13, marginBottom: 5}}>Upload Ảnh Minh Họa</label>
              <input type="file" accept="image/*" onChange={handleUploadImage} style={{display: 'block', width: '100%', padding: 6, fontSize: 12, border: '1px solid #ddd', borderRadius: 4}} />
              {form.image_url && <img src={form.image_url} alt="img" style={{maxHeight: 100, marginTop: 10, borderRadius: 8}} />}
            </div>
            <div style={{flex: 1}}>
               <label style={{display: 'block', fontSize: 13, marginBottom: 5}}>Link Video (Youtube)</label>
               <input value={form.video_url || ''} onChange={e => setForm({...form, video_url: e.target.value})} placeholder="https://youtube.com/..." style={{width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: 4}} />
            </div>
          </div>

          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15, marginBottom: 20}}>
             {['A', 'B', 'C', 'D'].map(k => (
               <div key={k} style={{display: 'flex', alignItems: 'center', gap: 10}}>
                 <span style={{fontWeight: 'bold'}}>{k}.</span>
                 <input value={form.options_json[k] || ''} onChange={e => setForm({...form, options_json: {...form.options_json, [k]: e.target.value}})} style={{flex: 1, padding: 8, borderRadius: 4, border: '1px solid #ccc', fontFamily: '"Cambria Math", "Noto Sans Math", "Arial Unicode MS", "system-ui", sans-serif', fontSize: 14}} />
               </div>
             ))}
          </div>

          <div style={{display: 'flex', gap: 20, marginBottom: 20}}>
            <div style={{display: 'flex', alignItems: 'center', gap: 10, background: '#e8f5e9', padding: '10px 15px', borderRadius: 6}}>
              <label style={{fontWeight: 'bold', color: '#2e7d32'}}>Đáp án đúng:</label>
              <select value={form.correct_answer} onChange={e => setForm({...form, correct_answer: e.target.value})} style={{padding: '5px 10px', borderRadius: 4, border: '1px solid #a5d6a7'}}>
                 <option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option>
              </select>
            </div>
            <div style={{flex: 1, display: 'flex', alignItems: 'center', gap: 10, background: '#e3f2fd', padding: '10px 15px', borderRadius: 6}}>
              <label style={{fontWeight: 'bold', color: '#1565c0'}}>Gợi ý:</label>
              <input value={form.hint || ''} onChange={e => setForm({...form, hint: e.target.value})} placeholder="Sinh viên sẽ thấy sau khi làm sai..." style={{flex: 1, padding: 8, borderRadius: 4, border: '1px solid #90caf9'}} />
            </div>
          </div>

          <div style={{display: 'flex', gap: 10}}>
            <button type="submit" style={{background: '#e67e22', color: '#fff', border: 'none', padding: '10px 25px', borderRadius: 6, fontWeight: 'bold', cursor: 'pointer'}}>Lưu Khung</button>
            <button type="button" onClick={() => setIsEditing(false)} style={{background: '#eee', color: '#333', border: 'none', padding: '10px 25px', borderRadius: 6, fontWeight: 'bold', cursor: 'pointer'}}>Hủy</button>
          </div>
        </form>
      ) : loading ? (
        <div style={{textAlign: 'center', padding: 20}}>Đang tải...</div>
      ) : (
        <div style={{display: 'flex', flexDirection: 'column', gap: 15}}>
          {questions.length === 0 ? <p style={{color: '#888'}}>Chưa có câu hỏi nào.</p> : null}
          {questions.map(q => {
            let opts = {};
            try { opts = JSON.parse(q.options_json); } catch(e){}
            return (
            <div key={q.id} style={{padding: 20, border: '1px solid #eee', borderRadius: 12, background: '#fafafa', position: 'relative'}}>
              <span style={{position: 'absolute', top: 15, right: 15, background: '#e0e0e0', color: '#555', padding: '4px 10px', borderRadius: 12, fontSize: 12, fontWeight: 'bold'}}>Lớp {q.grade}</span>
              <div style={{fontWeight: 'bold', color: '#003380', marginBottom: 10, fontSize: 16, paddingRight: 60, fontFamily: '"Cambria Math", "Noto Sans Math", "Arial Unicode MS", "system-ui", sans-serif'}}>{q.question_text}</div>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5, fontSize: 13, marginBottom: 10}}>
                 {['A', 'B', 'C', 'D'].map(k => (
                   <div key={k} style={{color: q.correct_answer === k ? '#2ecc71' : '#555', fontWeight: q.correct_answer === k ? 'bold' : 'normal', fontFamily: '"Cambria Math", "Noto Sans Math", "Arial Unicode MS", "system-ui", sans-serif'}}>{k}. {opts[k]} {q.correct_answer === k && '✅'}</div>
                 ))}
              </div>
              <div style={{display: 'flex', gap: 10}}>
                <button onClick={() => { setIsEditing(true); setForm({ ...q, options_json: opts }); }} style={{background: 'none', border: 'none', color: '#2980b9', cursor: 'pointer', fontSize: 13, fontWeight: 'bold'}}>✏️ Sửa</button>
                <button onClick={() => handleDelete(q.id)} style={{background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer', fontSize: 13, fontWeight: 'bold'}}>🗑️ Xóa</button>
              </div>
            </div>
          )})}
        </div>
      )}
    </div>
  );
}
