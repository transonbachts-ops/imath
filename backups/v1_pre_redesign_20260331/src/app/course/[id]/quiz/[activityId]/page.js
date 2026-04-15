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
  const [builderQuestions, setBuilderQuestions] = useState([]);

  useEffect(() => {
    // We decode token loosely via an API call or just rely on API response
    fetchQuiz();
  }, []);

  const fetchQuiz = async () => {
    // Let's get "who am I" from a secure header or let the API return `userRole` if we wanted.
    // Instead, I'll fetch `/api/auth/me` or similar to know who is looking.
    // Actually, I can just fetch `/api/quizzes/${activityId}` and the API can inject role. 
    // Wait, the API GET doesn't return role. Let me fetch auth.
    let role = 'student'; // fallback
    try {
       const resAuth = await fetch('/api/admin/users'); // we don't have a strict me endpoint, let's use a workaround or check document cookie? We cannot read httponly cookie here.
       // Let's modify the GET quiz array to include role. I'll just change the GET later if needed.
       // For now, I'll fetch `/api/enroll` and it returns 401 if not... Let's just create an inline server action or dedicated route.
    } catch(e) {}
    
    // Simplification for this app: I'll fetch a new quickly made /api/me to get the role.
    const resMe = await fetch('/api/me');
    if (resMe.ok) {
       const me = await resMe.json();
       role = me.role;
       setUserRole(role);
    }

    const res = await fetch(`/api/quizzes/${activityId}`);
    if (res.ok) {
       const data = await res.json();
       if (data.quiz) {
          setQuizData(data);
          setBuilderTime(data.quiz.time_limit);
          // Convert options_json to options object
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
          // Quiz doesn't exist yet
          setQuizData({ questions: [], canEdit: data.canEdit });
       }
    }
    setLoading(false);
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
     }
  };

  // --- TEACHER LOGIC ---
  const handleAddQuestion = () => {
    setBuilderQuestions([...builderQuestions, {
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
        const payload = { action: 'save_quiz', time_limit: builderTime, questions: builderQuestions };
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

  const toEmbedUrl = (url) => {
    if (!url) return '';
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/);
    if (ytMatch) return 'https://www.youtube.com/embed/' + ytMatch[1];
    const drMatch = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
    if (drMatch) return 'https://drive.google.com/file/d/' + drMatch[1] + '/preview';
    return url;
  };

  if (loading) return <div style={{padding: 50, textAlign: 'center'}}>Đang tải bài thi...</div>;

  return (
    <div style={{fontFamily: 'system-ui, sans-serif', background: '#f5f7fa', minHeight: '100vh', paddingBottom: 80}}>
        
      {/* Header Modal-like */}
      <div style={{background: '#003380', color: '#fff', padding: '20px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
         <h1 style={{fontSize: 24, margin: 0}}>📝 Bài Kiểm Tra Trắc Nghiệm</h1>
         <Link href={`/course/${courseId}/learn`} style={{color: '#fff', textDecoration: 'none', background: 'rgba(255,255,255,0.2)', padding: '8px 20px', borderRadius: 20}}>Trở Về Thư Viện</Link>
      </div>

      <div style={{maxWidth: 900, margin: '40px auto', background: '#fff', padding: 40, borderRadius: 12, boxShadow: '0 10px 30px rgba(0,0,0,0.05)'}}>
        
        {/* --- DÀNH CHO ADMIN / TEACHER --- */}
        {quizData?.canEdit ? (
           <div>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30, borderBottom: '2px solid #eee', paddingBottom: 20}}>
                 <h2 style={{fontSize: 22, color: '#e74c3c'}}>Bộ Công Cụ Nhập Đề (Tự Chấm Tiêu Chuẩn)</h2>
                 <div>
                    <label style={{fontWeight: 'bold', marginRight: 10}}>⏳ Thời lượng (Phút):</label>
                    <input type="number" style={{width: 80, padding: 8, border: '1px solid #ddd', borderRadius: 4}} value={builderTime} onChange={e => setBuilderTime(parseInt(e.target.value))} />
                 </div>
              </div>

               {builderQuestions.map((q, i) => (
                  <div key={i} style={{marginBottom: 30, padding: 24, border: '2px solid #e0e4ea', borderRadius: 12, background: '#fff', position: 'relative', boxShadow: '0 2px 8px rgba(0,0,0,0.04)'}}>
                     <button onClick={() => removeQuestion(i)} style={{position: 'absolute', top: -12, right: -12, background: '#ff4d4f', color: '#fff', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', fontWeight: 'bold', fontSize: 14}}>x</button>
                     <div style={{fontSize: 11, fontWeight: 700, color: '#aaa', letterSpacing: 1, marginBottom: 10, textTransform: 'uppercase'}}>Câu {i + 1}</div>
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
                       <textarea style={{width: '100%', padding: '12px 14px', border: 'none', outline: 'none', minHeight: 80, fontSize: 15, resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.6, fontFamily: 'inherit'}} placeholder="Nhập nội dung câu hỏi..." value={q.question_text || ''} onChange={e => handleUpdateQuestion(i, 'question_text', e.target.value)} />
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
                     <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14}}>
                        {['A', 'B', 'C', 'D'].map(opt => (
                           <div key={opt} style={{display: 'flex', alignItems: 'center', gap: 8}}>
                              <span style={{fontWeight: 800, width: 22, color: '#555'}}>{opt}.</span>
                              <input type="text" style={{flex: 1, padding: '8px 10px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14}} value={q.options?.[opt] || ''} onChange={e => handleUpdateOption(i, opt, e.target.value)} />
                           </div>
                        ))}
                     </div>
                     <div style={{display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10, marginBottom: 14}}>
                       <div style={{display: 'flex', alignItems: 'center', gap: 8, background: '#e8f5e9', padding: '10px 14px', borderRadius: 8}}>
                          <label style={{fontWeight: 700, color: '#2e7d32', fontSize: 13, whiteSpace: 'nowrap'}}>Đáp án đúng:</label>
                          <select value={q.correct_answer || 'A'} onChange={e => handleUpdateQuestion(i, 'correct_answer', e.target.value)} style={{padding: '6px 10px', borderRadius: 6, border: '1px solid #a5d6a7', fontWeight: 700}}>
                             <option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option>
                          </select>
                       </div>
                       <div style={{display: 'flex', alignItems: 'center', gap: 8, background: '#e3f2fd', padding: '10px 14px', borderRadius: 8}}>
                          <label style={{fontWeight: 700, color: '#1565c0', fontSize: 13, whiteSpace: 'nowrap'}}>Gợi ý:</label>
                          <input type="text" placeholder="Gợi ý hiện khi học sinh ấn vào..." value={q.hint || ''} onChange={e => handleUpdateQuestion(i, 'hint', e.target.value)} style={{flex: 1, padding: '6px 10px', border: '1px solid #90caf9', borderRadius: 6, fontSize: 13}} />
                       </div>
                     </div>
                     <div style={{background: '#fffde7', border: '1px solid #ffe082', borderRadius: 8, padding: '12px 14px'}}>
                       <div style={{fontSize: 13, fontWeight: 700, color: '#e67e22', marginBottom: 10}}>Tag phân loại (chọn một):</div>
                       {availableTags.length > 0 ? (
                         <div style={{display: 'flex', flexWrap: 'wrap', gap: 8}}>
                           {availableTags.map(t => { const sel = q.tags === t.name; return (<button key={t.id} type="button" onClick={() => handleUpdateQuestion(i, 'tags', sel ? '' : t.name)} style={{padding: '6px 16px', borderRadius: 20, fontSize: 13, fontWeight: sel ? 700 : 500, cursor: 'pointer', background: sel ? '#e67e22' : '#fff', color: sel ? '#fff' : '#555', border: sel ? '2px solid #e67e22' : '1.5px solid #ddd'}}>{t.name}</button>); })}
                           {q.tags && <button type="button" onClick={() => handleUpdateQuestion(i, 'tags', '')} style={{padding: '6px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer', background: '#ffebee', color: '#e74c3c', border: '1.5px solid #ffcdd2', fontWeight: 600}}>x Bỏ chọn</button>}
                         </div>
                       ) : (<span style={{color: '#aaa', fontSize: 13, fontStyle: 'italic'}}>Chưa có tag. Vào Admin → Chỉnh sửa Khoá học để tạo tag.</span>)}
                     </div>
                  </div>
               ))}

              <div style={{display: 'flex', gap: 15}}>
                 <button onClick={handleAddQuestion} style={{background: '#f1f2f6', color: '#2f3542', padding: '12px 25px', borderRadius: 6, border: '1px dashed #747d8c', fontWeight: 'bold', cursor: 'pointer'}}>+ Bổ Sung Câu Mới</button>
                 <button onClick={saveQuiz} style={{background: '#003380', color: '#fff', padding: '12px 25px', borderRadius: 6, border: 'none', fontWeight: 'bold', cursor: 'pointer'}}>Lưu Khung Đề Thi Này Lên Hệ Thống</button>
              </div>

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
                              <b>Câu {i+1}:</b> {q.question_text} {isSubmitted && <span style={{fontSize: 14, marginLeft: 10}}>{correctObj}</span>}
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
                              {['A', 'B', 'C', 'D'].map(optKey => {
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
                                    <span style={{fontSize: 16}}>{opts[optKey] || ''}</span>
                                 </label>
                              )})}
                           </div>

                           {/* HINT */}
                           {isSubmitted && q.hint && (
                              <div style={{marginTop: 15}}>
                                 <button onClick={() => setShowHint({...showHint, [q.id]: !showHint[q.id]})} style={{background: 'none', border: '1px solid #f39c12', color: '#e67e22', padding: '5px 15px', borderRadius: 15, cursor: 'pointer', fontWeight: 'bold'}}>
                                    💡 {showHint[q.id] ? 'Đóng Gợi Ý' : 'Xem Gợi Ý'}
                                 </button>
                                 {showHint[q.id] && (
                                    <div style={{marginTop: 10, padding: 15, background: '#fff9e6', borderLeft: '4px solid #f39c12', borderRadius: '0 8px 8px 0', color: '#555', fontSize: 14}}>
                                       {q.hint}
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
