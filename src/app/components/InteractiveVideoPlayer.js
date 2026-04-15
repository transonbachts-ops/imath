'use client';
import { useState, useEffect, useRef } from 'react';

export default function InteractiveVideoPlayer({ url, interactions = [], onProgress, onComplete }) {
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [answeredIds, setAnsweredIds] = useState([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const playerRef = useRef(null); // For YouTube API
  const lastTimeRef = useRef(0);
  
  const isYoutube = url && (url.includes('youtube.com') || url.includes('youtu.be'));
  const getYoutubeId = (u) => {
    const match = u.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)?([\w-]{11})/);
    return match ? match[1] : null;
  };
  const ytId = isYoutube ? getYoutubeId(url) : null;

  // Sync progress to parent
  useEffect(() => {
    if (onProgress) {
      onProgress({ 
        answeredCount: answeredIds.length, 
        totalCount: interactions.length 
      });
    }
  }, [answeredIds, interactions]);

  // Handle Fullscreen state change
  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Initialize YouTube API if needed
  useEffect(() => {
    if (isYoutube) {
      if (!window.YT) {
        const tag = document.createElement('script');
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      } else if (window.YT && window.YT.Player) {
        initYT();
      }

      window.onYouTubeIframeAPIReady = () => {
         initYT();
      };
    }

    const interval = setInterval(() => {
      let now = 0;
      let dur = 0;
      if (isYoutube && playerRef.current && playerRef.current.getCurrentTime) {
        now = playerRef.current.getCurrentTime();
        dur = playerRef.current.getDuration();
      } else if (videoRef.current) {
        now = videoRef.current.currentTime;
        dur = videoRef.current.duration;
      }
      
      if (dur > 0) setDuration(dur);

      if (now !== lastTimeRef.current) {
        checkMarkers(now);
      }
    }, 400);

    return () => clearInterval(interval);
  }, [url, interactions, answeredIds, isPaused]);

  const initYT = () => {
    if (playerRef.current) return;
    playerRef.current = new window.YT.Player('yt-player', {
      events: {
        'onReady': (event) => {
          setDuration(event.target.getDuration());
        },
        'onStateChange': (event) => {
          if (event.data === window.YT.PlayerState.PLAYING) {
             setDuration(event.target.getDuration());
          }
          if (event.data === window.YT.PlayerState.ENDED) {
            if (onComplete) onComplete();
          }
        }
      }
    });
  };

  const checkMarkers = (time) => {
    setCurrentTime(time);
    const lastTime = lastTimeRef.current;
    
    // 1. Detect Forward Skipping
    // Find if student jumped past any UNANSWERED questons
    const skippedMarker = interactions.find(m => {
       // A marker is skipped if its time is in the past compared to current playback
       // BUT it has never been answered.
       return m.time < time - 0.5 && !answeredIds.includes(m.id);
    });

    if (skippedMarker) {
      // Force rewind to the first skipped question
      const firstSkipped = interactions
        .filter(m => !answeredIds.includes(m.id))
        .sort((a, b) => a.time - b.time)[0];

      if (firstSkipped && Math.abs(firstSkipped.time - time) > 1) {
        seekVideo(firstSkipped.time - 0.2);
        pauseVideo();
        setCurrentQuestion(firstSkipped);
        lastTimeRef.current = firstSkipped.time - 0.2;
        return;
      }
    }

    // 2. Normal Playback Detection (passing a marker organically)
    const activeMarker = interactions.find(m => {
      const isWasInWindow = (m.time > lastTime && m.time <= time);
      return isWasInWindow && !answeredIds.includes(m.id);
    });

    if (activeMarker && !isPaused) {
      pauseVideo();
      setCurrentQuestion(activeMarker);
    }
    
    lastTimeRef.current = time;
  };

  const seekVideo = (seconds) => {
    if (isYoutube && playerRef.current && playerRef.current.seekTo) {
      playerRef.current.seekTo(seconds, true);
    } else if (videoRef.current) {
      videoRef.current.currentTime = seconds;
    }
  };

  const pauseVideo = () => {
    setIsPaused(true);
    if (isYoutube && playerRef.current && playerRef.current.pauseVideo) {
      playerRef.current.pauseVideo();
    } else if (videoRef.current) {
      videoRef.current.pause();
    }
  };

  const playVideo = () => {
    setIsPaused(false);
    setCurrentQuestion(null);
    if (isYoutube && playerRef.current && playerRef.current.playVideo) {
      playerRef.current.playVideo();
    } else if (videoRef.current) {
      videoRef.current.play();
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => {
        alert(`Lỗi khi mở toàn màn hình: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const handleAnswer = (index) => {
    if (index === currentQuestion.correct) {
      setAnsweredIds([...answeredIds, currentQuestion.id]);
      playVideo();
    } else {
      alert('Rất tiếc, câu trả lời chưa đúng. Hãy thử lại nhé!');
    }
  };

  return (
    <div 
      ref={containerRef}
      style={{
        position: 'relative', 
        width: '100%', 
        borderRadius: isFullscreen ? 0 : 12, 
        overflow: 'hidden', 
        boxShadow: '0 10px 30px rgba(0,0,0,0.2)', 
        background: '#000',
        aspectRatio: isFullscreen ? 'auto' : '16/9',
        height: isFullscreen ? '100vh' : 'auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      
      {/* PLAYERS */}
      {isYoutube ? (
        <div style={{width: '100%', height: '100%'}}>
           <iframe 
             id="yt-player"
             style={{width: '100%', height: '100%', border: 'none'}}
             src={`https://www.youtube.com/embed/${ytId}?enablejsapi=1&rel=0`}
             allowFullScreen={false}
           />
        </div>
      ) : (
        <video 
          ref={videoRef}
          src={url}
          controls
          style={{width: '100%', height: '100%', display: 'block'}}
          onEnded={onComplete}
          onLoadedMetadata={(e) => setDuration(e.target.duration)}
          controlsList="nodownload"
        />
      )}

      {/* CUSTOM FULLSCREEN BUTTON (Visible hover) */}
      <button 
        onClick={toggleFullscreen}
        style={{
          position: 'absolute', top: 20, right: 20, 
          zIndex: 50, background: 'rgba(0,0,0,0.5)', border: 'none', 
          color: '#fff', padding: '8px 12px', borderRadius: 6, 
          cursor: 'pointer', fontSize: 13, fontWeight: 'bold',
          backdropFilter: 'blur(5px)'
        }}
      >
        {isFullscreen ? '✕ Thu nhỏ' : '⛶ Toàn màn hình'}
      </button>

      {/* VISUAL VERTICAL MARKERS (Touching the bottom native control bar) */}
      {duration > 0 && (
        <div style={{
            position: 'absolute', 
            bottom: isYoutube ? '14.5%' : '48px', 
            left: '0.8%', 
            right: '0.8%', 
            height: '14px', 
            pointerEvents: 'none',
            zIndex: 10
        }}>
          {interactions.map(m => (
            <div 
              key={m.id}
              style={{
                position: 'absolute',
                left: `${(m.time / duration) * 100}%`,
                width: '3px',
                height: '14px',
                background: answeredIds.includes(m.id) ? '#2ecc71' : '#f59e0b',
                top: '0px',
                transform: 'translateX(-50%)',
                boxShadow: '0 0 4px rgba(0,0,0,0.5)',
                borderBottom: '2px solid #fff'
              }}
            />
          ))}
        </div>
      )}

      {/* INTERACTIVE OVERLAY */}
      {currentQuestion && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, 
          background: 'rgba(0,0,0,0.85)', 
          zIndex: 100, 
          display: 'flex', alignItems: 'center', justifyContent: 'center', 
          padding: 20,
          backdropFilter: 'blur(10px)'
        }}>
          <div style={{
            background: '#fff', 
            padding: isFullscreen ? 60 : 40, 
            borderRadius: 24, 
            maxWidth: 600, 
            width: '90%', 
            textAlign: 'center',
            boxShadow: '0 30px 60px rgba(0,0,0,0.5)',
            animation: 'slideUp 0.4s ease-out',
            color: '#333'
          }}>
            <style dangerouslySetInnerHTML={{ __html: `
              @keyframes slideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            ` }} />
            <div style={{fontSize: 14, color: '#f59e0b', fontWeight: 800, marginBottom: 15, textTransform: 'uppercase', letterSpacing: 2}}>Câu hỏi tương tác</div>
            <h3 style={{fontSize: isFullscreen ? 28 : 22, color: '#003380', marginBottom: 35, lineHeight: 1.5}}>{currentQuestion.question}</h3>
            
            <div style={{display: 'flex', flexDirection: 'column', gap: 15}}>
              {currentQuestion.options.map((opt, i) => (
                <button 
                  key={i}
                  onClick={() => handleAnswer(i)}
                  style={{
                    padding: '16px 25px', 
                    borderRadius: 15, 
                    border: '2px solid #e2e8f0', 
                    background: '#fff', 
                    fontSize: isFullscreen ? 18 : 16, 
                    fontWeight: 700, 
                    cursor: 'pointer',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    color: '#1e293b',
                    textAlign: 'left'
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.borderColor = '#003380'; e.currentTarget.style.background = '#f8faff'; e.currentTarget.style.transform = 'scale(1.02)'; }}
                  onMouseOut={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#fff'; e.currentTarget.style.transform = 'scale(1)'; }}
                >
                  {String.fromCharCode(65 + i)}. {opt}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
