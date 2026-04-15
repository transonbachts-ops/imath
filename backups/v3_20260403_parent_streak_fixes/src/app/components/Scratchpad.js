'use client';
import { useRef, useState, useEffect } from 'react';

export default function Scratchpad({ onClose }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [mode, setMode] = useState('pen'); // 'pen' or 'eraser'
  const [color, setColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(3);
  
  // Resize canvas to match container dynamically
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    // We set explicit dimensions to prevent scaling blur
    const resizeCanvas = () => {
       const rect = container.getBoundingClientRect();
       // Save current image data
       const ctx = canvas.getContext('2d');
       const imgData = ctx.getImageData(0, 0, canvas.width || rect.width, canvas.height || rect.height);
       
       canvas.width = rect.width;
       canvas.height = rect.height;
       
       // Restore
       ctx.putImageData(imgData, 0, 0);
       
       // Set defaults again
       ctx.lineCap = 'round';
       ctx.lineJoin = 'round';
    };

    // Initial size
    resizeCanvas();
    
    // Resize observer
    const ro = new ResizeObserver(() => resizeCanvas());
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  // Update context when mode/style changes
  useEffect(() => {
     const canvas = canvasRef.current;
     if(!canvas) return;
     const ctx = canvas.getContext('2d');
     ctx.strokeStyle = mode === 'eraser' ? '#ffffff' : color;
     ctx.lineWidth = mode === 'eraser' ? 20 : lineWidth;
  }, [mode, color, lineWidth]);

  const startDrawing = (e) => {
    const ctx = canvasRef.current.getContext('2d');
    const { offsetX, offsetY } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(offsetX, offsetY);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const ctx = canvasRef.current.getContext('2d');
    const { offsetX, offsetY } = getCoordinates(e);
    ctx.lineTo(offsetX, offsetY);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const getCoordinates = (e) => {
    if (e.touches && e.touches.length > 0) {
      const rect = canvasRef.current.getBoundingClientRect();
      return {
         offsetX: e.touches[0].clientX - rect.left,
         offsetY: e.touches[0].clientY - rect.top
      };
    }
    return { offsetX: e.nativeEvent.offsetX, offsetY: e.nativeEvent.offsetY };
  };

  return (
    <div style={{display: 'flex', flexDirection: 'column', height: '100%', background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 5px 20px rgba(0,0,0,0.08)', border: '1px solid #ddd'}}>
      {/* TOOLBAR */}
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8f9fa', padding: '10px 15px', borderBottom: '1px solid #ddd'}}>
         <div style={{display: 'flex', gap: 10, alignItems: 'center'}}>
            <span style={{fontWeight: 'bold', marginRight: 10, color: '#333'}}>Bảng Nháp</span>
            <button 
               onClick={() => setMode('pen')} 
               style={{background: mode === 'pen' ? '#003380' : '#fff', color: mode === 'pen' ? '#fff' : '#333', border: '1px solid #ccc', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontWeight: 'bold'}}
            >✏️ Bút</button>
            <button 
               onClick={() => setMode('eraser')} 
               style={{background: mode === 'eraser' ? '#e74c3c' : '#fff', color: mode === 'eraser' ? '#fff' : '#333', border: '1px solid #ccc', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontWeight: 'bold'}}
            >🧽 Tẩy</button>
            
            {mode === 'pen' && (
               <input type="color" value={color} onChange={e => setColor(e.target.value)} style={{width: 30, height: 30, padding: 0, border: 'none', cursor: 'pointer'}} />
            )}
            
            <button onClick={clearCanvas} style={{background: '#fff', border: '1px solid #ccc', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', marginLeft: 10}}>🗑️ Xóa sạch</button>
         </div>
         {onClose && (
            <button onClick={onClose} style={{background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#888'}}>✖</button>
         )}
      </div>

      {/* DRAWING AREA */}
      <div ref={containerRef} style={{flex: 1, position: 'relative', cursor: mode === 'eraser' ? 'cell' : 'crosshair', touchAction: 'none'}}>
         <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseOut={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            style={{display: 'block', width: '100%', height: '100%'}}
         />
      </div>
    </div>
  );
}
