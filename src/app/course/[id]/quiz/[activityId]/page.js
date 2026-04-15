'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Scratchpad from '@/app/components/Scratchpad';

export default function QuizPage() {
  const params = useParams();
  const { id: courseId, activityId } = params;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [quizData, setQuizData] = useState(null); // { quiz, questions, results, canEdit, myResult }
  const [submitResult, setSubmitResult] = useState(null);

  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const [showHint, setShowHint] = useState({});
  const [showScratchpad, setShowScratchpad] = useState(false);
  const [availableTags, setAvailableTags] = useState([]);

  // Teacher State Builder
  const [builderTime, setBuilderTime] = useState(15);
  const [builderPassScore, setBuilderPassScore] = useState(0);
  const [builderQuestions, setBuilderQuestions] = useState([]);
  const [showBankModal, setShowBankModal] = useState(false);
  const [bankGrade, setBankGrade] = useState('10');
  const [bankCount, setBankCount] = useState(5);
  const [showMathToolbar, setShowMathToolbar] = useState(true);

  useEffect(() => {
    // MathJax Injection
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
     // Typeset whenever relevant state changes
     const timer = setTimeout(() => {
        if (window.MathJax && window.MathJax.typesetPromise) {
           window.MathJax.typesetPromise().catch(e => console.log(e.message));
        }
     }, 300);
     return () => clearTimeout(timer);
  }, [quizData, builderQuestions, answers, showHint]);

  useEffect(() => {
    // We decode token loosely via an API call or just rely on API response
    fetchQuiz();
  }, []);

  const fetchQuiz = async () => {
    try {
      let role = 'student';
      try {
        const resMe = await fetch('/api/me');
        if (resMe.ok) {
          const me = await resMe.json();
          role = me.role;
          setUserRole(role);
        }
      } catch(e) { /* /api/me fail - dùng role mặc định student */ }

      const res = await fetch(`/api/quizzes/${activityId}`);
      if (res.ok) {
        const data = await res.json();
        const isEditMode = new URLSearchParams(window.location.search).get('mode') === 'edit';
        if (!isEditMode) data.canEdit = false;

        if (data.quiz) {
          setQuizData(data);
          setBuilderTime(data.quiz.time_limit);
          setBuilderPassScore(data.quiz.pass_score || 0);
          const qs = (data.questions || []).map(q => {
            let opts = { A: '', B: '', C: '', D: '' };
            try { opts = JSON.parse(q.options_json); } catch(e) {}
            return { ...q, options: typeof q.options === 'object' ? q.options : opts };
          });
          setBuilderQuestions(qs);
          if (data.myResult && !submitResult) {
            setSubmitResult(data.myResult);
          }
        } else {
          setQuizData({ questions: [], canEdit: data.canEdit });
        }
      }
    } catch(e) {
      console.warn('fetchQuiz error (page navigating away):', e.message);
    } finally {
      setLoading(false);
    }
  };

  // Load available tags (created by this teacher in course edit)
  useEffect(() => {
    fetch('/api/admin/tags')
      .then(r => r.ok ? r.json() : { tags: [] })
      .then(d => setAvailableTags(d.tags || []))
      .catch(() => {});
  }, []);

  // --- STUDENT LOGIC ---
  const startQuiz = () => {
    setHasStarted(true);
    setTimeLeft(quizData.quiz.time_limit * 60);
  };

  useEffect(() => {
     let timer;
     if (hasStarted && timeLeft > 0 && !submitResult) {
        timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
     } else if (hasStarted && timeLeft === 0 && !submitResult) {
        submitQuiz(); // auto submit
     }
     return () => clearInterval(timer);
  }, [hasStarted, timeLeft, submitResult]);

  const submitQuiz = async () => {
     const res = await fetch(`/api/quizzes/${activityId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'submit_quiz', answers })
     });
     if (res.ok) {
        const data = await res.json();
        setSubmitResult(data);
        if (data.current_streak) alert(`🔥 Chuỗi chuyên cần: ${data.current_streak} ngày!`);
     }
  };

  // --- TEACHER LOGIC ---
  const handleAddQuestion = () => {
    setBuilderQuestions([...builderQuestions, {
       type: 'choice',
       question_text: '',
       options: { A: '', B: '', C: '', D: '' },
       correct_answer: 'A',
       tags: '',
       hint: '',
       image_url: '',
       video_url: ''
    }]);
  };

  const handleUpdateQuestion = (index, field, value) => {
    const q = [...builderQuestions];
    q[index][field] = value;
    setBuilderQuestions(q);
  };

  const handleUpdateOption = (qIndex, optKey, value) => {
    const q = [...builderQuestions];
    q[qIndex].options[optKey] = value;
    setBuilderQuestions(q);
  };

  const removeQuestion = (index) => {
     const q = [...builderQuestions];
     q.splice(index, 1);
     setBuilderQuestions(q);
  };

  const saveQuiz = async () => {
     try {
        const payload = { action: 'save_quiz', time_limit: builderTime, pass_score: builderPassScore, questions: builderQuestions };
        const res = await fetch(`/api/quizzes/${activityId}`, {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok) {
           alert('✅ Đã lưu đề thi thành công!');
           fetchQuiz();
        } else {
           alert('❌ Lỗi: ' + (data.error || 'Không thể lưu đề thi. Vui lòng thử lại.'));
        }
     } catch(e) {
        alert('❌ Lỗi kết nối: ' + e.message);
     }
  };

  // Upload image for a question
  const handleUploadQuestionImage = async (e, index) => {
     const file = e.target.files[0];
     if (!file) return;
     handleUpdateQuestion(index, 'image_url', 'Dang tai anh...');
     const formData = new FormData();
     formData.append('file', file);
     const res = await fetch('/api/admin/upload', { method: 'POST', body: formData });
     const data = await res.json();
     if (res.ok) handleUpdateQuestion(index, 'image_url', data.url);
     else { alert(data.error); handleUpdateQuestion(index, 'image_url', ''); }
  };

  const handleUploadOptionImage = async (e, index, optKey) => {
     const file = e.target.files[0];
     if (!file) return;
     const q = [...builderQuestions];
     q[index].options[optKey + '_img'] = 'Dang tai...';
     setBuilderQuestions(q);
     
     const formData = new FormData();
     formData.append('file', file);
     const res = await fetch('/api/admin/upload', { method: 'POST', body: formData });
     const data = await res.json();
     
     const q2 = [...builderQuestions];
     if (res.ok) q2[index].options[optKey + '_img'] = data.url;
     else q2[index].options[optKey + '_img'] = '';
     setBuilderQuestions(q2);
  };

  const handleUploadHintImage = async (e, index) => {
     const file = e.target.files[0];
     if (!file) return;
     const q = [...builderQuestions];
     q[index].options = q[index].options || {};
     q[index].options['hint_img'] = 'Dang tai...';
     setBuilderQuestions(q);
     
     const formData = new FormData();
     formData.append('file', file);
     const res = await fetch('/api/admin/upload', { method: 'POST', body: formData });
     const data = await res.json();
     
     const q2 = [...builderQuestions];
     if (res.ok) q2[index].options['hint_img'] = data.url;
     else q2[index].options['hint_img'] = '';
     setBuilderQuestions(q2);
  };

  const toEmbedUrl = (url) => {
    if (!url) return '';
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/);
    if (ytMatch) return 'https://www.youtube.com/embed/' + ytMatch[1];
    const drMatch = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
    if (drMatch) return 'https://drive.google.com/file/d/' + drMatch[1] + '/preview';
    return url;
  };

  const handlePickFromBank = async () => {
    try {
      const res = await fetch(`/api/admin/question-bank?action=random&grade=${bankGrade}&count=${bankCount}`);
      if (res.ok) {
        const data = await res.json();
        if (data.questions && data.questions.length > 0) {
          const mapped = data.questions.map(q => {
             let opts = { A: '', B: '', C: '', D: '' };
             try { opts = JSON.parse(q.options_json); } catch(e) {}
             return {
                type: q.type || 'choice',
                question_text: q.question_text,
                options: opts,
                correct_answer: q.correct_answer,
                tags: q.tags || '',
                hint: q.hint || '',
                image_url: q.image_url || '',
                video_url: q.video_url || ''
             };
          });
          setBuilderQuestions([...builderQuestions, ...mapped]);
          setShowBankModal(false);
          alert(`✅ Đã bốc ngẫu nhiên ${mapped.length} câu hỏi thành công!`);
        } else {
          alert('❌ Ngân hàng câu hỏi của khối này hiện tại chưa có dữ liệu!');
        }
      }
    } catch(e) {
      alert('Lỗi kết nối ngân hàng câu hỏi!');
    }
  };

  const MATH_SYMBOLS = [
     '∀', '∃', '∄', '∈', '∉', '⊂', '⊃', '⊆', '⊇', '∪', '∩', '√', '∛', '∜', '∝', '∞', 
     '∠', '△', '□', '⊥', '∥', '°', '±', '×', '÷', '≠', '≈', '≤', '≥', '≡', '∼', '≃',
     '½', '⅓', '⅔', '¼', '¾', 'π', 'Δ', 'θ', 'α', 'β', 'γ', '∑', '∫', 'ƒ',
     'ℝ', 'ℕ', 'ℤ', 'ℚ', '⇒', '⇔', '∅', '∇', '∂'
  ];

  const insertSymbolToActiveInput = (symbol) => {
    const el = document.activeElement;
    if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) {
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const text = el.value;
      const newVal = text.slice(0, start) + symbol + text.slice(end);
      
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
      const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
      
      if (el.tagName === 'TEXTAREA') {
        nativeTextAreaValueSetter.call(el, newVal);
      } else {
        nativeInputValueSetter.call(el, newVal);
      }
      
      el.dispatchEvent(new Event('input', { bubbles: true}));
      
      setTimeout(() => {
        el.focus();
        el.setSelectionRange(start + symbol.length, start + symbol.length);
      }, 0);
    }
  };

  const handleCreateTag = async () => {
    const tagName = window.prompt("Nhập tên Tag phân loại mới:");
    if (!tagName || !tagName.trim()) return;
    try {
      const res = await fetch('/api/admin/tags', { 
         method: 'POST', 
         headers: {'Content-Type': 'application/json'}, 
         body: JSON.stringify({ name: tagName.trim(), course_id: courseId }) 
      });
      if (res.ok) {
         fetch('/api/admin/tags').then(r=>r.ok ? r.json() : {tags: []}).then(d=>setAvailableTags(d.tags || []));
      } else { 
         alert("Lỗi khi tạo tag mới!"); 
      }
    } catch(e) { }
  };

  if (loading) return <div style={{padding: 50, textAlign: 'center'}}>Đang tải bài thi...</div>;

  return (
    <div style={{fontFamily: 'system-ui, sans-serif', background: '#f5f7fa', minHeight: '100vh', paddingBottom: 80}}>
        
      {/* Header Modal-like */}
      <div style={{background: '#003380', color: '#fff', padding: '20px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
         <h1 style={{fontSize: 24, margin: 0}}>📝 Bài Kiểm Tra Trắc Nghiệm</h1>
         {quizData?.canEdit ? (
            <button onClick={() => router.back()} style={{color: '#fff', border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.2)', padding: '8px 20px', borderRadius: 20}}>Quay Lại Trang Chỉnh Sửa</button>
         ) : (
            <Link href={`/course/${courseId}/learn`} style={{color: '#fff', textDecoration: 'none', background: 'rgba(255,255,255,0.2)', padding: '8px 20px', borderRadius: 20}}>Trở Về Thư Viện</Link>
         )}
      </div>

      <div style={{maxWidth: 900, margin: '40px auto', background: '#fff', padding: 40, borderRadius: 12, boxShadow: '0 10px 30px rgba(0,0,0,0.05)'}}>
        
        {/* --- DÀNH CHO ADMIN / TEACHER --- */}
        {quizData?.canEdit ? (
           <div>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30, borderBottom: '2px solid #eee', paddingBottom: 20}}>
                 <h2 style={{fontSize: 22, color: '#e74c3c'}}>Bộ Công Cụ Nhập Đề (Tự Chấm Tiêu Chuẩn)</h2>
                 <div style={{display: 'flex', gap: 15}}>
                    <div>
                        <label style={{fontWeight: 'bold', display: 'block', marginBottom: 5, fontSize: 13}}>⏳ Thời lượng (Phút):</label>
                        <input type="number" style={{width: 100, padding: 8, border: '1px solid #ddd', borderRadius: 4}} value={builderTime} onChange={e => setBuilderTime(parseInt(e.target.value))} />
                    </div>
                    <div>
                        <label style={{fontWeight: 'bold', display: 'block', marginBottom: 5, fontSize: 13}}>🚩 Điểm để qua (Pass Score):</label>
                        <input type="number" step="0.5" style={{width: 130, padding: 8, border: '1px solid #ddd', borderRadius: 4}} value={builderPassScore} onChange={e => setBuilderPassScore(parseFloat(e.target.value))} />
                        <div style={{fontSize: 11, color: '#888', marginTop: 4}}>Để 0 là không bắt buộc</div>
                    </div>
                 </div>
              </div>

              <div style={{background: '#fff', padding: '12px 18px', borderRadius: 8, marginBottom: 25, boxShadow: '0 4px 12px rgba(0,0,0,0.06)', position: 'sticky', top: 15, zIndex: 100, border: '1px solid #e0e4ea'}}>
                 <div style={{fontSize: 13, fontWeight: 'bold', color: '#555', marginBottom: showMathToolbar ? 10 : 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                    <div style={{display: 'flex', alignItems: 'center'}}>
                       <span style={{fontSize: 18, marginRight: 6}}>🧮</span> Ký hiệu Toán & Đặc biệt (Click chuột vào ô cần điền rồi ấn chèn):
                    </div>
                    <button onClick={() => setShowMathToolbar(!showMathToolbar)} style={{background: '#e3f2fd', border: '1px solid #90caf9', color: '#1565c0', padding: '4px 10px', borderRadius: 6, cursor: 'pointer', fontWeight: 'bold'}}>
                       {showMathToolbar ? 'Ẩn thanh công cụ' : 'Hiện thanh công cụ'}
                    </button>
                 </div>
                 {showMathToolbar && (
                    <div style={{display: 'flex', flexWrap: 'wrap', gap: 6}}>
                       {MATH_SYMBOLS.map((sym, idx) => (
                          <button 
                             key={idx} 
                             title="Chèn ký hiệu"
                             onMouseDown={(e) => { e.preventDefault(); insertSymbolToActiveInput(sym); }} 
                             style={{padding: '5px 10px', fontSize: 16, background: '#f5f7fa', border: '1px solid #cdd4df', borderRadius: 6, cursor: 'pointer', fontFamily: '"Cambria Math", "Noto Sans Math", "Arial Unicode MS", serif', transition: 'all 0.2s', fontWeight: 'bold', color: '#2c3e50'}}
                             onMouseOver={e => e.target.style.background = '#e3f2fd'}
                             onMouseOut={e => e.target.style.background = '#f5f7fa'}
                          >
                             {sym}
                          </button>
                       ))}
                    </div>
                 )}
              </div>

               {builderQuestions.map((q, i) => (
                  <div key={i} style={{marginBottom: 30, padding: 24, border: '2px solid #e0e4ea', borderRadius: 12, background: '#fff', position: 'relative', boxShadow: '0 2px 8px rgba(0,0,0,0.04)'}}>
                     <button onClick={() => removeQuestion(i)} style={{position: 'absolute', top: -12, right: -12, background: '#ff4d4f', color: '#fff', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', fontWeight: 'bold', fontSize: 14}}>x</button>
                     <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10}}>
                        <div style={{fontSize: 11, fontWeight: 700, color: '#aaa', letterSpacing: 1, textTransform: 'uppercase'}}>Câu {i + 1}</div>
                        <select value={q.type || 'choice'} onChange={e => handleUpdateQuestion(i, 'type', e.target.value)} style={{padding: '4px 8px', borderRadius: 6, border: '1px solid #ccc', fontSize: 12, fontWeight: 600}}>
                           <option value="choice">Trắc nghiệm</option>
                           <option value="short_answer">Điền từ / Trả lời ngắn</option>
                        </select>
                     </div>
                     <div style={{border: '1.5px solid #d0d5dd', borderRadius: 8, background: '#fff', overflow: 'hidden', marginBottom: 16}}>
                       <div style={{display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderBottom: '1px solid #eee', background: '#fafafa', flexWrap: 'wrap'}}>
                         <label style={{display: 'inline-flex', alignItems: 'center', gap: 4, background: (q.image_url && !q.image_url.includes('Dang')) ? '#e3f2fd' : '#f0f0f0', color: (q.image_url && !q.image_url.includes('Dang')) ? '#1565c0' : '#555', border: 'none', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 600}}>
                           Ảnh
                           <input type="file" style={{display: 'none'}} accept="image/*" onChange={e => handleUploadQuestionImage(e, i)} />
                         </label>
                         {(q.image_url && !q.image_url.includes('Dang')) && (
                           <button type="button" onClick={() => handleUpdateQuestion(i, 'image_url', '')} style={{background: '#ffebee', color: '#e74c3c', border: 'none', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', fontSize: 12}}>Xóa ảnh</button>
                         )}
                         <button type="button" onClick={() => handleUpdateQuestion(i, '_showVid', !q._showVid)} style={{background: q.video_url ? '#e8f5e9' : '#f0f0f0', color: q.video_url ? '#1a885c' : '#555', border: 'none', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 600}}>
                           Video
                         </button>
                       </div>
                       <textarea style={{width: '100%', padding: '12px 14px', border: 'none', outline: 'none', minHeight: 80, fontSize: 15, resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.6, fontFamily: '"Cambria Math", "system-ui", sans-serif'}} placeholder="Nhập nội dung câu hỏi (Có thể Copy / Paste chuỗi LaTeX kẹp trong dấu $...$)" value={q.question_text || ''} onChange={e => handleUpdateQuestion(i, 'question_text', e.target.value)} />
                       {q.question_text && (
                          <div style={{padding: '10px 14px', background: '#f5f7fa', borderTop: '1px solid #eee', fontSize: 15, color: '#333'}}>
                             <strong style={{color: '#888'}}>Bản xem trước (Preview): </strong> 
                             <span className="math-preview">{q.question_text}</span>
                          </div>
                       )}
                       {(q.image_url && !q.image_url.includes('Dang')) && (
                         <div style={{padding: '0 14px 14px'}}><img src={q.image_url} alt="preview" style={{maxWidth: '100%', maxHeight: 250, borderRadius: 6, border: '1px solid #e0e0e0', display: 'block'}} /></div>
                       )}
                       {(q._showVid || q.video_url) && (
                         <div style={{padding: '0 14px 14px', borderTop: '1px dashed #eee'}}>
                           <div style={{display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, paddingTop: 12}}>
                             <span style={{fontSize: 13, color: '#1a885c', fontWeight: 700, whiteSpace: 'nowrap'}}>URL Video:</span>
                             <input type="url" placeholder="https://www.youtube.com/watch?v=..." value={q.video_url || ''} onChange={e => handleUpdateQuestion(i, 'video_url', e.target.value)} style={{flex: 1, padding: '7px 10px', borderRadius: 6, border: '1px solid #c3e6cb', fontSize: 13, outline: 'none'}} />
                             {q.video_url && (<button type="button" onClick={() => { handleUpdateQuestion(i, 'video_url', ''); handleUpdateQuestion(i, '_showVid', false); }} style={{background: '#ffebee', color: '#e74c3c', border: 'none', borderRadius: 6, padding: '7px 10px', cursor: 'pointer', fontSize: 12}}>x</button>)}
                           </div>
                           {q.video_url && (<div style={{borderRadius: 8, overflow: 'hidden', border: '1px solid #c3e6cb'}}><iframe src={toEmbedUrl(q.video_url)} width="100%" height="220" frameBorder="0" allowFullScreen style={{display: 'block'}} /></div>)}
                         </div>
                       )}
                     </div>
                     {q.type !== 'short_answer' ? (
                       <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14}}>
                          {['A', 'B', 'C', 'D'].map(opt => (
                             <div key={opt} style={{display: 'flex', flexDirection: 'column', gap: 6}}>
                                <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                                   <span style={{fontWeight: 800, width: 22, color: '#555'}}>{opt}.</span>
                                   <input type="text" style={{flex: 1, padding: '8px 10px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14, fontFamily: '"Cambria Math", "Noto Sans Math", "Arial Unicode MS", "system-ui", sans-serif'}} value={q.options?.[opt] || ''} onChange={e => handleUpdateOption(i, opt, e.target.value)} placeholder={`Đáp án ${opt}`} />
                                   <label style={{background: '#f0f0f0', border: '1px solid #ccc', borderRadius: 4, padding: '4px 8px', cursor: 'pointer', fontSize: 12}}>
                                      + Ảnh
                                      <input type="file" style={{display: 'none'}} accept="image/*" onChange={e => handleUploadOptionImage(e, i, opt)} />
                                   </label>
                                </div>
                                {q.options?.[opt + '_img'] && (
                                   <div style={{marginLeft: 30, display: 'flex', alignItems: 'center', gap: 10}}>
                                      <img src={q.options[opt + '_img']} style={{height: 40, borderRadius: 4, border: '1px solid #ddd'}} />
                                      <button onClick={() => { const qNew = [...builderQuestions]; qNew[i].options[opt + '_img'] = ''; setBuilderQuestions(qNew); }} style={{background: '#ffebee', color: '#c62828', border: 'none', borderRadius: 4, padding: '4px 8px', fontSize: 11, cursor: 'pointer'}}>✖</button>
                                   </div>
                                )}
                             </div>
                          ))}
                       </div>
                     ) : (
                       <div style={{background: '#e8f5e9', padding: '12px 14px', borderRadius: 8, marginBottom: 14, border: '1px solid #a5d6a7'}}>
                          <label style={{fontWeight: 700, color: '#2e7d32', display: 'block', marginBottom: 6, fontSize: 13}}>Đáp án đúng (Từ khóa):</label>
                          <input type="text" style={{width: '100%', padding: '8px 10px', border: '1px solid #81c784', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', fontFamily: '"Cambria Math", "Noto Sans Math", "Arial Unicode MS", "system-ui", sans-serif'}} value={q.correct_answer || ''} onChange={e => handleUpdateQuestion(i, 'correct_answer', e.target.value)} placeholder="Ví dụ: 3 (Ngăn cách nhiều đáp án bằng dấu phẩy: 3,ba)" />
                       </div>
                     )}
                     <div style={{display: 'grid', gridTemplateColumns: q.type === 'short_answer' ? '1fr' : '1fr 2fr', gap: 10, marginBottom: 14}}>
                       {q.type !== 'short_answer' && (
                         <div style={{display: 'flex', alignItems: 'center', gap: 8, background: '#e8f5e9', padding: '10px 14px', borderRadius: 8}}>
                            <label style={{fontWeight: 700, color: '#2e7d32', fontSize: 13, whiteSpace: 'nowrap'}}>Đáp án đúng:</label>
                            <select value={q.correct_answer || 'A'} onChange={e => handleUpdateQuestion(i, 'correct_answer', e.target.value)} style={{padding: '6px 10px', borderRadius: 6, border: '1px solid #a5d6a7', fontWeight: 700}}>
                               <option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option>
                            </select>
                         </div>
                       )}
                       <div style={{display: 'flex', flexDirection: 'column', gap: 6, background: '#e3f2fd', padding: '10px 14px', borderRadius: 8}}>
                          <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                             <label style={{fontWeight: 700, color: '#1565c0', fontSize: 13, whiteSpace: 'nowrap'}}>Gợi ý:</label>
                             <input type="text" placeholder="Gợi ý hiện khi học sinh ấn vào..." value={q.hint || ''} onChange={e => handleUpdateQuestion(i, 'hint', e.target.value)} style={{flex: 1, padding: '6px 10px', border: '1px solid #90caf9', borderRadius: 6, fontSize: 13, fontFamily: '"Cambria Math", "Noto Sans Math", "Arial Unicode MS", "system-ui", sans-serif'}} />
                             <label style={{background: '#fff', border: '1px solid #1565c0', color: '#1565c0', borderRadius: 4, padding: '4px 8px', cursor: 'pointer', fontSize: 12}}>
                                + Ảnh
                                <input type="file" style={{display: 'none'}} accept="image/*" onChange={e => handleUploadHintImage(e, i)} />
                             </label>
                          </div>
                          {q.options?.hint_img && (
                             <div style={{display: 'flex', alignItems: 'center', gap: 10, marginTop: 4}}>
                                <img src={q.options.hint_img} style={{maxHeight: 60, borderRadius: 4, border: '1px solid #90caf9'}} />
                                <button onClick={() => { const qNew = [...builderQuestions]; qNew[i].options.hint_img = ''; setBuilderQuestions(qNew); }} style={{background: '#ffebee', color: '#c62828', border: 'none', borderRadius: 4, padding: '4px 8px', fontSize: 11, cursor: 'pointer'}}>✖</button>
                             </div>
                          )}
                       </div>
                     </div>
                     <div style={{background: '#fffde7', border: '1px solid #ffe082', borderRadius: 8, padding: '12px 14px'}}>
                       <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10}}>
                         <div style={{fontSize: 13, fontWeight: 700, color: '#e67e22'}}>Tag phân loại (chọn một):</div>
                         <button type="button" onClick={handleCreateTag} style={{background: '#fff', color: '#e67e22', border: '1px solid #e67e22', borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 600, cursor: 'pointer'}}>+ Tạo thẻ mới</button>
                       </div>
                       {availableTags.length > 0 ? (
                         <div style={{display: 'flex', flexWrap: 'wrap', gap: 8}}>
                           {availableTags.map(t => { const sel = q.tags === t.name; return (<button key={t.id} type="button" onClick={() => handleUpdateQuestion(i, 'tags', sel ? '' : t.name)} style={{padding: '6px 16px', borderRadius: 20, fontSize: 13, fontWeight: sel ? 700 : 500, cursor: 'pointer', background: sel ? '#e67e22' : '#fff', color: sel ? '#fff' : '#555', border: sel ? '2px solid #e67e22' : '1.5px solid #ddd'}}>{t.name}</button>); })}
                           {q.tags && <button type="button" onClick={() => handleUpdateQuestion(i, 'tags', '')} style={{padding: '6px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer', background: '#ffebee', color: '#e74c3c', border: '1.5px solid #ffcdd2', fontWeight: 600}}>x Bỏ chọn</button>}
                         </div>
                       ) : (<span style={{color: '#aaa', fontSize: 13, fontStyle: 'italic'}}>Chưa có tag. Hãy bấm nút tạo thẻ mới.</span>)}
                     </div>
                  </div>
               ))}

              <div style={{display: 'flex', gap: 15}}>
                 <button onClick={handleAddQuestion} style={{background: '#f1f2f6', color: '#2f3542', padding: '12px 25px', borderRadius: 6, border: '1px dashed #747d8c', fontWeight: 'bold', cursor: 'pointer'}}>+ Bổ Sung Câu Mới</button>
                 <button onClick={() => setShowBankModal(true)} style={{background: '#e67e22', color: '#fff', padding: '12px 25px', borderRadius: 6, border: 'none', fontWeight: 'bold', cursor: 'pointer'}}>📚 Lấy ngẫu nhiên từ Ngân hàng</button>
                 <button onClick={saveQuiz} style={{background: '#003380', color: '#fff', padding: '12px 25px', borderRadius: 6, border: 'none', fontWeight: 'bold', cursor: 'pointer', marginLeft: 'auto'}}>Lưu Khung Đề Thi Này Lên Hệ Thống</button>
              </div>

              {showBankModal && (
                <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                 <div style={{width: 400, background: '#fff', padding: 30, borderRadius: 16}}>
                   <h3 style={{marginBottom: 20}}>📚 Bốc từ Ngân Hàng Câu Hỏi</h3>
                   <div style={{marginBottom: 15}}>
                     <label style={{display: 'block', fontWeight: 'bold', marginBottom: 5}}>Giới hạn ở Khối:</label>
                     <select value={bankGrade} onChange={e => setBankGrade(e.target.value)} style={{width: '100%', padding: 10, borderRadius: 6, border: '1px solid #ccc'}}>
                       <option value="9">Lớp 9</option><option value="10">Lớp 10</option>
                       <option value="11">Lớp 11</option><option value="12">Lớp 12</option>
                     </select>
                   </div>
                   <div style={{marginBottom: 20}}>
                     <label style={{display: 'block', fontWeight: 'bold', marginBottom: 5}}>Số lượng câu hỏi cấn lấy trích xuất:</label>
                     <input type="number" value={bankCount} onChange={e => setBankCount(Number(e.target.value))} min={1} max={50} style={{width: '100%', padding: 10, borderRadius: 6, border: '1px solid #ccc'}} />
                   </div>
                   <div style={{display: 'flex', gap: 10}}>
                     <button onClick={handlePickFromBank} style={{flex: 1, background: '#2ecc71', color: '#fff', padding: 10, border: 'none', borderRadius: 6, fontWeight: 'bold', cursor: 'pointer'}}>Xác nhận Lấy Đề</button>
                     <button onClick={() => setShowBankModal(false)} style={{background: '#eee', color: '#333', padding: '10px 20px', border: 'none', borderRadius: 6, fontWeight: 'bold', cursor: 'pointer'}}>Hủy</button>
                   </div>
                 </div>
                </div>
              )}

              {/* RESULTS TABLE FOR TEACHERS */}
              {quizData?.results?.length > 0 && (
                 <div style={{marginTop: 50}}>
                    <h3 style={{fontSize: 20, marginBottom: 20, paddingBottom: 10, borderBottom: '2px solid #eee'}}>📊 Bảng Xếp Hạng Điểm Thi Lớp Này</h3>
                    <table style={{width: '100%', borderCollapse: 'collapse', fontSize: 15}}>
                       <thead><tr style={{background: '#f0f0f0', textAlign: 'left'}}><th style={{padding: 12}}>Học Sinh</th><th style={{padding: 12}}>Điểm Số / 10</th><th style={{padding: 12}}>Thời gian nộp</th></tr></thead>
                       <tbody>
                          {quizData.results.map((r, i) => (
                             <tr key={i} style={{borderBottom: '1px solid #eee'}}>
                                <td style={{padding: 12, fontWeight: 'bold', color: '#003380'}}>{r.student_name}</td>
                                <td style={{padding: 12, fontWeight: 'bold', color: r.score >= 5 ? '#2ecc71' : '#e74c3c'}}>{r.score} Điểm</td>
                                <td style={{padding: 12, color: '#666'}}>{new Date(r.submitted_at).toLocaleString('vi-VN')}</td>
                             </tr>
                          ))}
                       </tbody>
                    </table>
                 </div>
              )}
           </div>
        ) : (
           /* --- DÀNH CHO HỌC SINH LÀM BÀI --- */
           <div>
               {submitResult && (
                  <div style={{textAlign: 'center', padding: 30, background: '#f8f9fa', borderRadius: 16, marginBottom: 30, border: '2px solid #eee'}}>
                     <div style={{fontSize: 50, marginBottom: 10}}>{submitResult.score >= 5 ? '🎉' : '😓'}</div>
                     <h2 style={{fontSize: 24, color: '#333'}}>Kết Quả Bài Làm</h2>
                     <p style={{fontSize: 18, color: '#666'}}>Đúng {submitResult.correct} / {submitResult.total} câu</p>
                     <div style={{fontSize: 40, fontWeight: 900, color: submitResult.score >= 5 ? '#2ecc71' : '#e74c3c', textShadow: '0 2px 10px rgba(0,0,0,0.1)'}}>
                        {submitResult.score} ĐIỂM
                     </div>
                     <div style={{marginTop: 20, display: 'flex', gap: 15, justifyContent: 'center'}}>
                         <button onClick={() => {setSubmitResult(null); setAnswers({}); setHasStarted(false);}} style={{background: '#f39c12', color: '#fff', padding: '10px 20px', borderRadius: 20, border: 'none', fontWeight: 'bold', cursor: 'pointer'}}>Làm Lại Lần Nữa</button>
                         <Link href={`/course/${courseId}/learn`} style={{background: '#003380', color: '#fff', padding: '10px 20px', borderRadius: 20, textDecoration: 'none', fontWeight: 'bold'}}>Trở Lại Lớp Học</Link>
                     </div>
                  </div>
               )}

               {!hasStarted && !submitResult ? (
                  <div style={{textAlign: 'center', padding: 50}}>
                     <div style={{fontSize: 60, marginBottom: 20}}>⏳</div>
                     <h2 style={{fontSize: 24, marginBottom: 15}}>Sẵn Sàng Làm Bài?</h2>
                     <p style={{fontSize: 16, color: '#666', marginBottom: 30}}>Bài thi gồm {quizData?.questions?.length || 0} câu hỏi. Thời gian quy định: <b>{quizData?.quiz?.time_limit || 0} phút.</b></p>
                     {quizData?.questions?.length > 0 ? (
                        <button onClick={startQuiz} style={{background: '#e74c3c', color: '#fff', padding: '15px 40px', fontSize: 18, borderRadius: 30, border: 'none', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 5px 15px rgba(231, 76, 60, 0.4)'}}>BẮT ĐẦU TÍNH GIỜ</button>
                     ) : <p style={{color: '#e74c3c'}}>Giáo viên chưa cập nhật câu hỏi!</p>}
                  </div>
               ) : (hasStarted || submitResult) ? (
                  <div style={{display: 'flex', gap: 20, alignItems: 'flex-start', minHeight: '80vh'}}>
                     {/* LEFT COLUMN: QUIZ */}
                     <div style={{flex: showScratchpad ? 1 : '1 1 100%', transition: 'all 0.3s ease'}}>
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20}}>
                           <button onClick={() => setShowScratchpad(!showScratchpad)} style={{background: showScratchpad ? '#e67e22' : '#f39c12', color: '#fff', border: 'none', padding: '10px 15px', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.1)'}}>
                              {showScratchpad ? 'Đóng Bảng Nháp' : '✏️ Mở Bảng Nháp Chia Đôi Màn Hình'}
                           </button>
                        </div>
                        
                        {!submitResult && (
                           <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#e3f2fd', padding: '15px 25px', borderRadius: 8, marginBottom: 30, border: '1px solid #bbdefb'}}>
                              <span style={{fontWeight: 'bold', color: '#1565c0'}}>Câu Hỏi: {quizData.questions.length}</span>
                              <span style={{fontWeight: 'bold', color: '#c62828', fontSize: 18}}>
                                 Hết Giờ Sau: {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                              </span>
                           </div>
                        )}

                     {quizData.questions.map((q, i) => {
                        let opts = {};
                        try { opts = JSON.parse(q.options_json); } catch(e){}
                        
                        const isSubmitted = !!submitResult;
                        const resultDetail = isSubmitted ? submitResult.details?.[q.id] : null;
                        const correctObj = resultDetail ? (resultDetail.isCorrect ? '✅ Đúng' : `❌ Sai (Đ/Án: ${resultDetail.correctAnswer})`) : '';
                        const qColor = resultDetail ? (resultDetail.isCorrect ? '#2ecc71' : '#e74c3c') : '#333';

                        return (
                        <div key={q.id} style={{marginBottom: 40, borderBottom: '1px solid #eee', paddingBottom: 25}}>
                           <h3 style={{fontSize: 18, marginBottom: 20, lineHeight: 1.5, color: qColor}}>
                              <b>Câu {i+1}:</b> <span style={{fontFamily: '"Cambria Math", "system-ui", sans-serif'}}>{q.question_text}</span> {isSubmitted && <span style={{fontSize: 14, marginLeft: 10}}>{correctObj}</span>}
                           </h3>

                            {/* IMAGE */}
                            {q.image_url && !q.image_url.startsWith('⏳') && (
                               <div style={{marginBottom: 16}}>
                                  <img src={q.image_url} alt="minh hoa" style={{maxWidth: '100%', maxHeight: 300, borderRadius: 8, border: '1px solid #eee', display: 'block'}} />
                               </div>
                            )}

                            {/* VIDEO */}
                            {q.video_url && (
                               <div style={{marginBottom: 16, borderRadius: 8, overflow: 'hidden', border: '1px solid #eee'}}>
                                  <iframe src={toEmbedUrl(q.video_url)} width="100%" height="280" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen style={{display: 'block'}} />
                               </div>
                            )}
                           <div style={{display: 'flex', flexDirection: 'column', gap: 12}}>
                              {q.type === 'short_answer' ? (
                                 <div style={{background: (isSubmitted && resultDetail) ? (resultDetail.isCorrect ? '#d4edda' : '#f8d7da') : '#f8f9fa', padding: '15px 20px', border: `1px solid ${(isSubmitted && resultDetail) ? (resultDetail.isCorrect ? '#28a745' : '#dc3545') : '#ddd'}`, borderRadius: 8}}>
                                    <input type="text" disabled={isSubmitted} value={answers[q.id] || ''} onChange={e => setAnswers({...answers, [q.id]: e.target.value})} placeholder="Nhập câu trả lời của bạn..." style={{width: '100%', padding: '12px 15px', border: '1px solid #ccc', borderRadius: 6, fontSize: 16, boxSizing: 'border-box'}} />
                                 </div>
                              ) : (
                                 ['A', 'B', 'C', 'D'].map(optKey => {
                                    const isChecked = answers[q.id] === optKey;
                                    let labelBg = isChecked ? '#e8f5e9' : '#fff';
                                    let labelBorder = isChecked ? '#4caf50' : '#ddd';
                                    
                                    // Highlight feedback
                                    if (isSubmitted && resultDetail) {
                                       if (isChecked && resultDetail.isCorrect) {
                                          labelBg = '#d4edda'; labelBorder = '#28a745'; // Student correct pick
                                       } else if (isChecked && !resultDetail.isCorrect) {
                                          labelBg = '#f8d7da'; labelBorder = '#dc3545'; // Student wrong pick
                                       } else if (!isChecked && resultDetail.correctAnswer === optKey) {
                                          labelBg = '#d4edda'; labelBorder = '#28a745'; // Highlight actual correct answer
                                       } else {
                                          labelBg = '#f8f9fa'; labelBorder = '#eee'; // Unpicked wrong answer
                                       }
                                    }

                                    return (
                                    <label key={optKey} style={{display: 'flex', alignItems: 'center', gap: 15, padding: '15px 20px', border: `1px solid ${labelBorder}`, borderRadius: 8, cursor: isSubmitted ? 'not-allowed' : 'pointer', background: labelBg}}>
                                       <input type="radio" disabled={isSubmitted} name={`q_${q.id}`} value={optKey} checked={isChecked} onChange={(e) => setAnswers({...answers, [q.id]: e.target.value})} style={{width: 20, height: 20}} />
                                       <span style={{fontWeight: 'bold', width: 25}}>{optKey}.</span>
                                       <div style={{display: 'flex', flexDirection: 'column', gap: 6}}>
                                          <span style={{fontSize: 16, fontFamily: '"Cambria Math", "Noto Sans Math", "Arial Unicode MS", "system-ui", sans-serif'}}>{opts[optKey] || ''}</span>
                                          {opts[optKey + '_img'] && <img src={opts[optKey + '_img']} style={{maxHeight: 120, objectFit: 'contain', borderRadius: 6, border: '1px solid #eee'}} />}
                                       </div>
                                    </label>
                                 )})
                              )}
                           </div>

                           {/* HINT */}
                           {isSubmitted && q.hint && (
                              <div style={{marginTop: 15}}>
                                 <button onClick={() => setShowHint({...showHint, [q.id]: !showHint[q.id]})} style={{background: 'none', border: '1px solid #f39c12', color: '#e67e22', padding: '5px 15px', borderRadius: 15, cursor: 'pointer', fontWeight: 'bold'}}>
                                    💡 {showHint[q.id] ? 'Đóng Gợi Ý' : 'Xem Gợi Ý'}
                                 </button>
                                 {showHint[q.id] && (
                                    <div style={{marginTop: 10, padding: 15, background: '#fff9e6', borderLeft: '4px solid #f39c12', borderRadius: '0 8px 8px 0', color: '#555', fontSize: 14, fontFamily: '"Cambria Math", "Noto Sans Math", "Arial Unicode MS", "system-ui", sans-serif'}}>
                                       <div>{q.hint}</div>
                                       {opts.hint_img && <div style={{marginTop: 10}}><img src={opts.hint_img} style={{maxHeight: 150, borderRadius: 6, border: '1px solid #f39c12'}} /></div>}
                                    </div>
                                 )}
                              </div>
                           )}
                        </div>
                     )})}

                     {!submitResult && (
                        <div style={{textAlign: 'center', marginTop: 40}}>
                           <button onClick={submitQuiz} style={{background: '#2ecc71', color: '#fff', padding: '15px 50px', fontSize: 18, borderRadius: 30, border: 'none', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 5px 15px rgba(46, 204, 113, 0.4)'}}>NỘP BÀI THI</button>
                        </div>
                     )}
                     </div>

                     {/* RIGHT COLUMN: BACKBONE */}
                     {showScratchpad && (
                        <div style={{flex: 1, position: 'sticky', top: 20, height: '80vh'}}>
                           <Scratchpad onClose={() => setShowScratchpad(false)} />
                        </div>
                     )}
                  </div>
               ) : null}
            </div>
        )}
      </div>
    </div>
  );
}
