'use client';

export default function EventModal({ courses, form, setForm, onSave, onClose, isEditing = false }) {
  // Styles (Derived from AdminUI.js for consistency)
  const inputStyle = { width: '100%', padding: '12px 18px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '15px', fontSize: '14px', outline: 'none' };
  const primaryBtnStyle = { background: '#3b82f6', color: '#fff', border: 'none', padding: '12px 25px', borderRadius: '14px', fontWeight: '900', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', width: '100%', justifyContent: 'center', marginTop: '20px' };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
       <div style={{ background: '#fff', padding: '35px', borderRadius: '30px', width: '500px', boxShadow: '0 20px 50px rgba(0,0,0,0.2)' }}>
          <h3 style={{ fontSize: '22px', fontWeight: '900', marginBottom: '25px', color: '#0f172a' }}>
            {isEditing ? '✏️ Cập nhật lịch học' : '📅 Lịch học mới'}
          </h3>
          
          <label style={{ fontSize: '12px', fontWeight: '800', color: '#64748b', marginBottom: '8px', display: 'block' }}>NGÀY DIỄN RA</label>
          <input type="date" value={form.date ? form.date.split('T')[0] : ''} onChange={e => setForm({...form, date: e.target.value})} style={inputStyle} />
          
          <label style={{ fontSize: '12px', fontWeight: '800', color: '#64748b', marginBottom: '8px', display: 'block' }}>HÌNH THỨC</label>
          <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} style={inputStyle}>
             <option value="zoom">📹 Học Online (Zoom)</option>
             <option value="assignment">📝 Giao bài tập / Sự kiện</option>
          </select>
          
          <label style={{ fontSize: '12px', fontWeight: '800', color: '#64748b', marginBottom: '8px', display: 'block' }}>TIÊU ĐỀ</label>
          <input placeholder="Tiêu đề buổi học..." value={form.title} onChange={e => setForm({...form, title: e.target.value})} style={inputStyle} />
          
          {form.type === 'zoom' && (
            <>
              <label style={{ fontSize: '12px', fontWeight: '800', color: '#64748b', marginBottom: '8px', display: 'block' }}>LINK PHÒNG HỌC</label>
              <input placeholder="https://zoom.us/j/..." value={form.zoom_link || ''} onChange={e => setForm({...form, zoom_link: e.target.value})} style={inputStyle} />
            </>
          )}

          <label style={{ fontSize: '12px', fontWeight: '800', color: '#64748b', marginBottom: '8px', display: 'block' }}>LIÊN KẾT KHÓA HỌC</label>
          <select value={form.course_id || ''} onChange={e => setForm({...form, course_id: e.target.value})} style={inputStyle}>
             <option value="">🌎 Toàn hệ thống (Global)</option>
             {courses.map(c => (
               <option key={c.id} value={c.id}>{c.title}</option>
             ))}
          </select>

          <button onClick={onSave} style={primaryBtnStyle}>
            {isEditing ? 'Cập nhật thay đổi' : 'Lưu lịch học'}
          </button>
          
          <button onClick={onClose} style={{ border: 'none', background: 'none', width: '100%', marginTop: '10px', color: '#64748b', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}>
            Hủy bỏ
          </button>
       </div>
    </div>
  );
}
