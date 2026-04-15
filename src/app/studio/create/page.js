'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function CreateGame() {
   const searchParams = useSearchParams();
   const gameTypeToken = searchParams.get('type') || 'match';
   const projectId = searchParams.get('id');

   const [gameType, setGameType] = useState(gameTypeToken);
   const [pairs, setPairs] = useState([{ question: '', answer: '' }, { question: '', answer: '' }, { question: '', answer: '' }]);
   const [publishing, setPublishing] = useState(false);
   const [publishedCode, setPublishedCode] = useState(null);
   const [history, setHistory] = useState([]);
   const [isEditMode, setIsEditMode] = useState(false);
   const [projectTitle, setProjectTitle] = useState('');

   // Wheel specific state
   const [wheelSegments, setWheelSegments] = useState([
     { label: 'Giải Nhất', color: '#ef4444' },
     { label: 'Giải Nhì', color: '#3b82f6' },
     { label: 'Giải Ba', color: '#10b981' },
     { label: 'Mất Lượt', color: '#1e293b' }
   ]);

   // Quiz specific state
   const [quizQuestions, setQuizQuestions] = useState([
     { question: '', options: ['', '', '', ''], correctIndex: 0 },
   ]);

   // Fill-in specific state
   const [fillinQuestions, setFillinQuestions] = useState([
     { expression: '', hint: '', answer: '' },
   ]);

   // Steps specific state
   const [stepsProblems, setStepsProblems] = useState([
     { title: '', steps: ['', '', ''] },
   ]);

   useEffect(() => {
      // Fetch common history for sidebar
      fetch('/api/studio/projects')
         .then(res => res.json())
         .then(data => { if (data.projects) setHistory(data.projects); })
         .catch(e => console.error(e));

      // If editing, load the specific project using dedicated API
      if (projectId) {
         setIsEditMode(true);
         fetch(`/api/studio/projects/${projectId}`)
            .then(res => res.json())
            .then(data => {
               if (data.project) {
                  const found = data.project;
                  setGameType(found.game_type);
                  setPublishedCode(found.game_code);
                  setProjectTitle(found.title || '');
                  if (found.config_json) {
                     try {
                        const cfg = typeof found.config_json === 'string' ? JSON.parse(found.config_json) : found.config_json;
                        // Load all types
                        if (found.game_type === 'match' && cfg.pairs) setPairs(cfg.pairs);
                        if (found.game_type === 'wheel' && cfg.segments) setWheelSegments(cfg.segments);
                        if (found.game_type === 'quiz' && cfg.questions) setQuizQuestions(cfg.questions);
                        if (found.game_type === 'fillin' && cfg.questions) setFillinQuestions(cfg.questions);
                        if (found.game_type === 'steps' && cfg.problems) setStepsProblems(cfg.problems);
                     } catch (e) { console.error('Error parsing config:', e); }
                  }
               }
            });
      }
   }, [projectId]);

   const handleAddPair = () => {
      setPairs([...pairs, { question: '', answer: '' }]);
   };

   const handleRemovePair = (index) => {
      setPairs(pairs.filter((_, i) => i !== index));
   };

   const handleAddSegment = () => {
     const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#1e293b', '#ec4899'];
     const nextColor = colors[wheelSegments.length % colors.length];
     setWheelSegments([...wheelSegments, { label: 'Mục mới', color: nextColor }]);
   };

   const handleRemoveSegment = (index) => {
     setWheelSegments(wheelSegments.filter((_, i) => i !== index));
   };

   const handlePublish = async () => {
      let config = {};
      if (gameType === 'match') {
        const validPairs = pairs.filter(p => p.question.trim() !== '' && p.answer.trim() !== '');
        if (validPairs.length < 2) { alert('Vui lòng tạo ít nhất 2 cặp hợp lệ.'); setPublishing(false); return; }
        config = { pairs: validPairs };
      } else if (gameType === 'wheel') {
        if (wheelSegments.length < 2) { alert('Vui lòng tạo ít nhất 2 ô.'); setPublishing(false); return; }
        config = { segments: wheelSegments };
      } else if (gameType === 'quiz') {
        const validQ = quizQuestions.filter(q => q.question.trim() && q.options.some(o => o.trim()));
        if (validQ.length < 1) { alert('Vui lòng thêm ít nhất 1 câu hỏi.'); setPublishing(false); return; }
        config = { questions: validQ };
      } else if (gameType === 'fillin') {
        const validF = fillinQuestions.filter(q => q.expression.trim() && String(q.answer).trim());
        if (validF.length < 1) { alert('Vui lòng thêm ít nhất 1 câu.'); setPublishing(false); return; }
        config = { questions: validF };
      } else if (gameType === 'steps') {
        const validS = stepsProblems.filter(p => p.title.trim() && p.steps.some(s => s.trim()));
        if (validS.length < 1) { alert('Vui lòng thêm ít nhất 1 bài toán.'); setPublishing(false); return; }
        config = { problems: validS };
      }

      setPublishing(true);
      try {
         const url = isEditMode ? `/api/studio/projects/${projectId}` : '/api/studio/projects';
         const method = isEditMode ? 'PATCH' : 'POST';

         const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
               title: projectTitle || 'Chưa đặt tên',
               game_type: gameType,
               config_json: config
            })
         });
         const data = await res.json();
         if (res.ok) {
            const code = data.game_code || publishedCode;
            setPublishedCode(code);
            if (!isEditMode) {
               setHistory([{ game_code: code, game_type: gameType, title: projectTitle, created_at: new Date() }, ...history]);
            } else {
               alert('✅ Đã cập nhật game thành công! Mã game: ' + publishedCode);
            }
         } else {
            alert('Lỗi lưu game: ' + (data.error || 'Unknown error'));
         }
      } catch (e) {
         console.error(e);
         alert('Lỗi kết nối. Vui lòng thử lại.');
      }
      setPublishing(false);
   };

   return (
      <div style={{ minHeight: '100vh', background: '#f5f7f9', fontFamily: 'Inter, sans-serif' }}>
         <header style={{ background: '#1e293b', padding: '15px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
            <div style={{ color: '#fff', fontSize: '24px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 10 }}>
               <span style={{ fontSize: '28px' }}>🕹️</span> iMath Studio
            </div>
            <Link href="/studio" style={{ color: '#94a3b8', textDecoration: 'none', background: 'rgba(255,255,255,0.1)', padding: '8px 15px', borderRadius: 8 }}>Trở về Sảnh Studio</Link>
         </header>

         <main style={{ maxWidth: '1200px', margin: '40px auto', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', gap: '30px', padding: '0 20px' }}>

            {/* Editor Area */}
            <div style={{ background: '#fff', padding: '30px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
               {/* Project Title Input */}
               <div style={{ marginBottom: '30px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase' }}>Tên gợi nhớ dự án</label>
                  <input 
                    placeholder="VD: Kiểm tra Toán - Chương 1..."
                    value={projectTitle}
                    onChange={e => setProjectTitle(e.target.value)}
                    style={{ ...inputStyle, fontSize: '18px', fontWeight: '900', border: 'none', borderBottom: '2px solid #e2e8f0', borderRadius: 0, padding: '10px 0' }}
                  />
               </div>

               <h2 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '20px', color: '#0f172a' }}>
                  {gameType === 'match' ? 'Tạo Game: Lật Hình Ghép Cặp' : gameType === 'wheel' ? 'Tạo Game: Vòng Quay May Mắn' : gameType === 'quiz' ? 'Tạo Game: Trắc Nghiệm' : gameType === 'fillin' ? 'Tạo Game: Điền Khuyết' : 'Tạo Game: Các Bước Giải'}
               </h2>
               <p style={{ color: '#64748b', marginBottom: '30px' }}>
                  {gameType === 'match' 
                     ? 'Học sinh sẽ lật từng thẻ bài lên, nhiệm vụ là phải tìm đúng cặp tương ứng.' 
                     : 'Thiết lập các ô quà tặng hoặc câu hỏi trên vòng quay để học sinh thử vận may.'}
               </p>

                {gameType === 'match' && (
                   <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 50px', gap: '15px', marginBottom: '10px', fontWeight: 'bold', color: '#475569' }}>
                         <div>Vế 1 (Câu hỏi)</div>
                         <div>Vế 2 (Đáp án)</div>
                         <div></div>
                      </div>

                     {pairs.map((pair, idx) => (
                        <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 50px', gap: '15px', marginBottom: '15px', alignItems: 'center' }}>
                           <input
                              placeholder="VD: sin(30°)"
                              value={pair.question}
                              onChange={e => { const newP = [...pairs]; newP[idx].question = e.target.value; setPairs(newP); }}
                              style={inputStyle}
                           />
                           <input
                              placeholder="VD: 1/2"
                              value={pair.answer}
                              onChange={e => { const newP = [...pairs]; newP[idx].answer = e.target.value; setPairs(newP); }}
                              style={inputStyle}
                           />
                           <button onClick={() => handleRemovePair(idx)} style={{ background: '#ef4444', color: '#fff', border: 'none', height: '42px', borderRadius: '8px', cursor: 'pointer' }}>✖</button>
                        </div>
                     ))}

                     <button onClick={handleAddPair} style={{ background: '#eff6ff', color: '#3b82f6', border: '1px dashed #3b82f6', padding: '10px 20px', borderRadius: '8px', width: '100%', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' }}>
                        ➕ Thêm cặp mới
                     </button>
                  </div>
                )}

                {/* QUIZ EDITOR */}
                {gameType === 'quiz' && (
                  <div style={{ background: '#f0fdf4', padding: '20px', borderRadius: '12px', border: '1px solid #bbf7d0', marginBottom: '20px' }}>
                    {quizQuestions.map((q, qi) => (
                      <div key={qi} style={{ marginBottom: '25px', padding: '20px', background: '#fff', borderRadius: '12px', border: '1px solid #d1fae5' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                          <b style={{ color: '#059669' }}>Câu {qi + 1}</b>
                          {quizQuestions.length > 1 && <button onClick={() => setQuizQuestions(quizQuestions.filter((_,i) => i !== qi))} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer' }}>✕</button>}
                        </div>
                        <input placeholder="Nội dung câu hỏi (VD: Tính giới hạn lim(x→0) sin(x)/x = ?)" value={q.question} onChange={e => { const n=[...quizQuestions]; n[qi].question=e.target.value; setQuizQuestions(n); }} style={{ ...inputStyle, marginBottom: '12px', fontWeight: '700' }} />
                        {['A','B','C','D'].map((letter,oi) => (
                          <div key={oi} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                            <span style={{ width: '24px', height: '24px', background: q.correctIndex === oi ? '#10b981' : '#e2e8f0', color: q.correctIndex === oi ? '#fff' : '#64748b', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '900', cursor: 'pointer', flexShrink: 0 }} onClick={() => { const n=[...quizQuestions]; n[qi].correctIndex=oi; setQuizQuestions(n); }}>{letter}</span>
                            <input placeholder={`Đáp án ${letter}`} value={q.options[oi] || ''} onChange={e => { const n=[...quizQuestions]; n[qi].options[oi]=e.target.value; setQuizQuestions(n); }} style={{ ...inputStyle, borderColor: q.correctIndex === oi ? '#10b981' : '' }} />
                          </div>
                        ))}
                        <small style={{ color: '#64748b' }}>⇧ Nhấn vào chữ cái để chọn đáp án đúng</small>
                      </div>
                    ))}
                    <button onClick={() => setQuizQuestions([...quizQuestions, { question: '', options: ['','','',''], correctIndex: 0 }])} style={{ background: '#dcfce7', color: '#16a34a', border: '1px dashed #22c55e', padding: '10px 20px', borderRadius: '8px', width: '100%', fontWeight: 'bold', cursor: 'pointer' }}>
                      ➕ Thêm câu hỏi
                    </button>
                  </div>
                )}

                {/* FILL-IN EDITOR */}
                {gameType === 'fillin' && (
                  <div style={{ background: '#faf5ff', padding: '20px', borderRadius: '12px', border: '1px solid #e9d5ff', marginBottom: '20px' }}>
                    {fillinQuestions.map((q, qi) => (
                      <div key={qi} style={{ marginBottom: '20px', padding: '20px', background: '#fff', borderRadius: '12px', border: '1px solid #e9d5ff' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                          <b style={{ color: '#7c3aed' }}>Bài {qi + 1}</b>
                          {fillinQuestions.length > 1 && <button onClick={() => setFillinQuestions(fillinQuestions.filter((_,i) => i !== qi))} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer' }}>✕</button>}
                        </div>
                        <input placeholder="Biểu thức/Bài toán (VD: ∫ x² dx từ 0 đến 1 = ?)" value={q.expression} onChange={e => { const n=[...fillinQuestions]; n[qi].expression=e.target.value; setFillinQuestions(n); }} style={{ ...inputStyle, marginBottom: '8px', fontWeight: '700' }} />
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                          <input placeholder="Gợi ý (tùy chọn)" value={q.hint} onChange={e => { const n=[...fillinQuestions]; n[qi].hint=e.target.value; setFillinQuestions(n); }} style={inputStyle} />
                          <input placeholder="Đáp án chính xác (VD: 1/3)" value={q.answer} onChange={e => { const n=[...fillinQuestions]; n[qi].answer=e.target.value; setFillinQuestions(n); }} style={{ ...inputStyle, borderColor: '#8b5cf6', fontWeight: '700' }} />
                        </div>
                      </div>
                    ))}
                    <button onClick={() => setFillinQuestions([...fillinQuestions, { expression: '', hint: '', answer: '' }])} style={{ background: '#f3e8ff', color: '#7c3aed', border: '1px dashed #a855f7', padding: '10px 20px', borderRadius: '8px', width: '100%', fontWeight: 'bold', cursor: 'pointer' }}>
                      ➕ Thêm bài
                    </button>
                  </div>
                )}

                {/* STEPS EDITOR */}
                {gameType === 'steps' && (
                  <div style={{ background: '#fffbeb', padding: '20px', borderRadius: '12px', border: '1px solid #fde68a', marginBottom: '20px' }}>
                    {stepsProblems.map((prob, pi) => (
                      <div key={pi} style={{ marginBottom: '20px', padding: '20px', background: '#fff', borderRadius: '12px', border: '1px solid #fde68a' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                          <b style={{ color: '#d97706' }}>Bài toán {pi + 1}</b>
                          {stepsProblems.length > 1 && <button onClick={() => setStepsProblems(stepsProblems.filter((_,i) => i !== pi))} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer' }}>✕</button>}
                        </div>
                        <input placeholder="Tiêu đề bài toán (VD: Giải PT bậc 2: x² - 5x + 6 = 0)" value={prob.title} onChange={e => { const n=[...stepsProblems]; n[pi].title=e.target.value; setStepsProblems(n); }} style={{ ...inputStyle, marginBottom: '12px', fontWeight: '700' }} />
                        <div style={{ marginBottom: '8px', fontSize: '13px', color: '#92400e', fontWeight: '600' }}>Các bước giải (theo đúng thứ tự):</div>
                        {prob.steps.map((step, si) => (
                          <div key={si} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                            <span style={{ background: '#fde68a', color: '#78350f', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', fontSize: '13px', fontWeight: '900', flexShrink: 0 }}>{si + 1}</span>
                            <input placeholder={`Bước ${si+1}`} value={step} onChange={e => { const n=[...stepsProblems]; n[pi].steps[si]=e.target.value; setStepsProblems(n); }} style={inputStyle} />
                            {prob.steps.length > 2 && <button onClick={() => { const n=[...stepsProblems]; n[pi].steps=n[pi].steps.filter((_,i)=>i!==si); setStepsProblems(n); }} style={{ background: '#fee2e2', color: '#ef4444', border: 'none', padding: '8px 10px', borderRadius: '6px', cursor: 'pointer' }}>✕</button>}
                          </div>
                        ))}
                        <button onClick={() => { const n=[...stepsProblems]; n[pi].steps=[...n[pi].steps,'']; setStepsProblems(n); }} style={{ background: '#fef3c7', color: '#d97706', border: '1px dashed #f59e0b', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', marginTop: '4px' }}>➕ Thêm bước</button>
                      </div>
                    ))}
                    <button onClick={() => setStepsProblems([...stepsProblems, { title: '', steps: ['', '', ''] }])} style={{ background: '#fef3c7', color: '#92400e', border: '1px dashed #f59e0b', padding: '10px 20px', borderRadius: '8px', width: '100%', fontWeight: 'bold', cursor: 'pointer' }}>
                      ➕ Thêm bài toán
                    </button>
                  </div>
                )}

                {gameType === 'wheel' && (
                  <div style={{ background: '#fffbeb', padding: '20px', borderRadius: '12px', border: '1px solid #fde68a', marginBottom: '20px' }}>
                     <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 50px', gap: '15px', marginBottom: '10px', fontWeight: 'bold', color: '#92400e' }}>
                        <div>Nhãn hiển thị (Label)</div>
                        <div>Màu sắc</div>
                        <div></div>
                     </div>

                     {wheelSegments.map((seg, idx) => (
                        <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 100px 50px', gap: '15px', marginBottom: '15px', alignItems: 'center' }}>
                           <input
                              placeholder="VD: Chúc mừng"
                              value={seg.label}
                              onChange={e => { const newS = [...wheelSegments]; newS[idx].label = e.target.value; setWheelSegments(newS); }}
                              style={inputStyle}
                           />
                           <input
                              type="color"
                              value={seg.color}
                              onChange={e => { const newS = [...wheelSegments]; newS[idx].color = e.target.value; setWheelSegments(newS); }}
                              style={{ width: '100%', height: '42px', padding: 2, borderRadius: 8, border: '1px solid #cbd5e1', cursor: 'pointer' }}
                           />
                           <button onClick={() => handleRemoveSegment(idx)} style={{ background: '#ef4444', color: '#fff', border: 'none', height: '42px', borderRadius: '8px', cursor: 'pointer' }}>✖</button>
                        </div>
                     ))}

                     <button onClick={handleAddSegment} style={{ background: '#fef3c7', color: '#92400e', border: '1px dashed #f59e0b', padding: '10px 20px', borderRadius: '8px', width: '100%', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' }}>
                        ➕ Thêm ô mới
                     </button>
                  </div>
               )}

               <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '20px', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
                  {publishedCode && (
                     <div style={{ background: '#ecfdf5', color: '#059669', padding: '10px 20px', borderRadius: '8px', border: '1px solid #10b981' }}>
                        Thành công! Mã Game của bạn là: <b style={{ fontSize: '18px' }}>{publishedCode}</b>
                     </div>
                  )}
                  <button onClick={handlePublish} disabled={publishing} style={publishBtnStyle}>
                     {publishing ? 'Đang tạo...' : '🚀 XUẤT BẢN GAME NÀY'}
                  </button>
               </div>
            </div>

            {/* Sidebar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
               <div style={{ background: '#fff', padding: '20px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '15px', color: '#0f172a' }}>Lịch sử tạo Game</h3>
                  {history.length === 0 ? <p style={{ color: '#94a3b8', fontSize: '13px' }}>Chưa có game nào</p> : (
                     <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {history.map(proj => (
                           <div key={proj.game_code} style={{ background: '#f8fafc', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                              <div style={{ fontWeight: 'bold', color: '#3b82f6' }}>{proj.game_code}</div>
                              <div style={{ fontSize: '12px', color: '#64748b' }}>Loại: {proj.game_type === 'match' ? 'Ghép cặp' : proj.game_type}</div>
                           </div>
                        ))}
                     </div>
                  )}
               </div>
            </div>
         </main>
      </div>
   );
}

export default function Page() {
   return (
      <Suspense fallback={<div>Đang tải...</div>}>
         <CreateGame />
      </Suspense>
   )
}

const inputStyle = {
   width: '100%',
   padding: '12px 15px',
   borderRadius: '8px',
   border: '1px solid #cbd5e1',
   outline: 'none',
   fontSize: '14px'
};

const publishBtnStyle = {
   background: '#3b82f6',
   color: '#fff',
   border: 'none',
   padding: '12px 30px',
   borderRadius: '8px',
   fontWeight: 'bold',
   fontSize: '16px',
   cursor: 'pointer',
   boxShadow: '0 4px 15px rgba(59, 130, 246, 0.4)'
};
