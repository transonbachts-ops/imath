'use client';
import { useState, useEffect } from 'react';

export default function CalendarBoard({ variant = 'default', dailyQuizzes = [], showDailyQuiz = false }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const res = await fetch('/api/events');
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
      }
    } catch (e) {
      console.error('Failed to fetch events:', e);
    }
    setLoading(false);
  };

  // Calendar Math
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-11
  
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 is Sunday
  
  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToToday = () => setCurrentDate(new Date());

  const monthNames = [
    "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
    "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"
  ];

  const today = new Date();
  const isCurrentMonth = today.getMonth() === month && today.getFullYear() === year;

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>Đang tải lịch trình...</div>;

  return (
    <div style={{ width: '100%', marginBottom: variant === 'full' ? 0 : 40 }}>
      {/* HEADER CONTROLS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25, flexWrap: 'wrap', gap: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
          <h2 style={{ color: 'var(--text-primary)', fontSize: H2bmath_fontSize(variant), fontWeight: 950, letterSpacing: -1 }}>
            {variant === 'full' ? '🗓️ ' : '📅 '}{monthNames[month]} {year}
          </h2>
          <button onClick={goToToday} style={{ background: 'var(--primary-light)', color: 'var(--primary)', border: 'none', padding: '6px 15px', borderRadius: 20, fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>Hôm nay</button>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          {/* LEGEND */}
          <div style={{ display: 'flex', gap: 15, fontSize: 11, fontWeight: 700 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#dc2626' }}>● Zoom</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--primary)' }}>● Bài tập</span>
            {showDailyQuiz && <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#15803d' }}>● Daily Quiz</span>}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={prevMonth} style={navButtonStyle}>❮</button>
            <button onClick={nextMonth} style={navButtonStyle}>❯</button>
          </div>
        </div>
      </div>

      <div className="glass-panel" style={{
        display: 'grid', 
        gridTemplateColumns: 'repeat(7, 1fr)', 
        gap: variant === 'full' ? 12 : 8, 
        padding: variant === 'full' ? 30 : 20, 
        background: 'var(--card-bg)', 
        borderRadius: 24, 
        border: '1px solid var(--glass-border)', 
        boxShadow: 'var(--glass-shadow)', 
        backdropFilter: 'blur(20px)'
      }}>
        {/* WEEKDAYS */}
        {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map(d => (
          <div key={d} style={{ textAlign: 'center', fontWeight: 900, pb: 15, color: 'var(--text-secondary)', fontSize: 13, borderBottom: '2px solid var(--border-muted)', paddingBottom: 10, marginBottom: 10, letterSpacing: 1 }}>{d}</div>
        ))}

        {/* EMPTY CELLS AT START */}
        {Array.from({ length: firstDayOfMonth }).map((_, i) => (
          <div key={`empty-${i}`} style={{ minHeight: variant === 'full' ? 140 : 100, border: '1px solid transparent', opacity: 0.3 }}></div>
        ))}

        {/* ACTUAL DAYS */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const isToday = isCurrentMonth && today.getDate() === day;
          
          const dayEvents = events.filter(e => {
            const eDate = new Date(e.date);
            return eDate.getDate() === day && eDate.getMonth() === month && eDate.getFullYear() === year;
          });

          // Daily Quiz Status Check
          let dailyQuizUi = null;
          if (showDailyQuiz) {
            const isPastOrToday = new Date(year, month, day, 23, 59, 59) < today || isToday;
            if (isPastOrToday) {
               const dateKey = `${year}-${String(month+1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
               const dq = dailyQuizzes.find(d => d.date === dateKey);
               if (dq) {
                  dailyQuizUi = <div style={{ marginTop: 6, fontSize: 11, fontWeight: 800, color: '#15803d' }}><span style={{ background: '#dcfce7', padding: '2px 6px', borderRadius: 4, display: 'inline-block' }}>✓ {dq.score}đ</span></div>;
               } else {
                  dailyQuizUi = <div style={{ marginTop: 6, fontSize: 11, fontWeight: 900, color: '#b91c1c' }}><span style={{ background: '#fee2e2', padding: '2px 8px', borderRadius: 4, display: 'inline-block' }}>✕</span></div>;
               }
            }
          }

          return (
             <div key={day} style={{
               border: '1px solid var(--border-muted)', 
               borderRadius: 16, 
               padding: variant === 'full' ? 15 : 12, 
               minHeight: variant === 'full' ? 140 : 100, 
               background: isToday ? 'var(--primary-light)' : 'rgba(255, 255, 255, 0.02)', 
               position: 'relative', 
               transition: 'all 0.2s ease',
               cursor: dayEvents.length > 0 ? 'pointer' : 'default',
               boxShadow: isToday ? '0 8px 20px rgba(79, 70, 229, 0.15)' : 'none',
               display: 'flex',
               flexDirection: 'column'
             }} className="calendar-day">
               <span style={{
                 fontWeight: 950, 
                 color: isToday ? 'var(--primary)' : 'var(--text-muted)', 
                 fontSize: 18,
                 display: 'block',
                 marginBottom: 10
               }}>{day}</span>
               
               <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, overflowY: 'auto' }}>
                 {dayEvents.map(e => (
                   e.type === 'zoom' ? 
                   <a key={e.id} href={e.zoom_link} target="_blank" rel="noreferrer" title={`Zoom: ${e.title} (${e.course_title || 'Chung'})`} style={{
                     background: 'linear-gradient(135deg, #ef4444, #dc2626)', 
                     color: '#fff', 
                     fontSize: 10, 
                     padding: '5px 8px', 
                     borderRadius: 8, 
                     textDecoration: 'none', 
                     display: 'block', 
                     fontWeight: 800, 
                     whiteSpace: 'nowrap', 
                     textOverflow: 'ellipsis', 
                     overflow: 'hidden',
                     boxShadow: '0 4px 10px rgba(239, 68, 68, 0.2)'
                   }}>
                     📹 {e.title}
                     <span style={{ display: 'block', fontSize: '8px', opacity: 0.8, marginTop: 2 }}>{e.course_title || 'Chung'}</span>
                   </a>
                   : <div key={e.id} title={`${e.title} (${e.course_title || 'Chung'})`} style={{
                     background: 'linear-gradient(135deg, var(--primary), #6366f1)', 
                     color: '#fff', 
                     fontSize: 10, 
                     padding: '5px 8px', 
                     borderRadius: 8, 
                     fontWeight: 800,
                     whiteSpace: 'nowrap', 
                     textOverflow: 'ellipsis', 
                     overflow: 'hidden',
                     boxShadow: '0 4px 10px rgba(79, 70, 229, 0.2)'
                   }}>
                     📝 {e.title}
                     <span style={{ display: 'block', fontSize: '8px', opacity: 0.8, marginTop: 2 }}>{e.course_title || 'Chung'}</span>
                   </div>
                 ))}
                 {dailyQuizUi}
               </div>
             </div>
          )
        })}
      </div>
    </div>
  )
}

function H2bmath_fontSize(variant) {
  return variant === 'full' ? 32 : 24;
}

const navButtonStyle = {
  background: 'var(--card-bg)',
  border: '1px solid var(--border-muted)',
  color: 'var(--text-primary)',
  width: 40,
  height: 40,
  borderRadius: '50%',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 14,
  fontWeight: 'bold',
  transition: '0.2s',
  boxShadow: '0 4px 10px rgba(0,0,0,0.05)'
};
