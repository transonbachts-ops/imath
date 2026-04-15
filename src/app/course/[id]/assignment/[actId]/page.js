import pool from '@/lib/db';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { redirect } from 'next/navigation';
import Link from 'next/link';

const JWT_SECRET = 'supersecret_smart_edu_key_999';

export default async function AssignmentPage({ params }) {
  const { id, actId } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get('token');
  if (!token) redirect('/login');

  let user = null;
  try { user = jwt.verify(token.value, JWT_SECRET); } catch(e) { redirect('/login'); }

  const [activities] = await pool.query('SELECT * FROM course_activities WHERE id = ?', [actId]);
  if (!activities.length) return <div>Không tìm thấy hoạt động.</div>;
  const activity = activities[0];

  const studentId = user.userId || user.id;
  const [submissions] = await pool.query('SELECT * FROM assignment_submissions WHERE activity_id = ? AND student_id = ?', [actId, studentId]);
  const submission = submissions[0] || null;

  const isLate = activity.due_date && new Date() > new Date(activity.due_date);
  const formattedDueDate = activity.due_date ? new Date(activity.due_date).toLocaleString('vi-VN') : 'Không có hạn';

  return (
    <div style={{ padding: '40px', maxWidth: '1000px', margin: '0 auto', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ marginBottom: '30px' }}>
        <Link href={`/course/${id}/learn`} style={{ color: '#003380', textDecoration: 'none', fontWeight: 'bold' }}>← Quay lại bài học</Link>
      </div>

      <div style={{ background: '#fff', borderRadius: '16px', padding: '40px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: '1px solid #eee' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div>
            <h1 style={{ fontSize: '28px', color: '#003380', margin: '0 0 10px 0' }}>📂 {activity.title}</h1>
            <div style={{ color: '#666', fontSize: '14px' }}>
              <span style={{ marginRight: '20px' }}>📅 Hạn nộp: <b style={{ color: isLate ? '#e74c3c' : '#333' }}>{formattedDueDate}</b></span>
              {isLate && <span style={{ color: '#e74c3c', fontWeight: 'bold' }}>(Đã quá hạn)</span>}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '12px', color: '#888', marginBottom: '5px' }}>Trạng thái:</div>
            <div style={{ 
              background: submission ? '#e8f5e9' : '#fff3e0', 
              color: submission ? '#2e7d32' : '#ef6c00', 
              padding: '6px 15px', 
              borderRadius: '20px', 
              fontSize: '13px', 
              fontWeight: 'bold',
              border: `1px solid ${submission ? '#2e7d32' : '#ef6c00'}`
            }}>
              {submission ? '✅ Đã nộp bài' : '⏳ Chưa nộp bài'}
            </div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid #eee', paddingTop: '20px' }}>
          <h3 style={{ fontSize: '18px', marginBottom: '15px' }}>Mô tả & Hướng dẫn</h3>
          <div style={{ color: '#444', lineHeight: '1.6', fontSize: '15px', whiteSpace: 'pre-wrap' }}>
            {activity.details || 'Không có hướng dẫn chi tiết.'}
          </div>
          
          {activity.url && (
            <div style={{ marginTop: '20px', padding: '15px', background: '#f8f9fa', borderRadius: '8px', border: '1px dashed #ddd' }}>
               <div style={{ fontSize: '13px', color: '#666', marginBottom: '10px' }}>Tài liệu đính kèm:</div>
               <a href={activity.url} target="_blank" style={{ color: '#003380', fontWeight: 'bold', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
                 📄 Tải về tài liệu bài tập
               </a>
            </div>
          )}
        </div>

        <div style={{ marginTop: '40px', borderTop: '1px solid #eee', paddingTop: '30px' }}>
          <h3 style={{ fontSize: '18px', marginBottom: '20px' }}>Nộp bài của bạn</h3>
          <AssignmentUploadClient 
            activityId={actId} 
            existingSubmission={submission} 
            isLate={isLate}
          />
        </div>
      </div>
    </div>
  );
}

// Client Component for upload
function AssignmentUploadClient({ activityId, existingSubmission, isLate }) {
  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <form id="submissionForm" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>Nội dung / Ghi chú</label>
          <textarea 
            id="submissionContent"
            defaultValue={existingSubmission?.content || ''}
            placeholder="Nhập câu trả lời hoặc ghi chú cho giáo viên..." 
            style={{ width: '100%', height: '120px', padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }}
          />
        </div>
        
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>File bài làm (Tối đa 10MB)</label>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <input 
              type="text" 
              id="submissionUrl"
              defaultValue={existingSubmission?.file_url || ''}
              placeholder="Link file hoặc dán URL..." 
              style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
              readOnly
            />
            <label style={{ background: '#003380', color: '#fff', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>
              📤 Chọn File
              <input type="file" style={{ display: 'none' }} id="fileInput" />
            </label>
          </div>
          {existingSubmission && (
            <div style={{ marginTop: '10px', fontSize: '12px' }}>
              File hiện tại: <a href={existingSubmission.file_url} target="_blank" style={{ color: '#003380' }}>{existingSubmission.file_url.split('/').pop()}</a>
            </div>
          )}
        </div>

        <button 
           id="submitBtn"
           type="button"
           style={{ background: '#2ecc71', color: '#fff', border: 'none', padding: '15px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px' }}
        >
          {existingSubmission ? 'Cập Nhật Bài Nộp' : 'Nộp Bài Ngay'}
        </button>
      </form>

      <script dangerouslySetInnerHTML={{ __html: `
        document.getElementById('fileInput').addEventListener('change', async (e) => {
          const file = e.target.files[0];
          if (!file) return;
          const btn = document.getElementById('submitBtn');
          btn.disabled = true;
          btn.innerText = '⌛ Đang tải file...';
          
          const formData = new FormData();
          formData.append('file', file);
          const res = await fetch('/api/admin/upload', { method: 'POST', body: formData });
          const data = await res.json();
          if (res.ok) {
            document.getElementById('submissionUrl').value = data.url;
            btn.innerText = '✅ Đã tải file xong';
          } else {
            alert(data.error);
            btn.innerText = 'Lỗi!';
          }
          btn.disabled = false;
        });

        document.getElementById('submitBtn').addEventListener('click', async () => {
          const content = document.getElementById('submissionContent').value;
          const file_url = document.getElementById('submissionUrl').value;
          const res = await fetch('/api/assignments/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ activity_id: ${activityId}, content, file_url })
          });
          const data = await res.json();
          if (res.ok) {
            alert('Đã nộp bài thành công!');
            window.location.reload();
          } else {
            alert(data.error);
          }
        });
      ` }} />
    </div>
  );
}
