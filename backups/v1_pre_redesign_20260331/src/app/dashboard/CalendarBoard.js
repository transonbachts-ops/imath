'use client';
import { useState, useEffect } from 'react';

export default function CalendarBoard() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    const res = await fetch('/api/events');
    const data = await res.json();
    setEvents(data.events || []);
    setLoading(false);
  };

  const todayObj = new Date();
  const currentMonth = todayObj.getMonth();
  const daysInMonth = new Date(todayObj.getFullYear(), currentMonth + 1, 0).getDate();
  const today = todayObj.getDate();
  
  return (
    <div style={{width: '100%', marginBottom: 40}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20}}>
         <h2 style={{color: '#003380', fontSize: 26, fontWeight: 900}}>📅 Lịch Trình Khóa Học</h2>
      </div>

      <div style={{display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 10, padding: 25, background: '#fff', borderRadius: 8, border: '1px solid #e0e0e0', boxShadow: '0 4px 15px rgba(0,0,0,0.02)'}}>
        {['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'].map(d => (
          <div key={d} style={{textAlign: 'center', fontWeight: 'bold', borderBottom: '3px solid #003380', paddingBottom: 10, color: '#666'}}>{d}</div>
        ))}

        {Array.from({length: daysInMonth}).map((_, i) => {
          const day = i + 1;
          const dayEvents = events.filter(e => {
            const eDate = new Date(e.date);
            return eDate.getDate() === day && eDate.getMonth() === currentMonth;
          });

          return (
             <div key={day} style={{border: '1px solid #ebebeb', borderRadius: 6, padding: 10, minHeight: 110, background: day === today ? '#f0f4f8' : '#fff', position: 'relative'}}>
               <span style={{fontWeight: 'bold', color: day === today ? '#003380' : '#aaa', fontSize: 16}}>{day}</span>
               <div style={{marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6}}>
                 {dayEvents.map(e => (
                   e.type === 'zoom' ? 
                   <a key={e.id} href={e.zoom_link} target="_blank" rel="noreferrer" style={{background: '#cc0000', color: '#fff', fontSize: 11, padding: '6px 8px', borderRadius: 4, textDecoration: 'none', display: 'block', textAlign: 'left', fontWeight: 'bold', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden'}}>📹 Lớp : {e.title}</a>
                   : <div key={e.id} style={{background: '#2980b9', color: '#fff', fontSize: 11, padding: '6px 8px', borderRadius: 4, textAlign: 'left', fontWeight: 'bold', cursor: 'pointer'}}>📝 Bài Tập</div>
                 ))}
               </div>
             </div>
          )
        })}
      </div>
    </div>
  )
}
