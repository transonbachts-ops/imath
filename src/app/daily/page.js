'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Scratchpad from '@/app/components/Scratchpad';

export default function DailyChallengePage() {
  const [grade, setGrade] = useState('');
  const [loading, setLoading] = useState(false);
  const [quizData, setQuizData] = useState(null);
  const [answers, setAnswers] = useState({});
  const [hasStarted, setHasStarted] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);
  const [showHint, setShowHint] = useState({});
  const [showScratchpad, setShowScratchpad] = useState(false);

  useEffect(() => {
    // maybe try to get last grade from localStorage
    const savedGrade = localStorage.getItem('iMath_DailyGrade');
    if (savedGrade) setGrade(savedGrade);
  }, []);

  const fetchDailyQuiz = async (selectedGrade) => {
    setLoading(true);
    setGrade(selectedGrade);
    localStorage.setItem('iMath_DailyGrade', selectedGrade);
    
    const res = await fetch(`/api/daily-quiz?grade=${selectedGrade}`);
    if (res.ok) {
       const data = await res.json();
       const qs = (data.questions || []).map(q => {
          let opts = { A: '', B: '', C: '', D: '' };
          try { opts = JSON.parse(q.options_json); } catch(e) {}
          return { ...q, options: opts };
       });
       setQuizData({ questions: qs, myResult: data.myResult });
       if (data.myResult) {
          setSubmitResult(data.myResult);
       }
    }
    setLoading(false);
  };

  const submitQuiz = async () => {
     if (!confirm('Bạn có chắc chắn nộp bải?')) return;
     const res = await fetch('/api/daily-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grade, answers })
     });
     if (res.ok) {
        const data = await res.json();
        setSubmitResult(data);
        if (data.current_streak) alert(`🔥 Chuỗi chuyên cần của bạn đã lên ${data.current_streak} ngày!`);
     } else {
        const err = await res.json();
        alert('Lỗi: ' + err.error);
     }
  };

  const toEmbedUrl = (url) => {
    if (!url) return '';
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/);
    if (ytMatch) return 'https://www.youtube.com/embed/' + ytMatch[1];
    return url;
  };

  if (!grade || !quizData) {
     return (
       <div style={{minHeight: '100vh', background: '#f5f7fa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif'}}>
         <div style={{background: '#fff', padding: 40, borderRadius: 24, boxShadow: '0 20px 40px rgba(0,0,0,0.05)', textAlign: 'center', width: 500}}>
            <div style={{fontSize: 60, marginBottom: 20}}>🔥</div>
            <h1 style={{fontSize: 26, color: '#e67e22', marginBottom: 10, fontWeight: 900}}>Thử Thách Mỗi Ngày</h1>
            <p style={{color: '#666', marginBottom: 30, lineHeight: 1.6}}>Vượt qua 10 câu hỏi ngẫu nhiên mỗi ngày để duy trì ngọn lửa chuyên cần và khẳng định bản lĩnh của bạn.</p>
            
            <h3 style={{marginBottom: 20, color: '#333'}}>Vui lòng chọn khối lớp:</h3>
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15}}>
              {['9', '10', '11', '12'].map(g => (
                <button 
                  key={g} 
                  onClick={() => fetchDailyQuiz(g)}
                  style={{padding: '15px', fontSize: 18, fontWeight: 'bold', borderRadius: 12, border: '2px solid #e67e22', background: '#fff', color: '#e67e22', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 10px rgba(230, 126, 34, 0.1)'}}
                >
                  Lớp {g}
                </button>
              ))}
            </div>
            <div style={{marginTop: 30}}>
              <Link href="/dashboard" style={{color: '#888', textDecoration: 'none', fontWeight: 'bold'}}>← Quay về Dashboard</Link>
            </div>
         </div>
       </div>
     );
  }

  if (loading) return <div style={{padding: 50, textAlign: 'center'}}>Đang chuẩn bị đề thi hôm nay...</div>;

  return (
    <div style={{fontFamily: 'system-ui, sans-serif', background: '#f5f7fa', minHeight: '100vh', paddingBottom: 80}}>
      <div style={{background: '#e67e22', color: '#fff', padding: '20px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 15px rgba(230,126,34,0.3)'}}>
         <h1 style={{fontSize: 24, margin: 0, fontWeight: 900}}>🔥 Bài Tập Hằng Ngày (Lớp {grade})</h1>
         <Link href="/dashboard" style={{color: '#fff', textDecoration: 'none', background: 'rgba(255,255,255,0.2)', padding: '8px 20px', borderRadius: 20, fontWeight: 'bold'}}>← Thoát</Link>
      </div>

      <div style={{maxWidth: 900, margin: '40px auto', background: '#fff', padding: 40, borderRadius: 16, boxShadow: '0 10px 30px rgba(0,0,0,0.05)'}}>
         {submitResult ? (
           <div style={{textAlign: 'center', padding: 30, background: '#fff9f0', borderRadius: 16, border: '2px solid #f39c12', marginBottom: 30}}>
               <div style={{fontSize: 50, marginBottom: 10}}>{submitResult.score >= 5 ? '🎉' : '😓'}</div>
               <h2 style={{fontSize: 24, color: '#e67e22', fontWeight: 900}}>Kết Quả Thử Thách</h2>
               {submitResult.correct !== undefined && <p style={{fontSize: 18, color: '#666', fontWeight: 'bold'}}>Đúng {submitResult.correct} / {submitResult.total} câu</p>}
               <div style={{fontSize: 50, fontWeight: 900, color: submitResult.score >= 5 ? '#2ecc71' : '#e74c3c', textShadow: '0 2px 10px rgba(0,0,0,0.1)'}}>
                  {submitResult.score} / 10
               </div>
               {submitResult.current_streak && (
                 <div style={{marginTop: 15, display: 'inline-block', background: '#ffebee', color: '#c62828', padding: '10px 20px', borderRadius: 30, fontWeight: 900, fontSize: 18, border: '2px solid #ffcdd2'}}>
                   🔥 STREAK: {submitResult.current_streak} ngày liên tiếp
                 </div>
               )}
               <p style={{marginTop: 20, color: '#888', fontStyle: 'italic'}}>Ngày mai hãy quay lại để chinh phục bộ đề mới nhé!</p>
           </div>
         ) : !hasStarted ? (
           <div style={{textAlign: 'center', padding: 40}}>
              <h2 style={{fontSize: 24, marginBottom: 15, color: '#333'}}>Sẵn Sàng Bắt Đầu?</h2>
              <p style={{fontSize: 16, color: '#666', marginBottom: 30}}>Bài tập gồm {quizData.questions.length} câu hỏi ngẫu nhiên. Xin lưu ý: Mỗi ngày bạn chỉ có <b>1 LƯỢT LÀM BÀI DUY NHẤT</b>. Điểm số sẽ được ghi vào kết quả rèn luyện.</p>
              {quizData.questions.length > 0 ? (
                 <button onClick={() => setHasStarted(true)} style={{background: '#e67e22', color: '#fff', padding: '15px 40px', fontSize: 18, borderRadius: 30, border: 'none', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 5px 15px rgba(230,126,34, 0.4)'}}>BẮT ĐẦU THỬ THÁCH</button>
              ) : <p style={{color: '#e74c3c'}}>Kho ngân hàng khối lớp này hiện đang trống. Quay lại sau nhé!</p>}
           </div>
         ) : null}

         {(hasStarted || submitResult) && quizData.questions.length > 0 && (
           <div style={{display: 'flex', gap: 20, alignItems: 'flex-start'}}>
              <div style={{flex: showScratchpad ? 1 : '1 1 100%', transition: 'all 0.3s ease'}}>
                 <div style={{display: 'flex', justifyContent: 'flex-end', marginBottom: 20}}>
                     <button onClick={() => setShowScratchpad(!showScratchpad)} style={{background: showScratchpad ? '#e67e22' : '#f39c12', color: '#fff', border: 'none', padding: '10px 15px', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer'}}>
                        {showScratchpad ? 'Đóng Bảng Nháp' : '✏️ Mở Bảng Nháp'}
                     </button>
                 </div>

                 {quizData.questions.map((q, i) => {
                    let detailsObj = null;
                    if (submitResult && submitResult.details_json) {
                       try {
                          const p = typeof submitResult.details_json === 'string' ? JSON.parse(submitResult.details_json) : submitResult.details_json;
                          detailsObj = p[q.id];
                       } catch(e) {}
                    } else if (submitResult && submitResult.details) {
                       detailsObj = submitResult.details[q.id];
                    }

                    const isSubmitted = !!submitResult;
                    const correctObj = detailsObj ? (detailsObj.isCorrect ? '✅ Đúng' : `❌ Sai (Đáp án: ${detailsObj.correctAnswer})`) : '';

                    return (
                      <div key={q.id} style={{marginBottom: 40, borderBottom: '1px solid #eee', paddingBottom: 25}}>
                        <h3 style={{fontSize: 18, marginBottom: 20, lineHeight: 1.5, color: '#333'}}>
                           <b>Câu {i+1}:</b> {q.question_text} {isSubmitted && <span style={{fontSize: 14, marginLeft: 10}}>{correctObj}</span>}
                        </h3>

                        {q.image_url && <div style={{marginBottom: 16}}><img src={q.image_url} alt="img" style={{maxWidth: '100%', maxHeight: 300, borderRadius: 8, border: '1px solid #eee'}} /></div>}
                        {q.video_url && <div style={{marginBottom: 16, borderRadius: 8, overflow: 'hidden'}}><iframe src={toEmbedUrl(q.video_url)} width="100%" height="280" frameBorder="0" /></div>}

                        <div style={{display: 'flex', flexDirection: 'column', gap: 12}}>
                           {['A', 'B', 'C', 'D'].map(optKey => {
                              const isChecked = isSubmitted ? (detailsObj?.studentAnswer === optKey) : answers[q.id] === optKey;
                              let labelBg = isChecked ? '#fff3e0' : '#fff';
                              let labelBorder = isChecked ? '#ff9800' : '#ddd';

                              if (isSubmitted && detailsObj) {
                                 if (isChecked && detailsObj.isCorrect) { labelBg = '#d4edda'; labelBorder = '#28a745'; }
                                 else if (isChecked && !detailsObj.isCorrect) { labelBg = '#f8d7da'; labelBorder = '#dc3545'; }
                                 else if (!isChecked && detailsObj.correctAnswer === optKey) { labelBg = '#d4edda'; labelBorder = '#28a745'; }
                                 else { labelBg = '#f8f9fa'; labelBorder = '#eee'; }
                              }

                              return (
                                <label key={optKey} style={{display: 'flex', alignItems: 'center', gap: 15, padding: '15px 20px', border: `1px solid ${labelBorder}`, borderRadius: 8, cursor: isSubmitted ? 'default' : 'pointer', background: labelBg}}>
                                   <input type="radio" disabled={isSubmitted} name={`q_${q.id}`} value={optKey} checked={isChecked} onChange={(e) => setAnswers({...answers, [q.id]: e.target.value})} style={{width: 20, height: 20}} />
                                   <span style={{fontWeight: 'bold', width: 25}}>{optKey}.</span>
                                   <span style={{fontSize: 16}}>{q.options[optKey] || ''}</span>
                                </label>
                              )
                           })}
                        </div>

                        {isSubmitted && q.hint && (
                           <div style={{marginTop: 15}}>
                              <button onClick={() => setShowHint({...showHint, [q.id]: !showHint[q.id]})} style={{background: 'none', border: '1px solid #f39c12', color: '#e67e22', padding: '5px 15px', borderRadius: 15, cursor: 'pointer', fontWeight: 'bold'}}>
                                 💡 {showHint[q.id] ? 'Đóng Gợi Ý' : 'Xem Gợi Ý'}
                              </button>
                              {showHint[q.id] && (
                                 <div style={{marginTop: 10, padding: 15, background: '#fff9e6', borderLeft: '4px solid #f39c12', borderRadius: '0 8px 8px 0', color: '#555', fontSize: 14}}>{q.hint}</div>
                              )}
                           </div>
                        )}
                      </div>
                    )
                 })}

                 {!submitResult && (
                    <div style={{textAlign: 'center', marginTop: 40}}>
                       <button onClick={submitQuiz} style={{background: '#e67e22', color: '#fff', padding: '15px 50px', fontSize: 18, borderRadius: 30, border: 'none', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 5px 15px rgba(230,126,34, 0.4)'}}>NỘP BÀI THỬ THÁCH</button>
                    </div>
                 )}
              </div>

              {showScratchpad && (
                 <div style={{flex: 1, position: 'sticky', top: 20, height: '80vh'}}>
                    <Scratchpad onClose={() => setShowScratchpad(false)} />
                 </div>
              )}
           </div>
         )}
      </div>
    </div>
  );
}
