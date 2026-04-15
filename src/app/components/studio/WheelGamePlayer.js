'use client';
import { useState, useRef, useEffect } from 'react';

export default function WheelGamePlayer({ config }) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [result, setResult] = useState(null);
  const canvasRef = useRef(null);
  const [segments, setSegments] = useState([]);

  useEffect(() => {
    if (config && config.segments) {
      setSegments(config.segments);
    } else {
      // Default segments if none provided
      setSegments([
        { label: '500đ', color: '#ef4444' },
        { label: '1000đ', color: '#3b82f6' },
        { label: 'Mất lượt', color: '#1e293b' },
        { label: '2000đ', color: '#10b981' },
        { label: 'Câu hỏi', color: '#f59e0b' },
        { label: 'Thêm lượt', color: '#8b5cf6' }
      ]);
    }
  }, [config]);

  useEffect(() => {
    drawWheel();
  }, [segments]);

  const drawWheel = (rotation = 0) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY) - 10;

    ctx.clearRect(0, 0, width, height);

    const step = (Math.PI * 2) / segments.length;

    segments.forEach((seg, i) => {
      ctx.beginPath();
      ctx.fillStyle = seg.color;
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, rotation + i * step, rotation + (i + 1) * step);
      ctx.fill();
      ctx.stroke();

      // Draw text
      ctx.save();
      ctx.fillStyle = '#fff';
      ctx.translate(centerX, centerY);
      ctx.rotate(rotation + i * step + step / 2);
      ctx.textAlign = 'right';
      ctx.font = 'bold 16px Inter';
      ctx.fillText(seg.label, radius - 20, 5);
      ctx.restore();
    });

    // Draw center pin
    ctx.beginPath();
    ctx.fillStyle = '#fff';
    ctx.arc(centerX, centerY, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 3;
    ctx.stroke();
  };

  const spin = () => {
    if (isSpinning) return;
    setIsSpinning(true);
    setResult(null);

    const spinRotation = Math.random() * 10 + 20; // Random amount to spin
    const duration = 4000;
    const startTime = performance.now();

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function (easeOutQuad)
      const easeOut = (t) => t * (2 - t);
      const easeOutProgress = easeOut(progress);

      const currentRotation = easeOutProgress * spinRotation;
      drawWheel(currentRotation);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setIsSpinning(false);
        // Calculate result
        const finalRotation = (currentRotation % (Math.PI * 2));
        const segmentStep = (Math.PI * 2) / segments.length;
        
        // The pointer is at 0 degrees (3 o'clock) but wheel rotates clockwise.
        // We need to calculate which segment is "under the needle" (usually at 0 or 270 degrees).
        // Let's assume the needle is at the top (270 degrees = 1.5 * PI)
        let winningIndex = Math.floor((1.5 * Math.PI - (finalRotation % (Math.PI * 2)) + (Math.PI * 2)) % (Math.PI * 2) / segmentStep);
        setResult(segments[winningIndex]);
        if (onComplete) onComplete(segments[winningIndex]);
      }
    };

    requestAnimationFrame(animate);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '30px', padding: '40px' }}>
      <div style={{ position: 'relative' }}>
         {/* Top Arrow/Needle */}
         <div style={{
           position: 'absolute', top: '-15px', left: '50%', transform: 'translateX(-50%)',
           width: 0, height: 0, borderLeft: '15px solid transparent', borderRight: '15px solid transparent',
           borderTop: '30px solid #1e293b', zIndex: 10
         }}></div>

         <canvas 
           ref={canvasRef} 
           width={400} 
           height={400} 
           style={{ maxWidth: '100%', borderRadius: '50%', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
         />
      </div>

      <button 
        onClick={spin} 
        disabled={isSpinning}
        style={{
          padding: '15px 50px', fontSize: '20px', fontWeight: 'bold', background: isSpinning ? '#cbd5e1' : '#3b82f6',
          color: '#fff', border: 'none', borderRadius: '50px', cursor: isSpinning ? 'not-allowed' : 'pointer',
          boxShadow: '0 4px 15px rgba(59, 130, 246, 0.4)', transition: '0.2s'
        }}
      >
        {isSpinning ? 'ĐANG QUAY...' : 'QUAY NGAY 🚀'}
      </button>

      {result && (
        <div style={{
          padding: '20px 40px', background: '#fff', borderRadius: '15px', 
          border: `2px solid ${result.color}`, textAlign: 'center', boxShadow: '0 10px 20px rgba(0,0,0,0.05)',
          animation: 'pop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
        }}>
          <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '5px' }}>KẾT QUẢ</div>
          <div style={{ fontSize: '28px', fontWeight: '900', color: result.color }}>{result.label}</div>
        </div>
      )}

      <style jsx>{`
        @keyframes pop {
          0% { transform: scale(0.8); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
