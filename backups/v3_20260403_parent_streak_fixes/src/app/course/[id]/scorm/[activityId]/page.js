'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

export default function ScormPlayer() {
  const router = useRouter();
  const params = useParams();
  const { id: courseId, activityId } = params;

  const [activity, setActivity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [scale, setScale] = useState(1);

  const playerContainerRef = useRef(null);
  const iframeWrapperRef = useRef(null);

  // SCORM Data State
  const scormData = useRef({
    score: null,
    status: 'incomplete', 
    successStatus: 'unknown',
    suspendData: null
  });

  useEffect(() => {
    fetchActivity();
  }, [activityId]);

  const fetchActivity = async () => {
    try {
      const res = await fetch(`/api/course/activities/${activityId}`);
      if (!res.ok) throw new Error('Failed to load activity');
      const data = await res.json();
      setActivity(data.activity);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  // AUTO-SCALE LOGIC
  useEffect(() => {
    if (loading || !activity) return;

    const handleResize = () => {
      if (!iframeWrapperRef.current) return;
      const container = iframeWrapperRef.current;
      const cw = container.clientWidth;
      const ch = container.clientHeight;

      // Most Storyline projects are centered in a fixed-size container (e.g. 720x540)
      // We assume a base size and try to stretch it. 
      // If the content is too small, we scale it up. 
      const baseWidth = 720;
      const baseHeight = 540;
      
      const scaleW = cw / baseWidth;
      const scaleH = ch / baseHeight;
      const newScale = Math.min(scaleW, scaleH);
      
      // We don't want to scale down unless necessary, 
      // but the user wants to "stretch" it out.
      setScale(Math.max(newScale, 1));
    };

    window.addEventListener('resize', handleResize);
    setTimeout(handleResize, 500); // Initial check after render
    return () => window.removeEventListener('resize', handleResize);
  }, [loading, activity]);

  const handleCommit = async (isManual = false) => {
    if (saveStatus === 'saving') return;
    setSaveStatus('saving');
    
    try {
      const res = await fetch('/api/course/scorm/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activityId,
          score: scormData.current.score,
          status: scormData.current.status,
          successStatus: scormData.current.successStatus,
          suspendData: scormData.current.suspendData,
          isManualComplete: isManual // FORCE COMPLETE FLAG
        })
      });
      if (res.ok) {
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 3000);
      } else {
        setSaveStatus('error');
      }
    } catch (err) {
      console.error('Commit failed:', err);
      setSaveStatus('error');
    }
  };

  const toggleFullscreen = () => {
    if (!playerContainerRef.current) return;
    if (!document.fullscreenElement) {
      playerContainerRef.current.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // SCORM API Implementation
  useEffect(() => {
    if (!activity) return;

    const api = {
      Initialize: (param) => { console.log('SCORM Initialized'); return "true"; },
      Terminate: (param) => { handleCommit(false); return "true"; },
      GetValue: (key) => {
        if (key === 'cmi.completion_status') return scormData.current.status;
        if (key === 'cmi.success_status') return scormData.current.successStatus;
        if (key === 'cmi.score.scaled') return scormData.current.score?.toString() || "";
        return "";
      },
      SetValue: (key, value) => {
        if (key === 'cmi.completion_status') scormData.current.status = value;
        if (key === 'cmi.success_status') scormData.current.successStatus = value;
        if (key === 'cmi.score.scaled') scormData.current.score = parseFloat(value);
        if (key === 'cmi.suspend_data') scormData.current.suspendData = value;
        return "true";
      },
      Commit: (param) => { handleCommit(false); return "true"; },
      GetLastError: () => "0",
      GetErrorString: () => "No Error",
      GetDiagnostic: () => ""
    };

    window.API_1484_11 = api;
    window.API = {
      LMSInitialize: (param) => "true",
      LMSFinish: (param) => { handleCommit(false); return "true"; },
      LMSGetValue: (key) => {
        if (key === 'cmi.core.lesson_status') return scormData.current.status;
        return "";
      },
      LMSSetValue: (key, value) => {
        if (key === 'cmi.core.lesson_status') {
           scormData.current.status = value;
           scormData.current.successStatus = value; // map for 1.2
        }
        if (key === 'cmi.core.score.raw') scormData.current.score = parseFloat(value);
        return "true";
      },
      LMSCommit: (param) => { handleCommit(false); return "true"; },
      LMSGetLastError: () => "0",
      LMSGetErrorString: () => "No Error",
      LMSGetDiagnostic: () => ""
    };

    return () => {
      delete window.API_1484_11;
      delete window.API;
    };
  }, [activity]);

  if (loading) return <div style={{padding: 40, textAlign: 'center', background: '#0f172a', color: '#fff', height: '100vh'}}>Đang tải bài học...</div>;
  if (error) return <div style={{padding: 40, textAlign: 'center', color: '#ff4d4d', background: '#0f172a', height: '100vh'}}>Lỗi: {error}</div>;

  return (
    <div ref={playerContainerRef} style={{height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#0f172a', fontFamily: "'Inter', system-ui, sans-serif"}}>
      {/* HEADER */}
      <div style={{height: 55, background: '#1e293b', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', color: '#fff', zIndex: 10, boxShadow: '0 4px 10px rgba(0,0,0,0.3)'}}>
         <div style={{display: 'flex', alignItems: 'center', gap: 15}}>
           <Link href={`/course/${courseId}/learn`} style={{color: '#94a3b8', textDecoration: 'none', fontSize: 18, display: 'flex', alignItems: 'center'}}>❮</Link>
           <h1 style={{fontSize: 15, fontWeight: 700, margin: 0, opacity: 0.9}}>{activity?.title}</h1>
         </div>
         
         <div style={{display: 'flex', alignItems: 'center', gap: 15}}>
            <button 
               onClick={toggleFullscreen}
               style={{background: 'transparent', border: '1px solid #475569', color: '#cbd5e1', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 500}}
            >
               {isFullscreen ? '⏹ Thu nhỏ' : '⛶ Toàn màn hình'}
            </button>

            <button 
               onClick={() => handleCommit(true)} // MANUAL COMPLETE
               disabled={saveStatus === 'saving'}
               style={{
                  background: saveStatus === 'saved' ? '#10b981' : saveStatus === 'error' ? '#ef4444' : 'linear-gradient(135deg, #38bdf8, #0ea5e9)', 
                  color: '#fff', 
                  border: 'none', 
                  padding: '8px 22px', 
                  borderRadius: 8, 
                  cursor: saveStatus === 'saving' ? 'default' : 'pointer', 
                  fontSize: 14, 
                  fontWeight: 800,
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  minWidth: 140,
                  boxShadow: saveStatus === 'saved' ? '0 4px 15px rgba(16, 185, 129, 0.3)' : '0 4px 15px rgba(56, 189, 248, 0.4)',
                  transform: saveStatus === 'saving' ? 'scale(0.98)' : 'scale(1)'
               }}
            >
               {saveStatus === 'saving' ? '⌛ Đang lưu...' : 
                saveStatus === 'saved' ? '✅ Đã lưu học' : 
                saveStatus === 'error' ? '❌ Lỗi' : '💾 Lưu & Hoàn thành'}
            </button>
         </div>
      </div>

      {/* PLAYER FRAME WRAPPER - FORCE CENTERED & STRETCHED */}
      <div 
        ref={iframeWrapperRef}
        style={{
          flex: 1, 
          position: 'relative', 
          background: '#000', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          padding: 0,
          overflow: 'hidden' // Important for scale
        }}
      >
         {activity?.url ? (
            <div style={{
               width: '100%', 
               height: '100%', 
               display: 'flex',
               alignItems: 'center',
               justifyContent: 'center',
               overflow: 'hidden'
            }}>
               <iframe 
                  src={activity.url}
                  style={{
                    width: '720px', // Base width
                    height: '540px', // Base height
                    border: 'none',
                    background: 'transparent',
                    transform: `scale(${scale})`, // DYNAMIC STRETCH
                    transformOrigin: 'center center',
                    transition: 'transform 0.3s ease-out'
                  }}
                  title="SCORM Content"
                  allowFullScreen
               />
            </div>
         ) : (
            <div style={{color: '#fff', padding: 40, textAlign: 'center', maxWidth: 500}}>
               <h2 style={{fontSize: 24, marginBottom: 15}}>⚠️</h2>
               <p style={{fontSize: 16, marginBottom: 20}}>Không tìm thấy đường dẫn bài học.</p>
               <Link href={`/course/${courseId}/learn`} style={{background: '#38bdf8', color: '#0f172a', padding: '10px 20px', borderRadius: 8, textDecoration: 'none', fontWeight: 'bold'}}>
                  Quay lại
               </Link>
            </div>
         )}
      </div>

      <style jsx global>{`
        body { margin: 0; padding: 0; overflow: hidden; height: 100vh; background: #000; }
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: #1e293b; }
        ::-webkit-scrollbar-thumb { background: #475569; border-radius: 4px; }
      `}</style>
    </div>
  );
}
