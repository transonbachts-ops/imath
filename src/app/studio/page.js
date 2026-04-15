'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function StudioDashboard() {
  const [activeTab, setActiveTab] = useState('templates'); // 'templates', 'projects', 'profile'
  const [projects, setProjects] = useState([]);
  const [stats, setStats] = useState({ totalGames: 0, totalPlays: 0, avgEngagement: 'N/A' });
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [leaderboard, setLeaderboard] = useState(null); // { title: string, data: [] }
  const [showLb, setShowLb] = useState(false);

  const templates = [
    { id: 'match', title: 'Lật Hình Ghép Cặp', description: 'Học sinh lật thẻ bài để tìm các cặp ghép (Câu hỏi ↔ Đáp án). Phù hợp công thức, khái niệm, từ vựng toán học.', icon: '🎴', color: '#3b82f6', status: 'Sẵn sàng' },
    { id: 'quiz', title: 'Trắc Nghiệm Tốc Độ', description: 'Câu hỏi 4 lựa chọn với đếm ngược 30 giây. Điểm tính theo tốc độ và độ chính xác. Phù hợp mọi chủ đề.', icon: '⚡', color: '#10b981', status: 'Sẵn sàng' },
    { id: 'fillin', title: 'Điền Đáp Án Nhanh', description: 'Học sinh tự nhập kết quả tính toán. Hỗ trợ phân số, thập phân, số nguyên. Hệ thống Streak nhân điểm.', icon: '🔢', color: '#8b5cf6', status: 'Sẵn sàng' },
    { id: 'steps', title: 'Sắp Xếp Bước Giải', description: 'Kéo thả các bước giải bài toán vào đúng thứ tự logic. Luyện tư duy chứng minh và giải phương trình.', icon: '🔀', color: '#f59e0b', status: 'Sẵn sàng' },
    { id: 'wheel', title: 'Vòng Quay May Mắn', description: 'Quay vòng quay để nhận câu hỏi ngẫu nhiên và phần thưởng. Phù hợp hoạt động lớp học tương tác.', icon: '🎡', color: '#ec4899', status: 'Sẵn sàng' },
    { id: 'escape', title: 'Phòng Thoát Toán Học', description: 'Giải chuỗi bài toán có liên kết để mở khoá từng ổ khoá. Dành cho tư duy phân tích bậc cao.', icon: '🔐', color: '#ef4444', status: 'Sắp ra mắt' },
  ];

  useEffect(() => {
    fetch('/api/profile').then(r => r.json()).then(d => {
      if (d.user) setUser(d.user);
    });
    if (activeTab === 'projects' || activeTab === 'profile') fetchProjects();
    if (activeTab === 'profile') fetchStats();
  }, [activeTab]);

  // Determine back link target based on role
  const backHref = user?.role === 'admin' ? '/admin' : 
                   user?.role === 'teacher' ? '/teacher/dashboard' : 
                   user?.role === 'parent' ? '/parent/dashboard' : '/dashboard';

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/studio/projects');
      const data = await res.json();
      if (data.projects) setProjects(data.projects);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/studio/stats');
      const data = await res.json();
      if (!data.error) setStats(data);
    } catch (e) { console.error(e); }
  };

  const deleteProject = async (id) => {
    if (!confirm('Bạn có chắc chắn muốn xóa game này?')) return;
    try {
      const res = await fetch(`/api/studio/projects/${id}`, { method: 'DELETE' });
      if (res.ok) fetchProjects();
    } catch (e) { console.error(e); }
  };

  const copyCode = (code) => {
    const doCopy = () => {
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(code).then(() => {
          alert('Đã sao chép mã game: ' + code);
        }).catch(() => fallbackCopy(code));
      } else {
        fallbackCopy(code);
      }
    };
    const fallbackCopy = (text) => {
      const el = document.createElement('textarea');
      el.value = text;
      el.style.cssText = 'position:fixed;left:-9999px;top:-9999px;';
      document.body.appendChild(el);
      el.select();
      try { document.execCommand('copy'); alert('Đã sao chép mã game: ' + text); }
      catch (e) { alert('Mã game: ' + text + ' (sao chép thủ công)'); }
      document.body.removeChild(el);
    };
    doCopy();
  };

  const fetchLeaderboard = async (project) => {
    try {
      const res = await fetch(`/api/studio/projects/${project.id}/leaderboard`);
      const data = await res.json();
      setLeaderboard({ title: project.title, data: data.leaderboard || [] });
      setShowLb(true);
    } catch (e) { console.error(e); }
  };

  const exportStudentData = () => {
    if (!stats.history || stats.history.length === 0) {
      alert('Không có dữ liệu để xuất.');
      return;
    }

    const headers = ['Học sinh', 'Trò chơi', 'Loại game', 'Điểm số', 'Thời gian'];
    const rows = stats.history.map(h => [
      h.student_name,
      h.game_title,
      h.game_type === 'match' ? 'Ghép cặp' : 'Vòng quay',
      h.score,
      new Date(h.created_at).toLocaleString('vi-VN')
    ]);

    const csvContent = [headers, ...rows]
      .map(r => r.map(c => `"${String(c || '').replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `IMATH_STUDIO_ANALYTICS_${new Date().getTime()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex' }}>
      {/* Sidebar Navigation */}
      <aside style={{ width: '280px', background: '#1e293b', color: '#fff', padding: '30px 20px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '40px', padding: '0 10px' }}>
          <span style={{ fontSize: '30px' }}>🕹️</span>
          <span style={{ fontSize: '20px', fontWeight: '900', letterSpacing: '0.5px', background: 'linear-gradient(to right, #60a5fa, #fff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>iMath Studio</span>
        </div>

        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            onClick={() => setActiveTab('templates')}
            style={{
              padding: '12px 15px', borderRadius: '10px', border: 'none', textAlign: 'left', cursor: 'pointer',
              background: activeTab === 'templates' ? '#3b82f6' : 'transparent',
              color: activeTab === 'templates' ? '#fff' : '#cbd5e1', fontSize: '15px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '12px'
            }}
          >
            <span>🧩</span> Kho mẫu Game
          </button>
          <button
            onClick={() => setActiveTab('projects')}
            style={{
              padding: '12px 15px', borderRadius: '10px', border: 'none', textAlign: 'left', cursor: 'pointer',
              background: activeTab === 'projects' ? '#3b82f6' : 'transparent',
              color: activeTab === 'projects' ? '#fff' : '#cbd5e1', fontSize: '15px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '12px'
            }}
          >
            <span>📁</span> Dự án của tôi
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            style={{
              padding: '12px 15px', borderRadius: '10px', border: 'none', textAlign: 'left', cursor: 'pointer',
              background: activeTab === 'profile' ? '#3b82f6' : 'transparent',
              color: activeTab === 'profile' ? '#fff' : '#cbd5e1', fontSize: '15px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '12px'
            }}
          >
            <span>📊</span> Thống kê & Hồ sơ
          </button>
        </nav>

        <div style={{ marginTop: 'auto', paddingTop: '20px', borderTop: '1px solid #334155' }}>
           <Link href={backHref} style={{
              display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 15px', borderRadius: '10px',
              background: 'rgba(255,255,255,0.1)', color: '#fff', textDecoration: 'none', fontWeight: '600', fontSize: '14px'
           }}>
              <span>⬅️</span> Quay lại Hệ thống
           </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: '40px 60px', overflowY: 'auto' }}>
        {activeTab === 'templates' && (
          <div>
            <div style={{ marginBottom: '40px' }}>
              <h1 style={{ fontSize: '32px', fontWeight: '900', color: '#0f172a', marginBottom: '10px' }}>Thư viện Minigame</h1>
              <p style={{ color: '#64748b', fontSize: '16px' }}>Chọn một Template để bắt đầu sáng tạo nội dung của bạn.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '25px' }}>
              {templates.map(t => (
                <div key={t.id} style={{
                  background: '#fff', padding: '30px', borderRadius: '20px', border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.03)', position: 'relative'
                }}>
                  <div style={{ fontSize: '40px', marginBottom: '15px' }}>{t.icon}</div>
                  <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#0f172a', marginBottom: '10px' }}>{t.title}</h3>
                  <p style={{ fontSize: '14px', color: '#64748b', lineHeight: 1.6, marginBottom: '25px' }}>{t.description}</p>

                  {t.status === 'Sẵn sàng' ? (
                    <Link href={`/studio/create?type=${t.id}`} style={{
                      display: 'block', textAlign: 'center', background: t.color, color: '#fff',
                      padding: '12px', borderRadius: '12px', textDecoration: 'none', fontWeight: '700'
                    }}>
                      Bắt đầu tạo →
                    </Link>
                  ) : (
                    <div style={{ padding: '12px', textAlign: 'center', background: '#f1f5f9', color: '#94a3b8', borderRadius: '12px', fontWeight: '700' }}>
                      Sắp ra mắt
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'projects' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
              <div>
                <h1 style={{ fontSize: '32px', fontWeight: '900', color: '#0f172a', marginBottom: '10px' }}>Dự án của tôi</h1>
                <p style={{ color: '#64748b' }}>Quản lý các trò chơi bạn đã thiết lập trên hệ thống.</p>
              </div>
              <button onClick={fetchProjects} style={{ padding: '10px 20px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', color: '#1a56db', fontWeight: '600' }}>
                Làm mới 🔄
              </button>
            </div>

            {loading ? <div style={{ textAlign: 'center', padding: '100px', fontSize: '18px', color: '#64748b' }}>Đang tải dự án...</div> : (
              projects.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '100px', background: '#fff', borderRadius: '20px', border: '2px dashed #e2e8f0' }}>
                  <div style={{ fontSize: '50px', marginBottom: '20px' }}>📭</div>
                  <div style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>Bạn chưa có dự án nào</div>
                  <p style={{ color: '#64748b', marginTop: '10px' }}>Dùng Template để tạo game đầu tiên nhé.</p>
                </div>
              ) : (
                <div style={{ background: '#fff', borderRadius: '20px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <th style={{ padding: '20px', color: '#64748b', fontSize: '13px', fontWeight: '700' }}>TÊN DỰ ÁN AD / LOẠI GAME</th>
                        <th style={{ padding: '20px', color: '#64748b', fontSize: '13px', fontWeight: '700' }}>MÃ GAME</th>
                        <th style={{ padding: '20px', color: '#64748b', fontSize: '13px', fontWeight: '700' }}>NGÀY TẠO</th>
                        <th style={{ padding: '20px', color: '#64748b', fontSize: '13px', fontWeight: '700' }}>HÀNH ĐỘNG</th>
                      </tr>
                    </thead>
                    <tbody>
                      {projects.map(p => (
                        <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <div style={{ width: 40, height: 40, borderRadius: '8px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                                {p.game_type === 'match' ? '🎴' : (p.game_type === 'wheel' ? '🎡' : '🎮')}
                              </div>
                              <div>
                                <div style={{ fontWeight: '700', color: '#1e293b' }}>{p.title || 'Chưa đặt tên'}</div>
                                <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                   {p.game_type === 'match' ? 'Ghép Cặp' : (p.game_type === 'wheel' ? 'Vòng Quay' : p.game_type)}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '20px' }}>
                            <div onClick={() => copyCode(p.game_code)} style={{
                              display: 'inline-flex', alignItems: 'center', gap: 8, background: '#f1f5f9',
                              padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontFamily: 'monospace', fontWeight: '700'
                            }}>
                              {p.game_code} 📋
                            </div>
                          </td>
                          <td style={{ padding: '20px', color: '#64748b', fontSize: '14px' }}>
                            {new Date(p.created_at).toLocaleDateString('vi-VN')}
                          </td>
                          <td style={{ padding: '20px' }}>
                            <div style={{ display: 'flex', gap: 10 }}>
                              <button onClick={() => fetchLeaderboard(p)} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #3b82f6', background: '#3b82f61a', cursor: 'pointer', color: '#3b82f6', fontSize: '13px', fontWeight: '600' }}>🏆 Xếp hạng</button>
                              <Link href={`/studio/create?id=${p.id}`} style={{ textDecoration: 'none', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', color: '#1e293b', fontSize: '13px', fontWeight: '600' }}>✏️ Sửa</Link>
                              <button onClick={() => deleteProject(p.id)} style={{ padding: '8px 12px', borderRadius: '8px', border: 'none', background: '#ef44441a', color: '#ef4444', cursor: 'pointer', fontWeight: '600' }}>🗑️ Xóa</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </div>
        )}

        {activeTab === 'profile' && (
          <div style={{ maxWidth: '1100px', animation: 'fadeIn 0.6s cubic-bezier(0.22, 1, 0.36, 1)' }}>
            <div style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div>
                <h1 style={{ fontSize: '36px', fontWeight: '950', color: '#0f172a', marginBottom: '8px', letterSpacing: '-0.5px' }}>Hồ sơ Studio & Phân tích</h1>
                <p style={{ color: '#64748b', fontSize: '17px', fontWeight: '500' }}>Hệ thống đo lường hiệu quả học tập và nhận diện học lực học sinh.</p>
              </div>
              <button 
                onClick={fetchStats}
                style={{ padding: '12px 24px', borderRadius: '14px', border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', color: '#3b82f6', fontWeight: '700', fontSize: '14px', transition: '0.2s', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
              >
                Làm mới dữ liệu 🔄
              </button>
            </div>

            {/* Premium Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', marginBottom: '40px' }}>
              <StatCard title="Tổng số Game" value={stats.totalGames || 0} icon="🎮" color="linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)" />
              <StatCard title="Tổng lượt chơi" value={stats.totalPlays || 0} icon="📈" color="linear-gradient(135deg, #10b981 0%, #047857 100%)" />
              <StatCard title="Tương tác TB" value={stats.avgEngagement || '0'} icon="⚡" color="linear-gradient(135deg, #f59e0b 0%, #b45309 100%)" />
              <StatCard title="Học sinh hoàn thành" value={stats.uniqueStudents || 0} icon="🎯" color="linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 0.8fr)', gap: '24px', marginBottom: '40px' }}>
              {/* Score Analysis - Bar Chart */}
              <div style={{ background: '#fff', padding: '32px', borderRadius: '28px', border: '1px solid #e2e8f0', boxShadow: '0 10px 40px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                   <h3 style={{ fontSize: '20px', fontWeight: '900', color: '#1e293b', display: 'flex', alignItems: 'center', gap: 12 }}>
                     <span style={{ fontSize: '24px' }}>📊</span> Phân phối điểm số Minigame
                   </h3>
                   <div style={{ padding: '6px 12px', background: '#f8fafc', borderRadius: '8px', fontSize: '12px', fontWeight: '700', color: '#64748b' }}>Tiêu chuẩn 10.0</div>
                </div>
                
                <div style={{ height: '300px', display: 'flex', alignItems: 'flex-end', gap: '30px', padding: '0 20px 40px 20px', borderBottom: '1px solid #f1f5f9', position: 'relative' }}>
                   {['Giỏi', 'Khá/Trung bình', 'Yếu'].map((level, idx) => {
                     const row = stats.scoreDistribution?.find(r => r.level === level);
                     const count = row ? row.count : 0;
                     const max = Math.max(...(stats.scoreDistribution?.map(r => r.count) || [1]), 1);
                     const percentage = (count / max) * 100;
                     const colors = ['#10b981', '#f59e0b', '#ef4444'];
                     
                     return (
                       <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 15, position: 'relative' }}>
                          <div style={{ fontSize: '14px', fontWeight: '900', color: colors[idx] }}>{count} em</div>
                          <div style={{ 
                            width: '100%', 
                            height: `${percentage}%`, 
                            maxHeight: '240px',
                            background: `linear-gradient(180deg, ${colors[idx]} 0%, ${colors[idx]}dd 100%)`, 
                            borderRadius: '12px 12px 4px 4px',
                            transition: 'height 1s cubic-bezier(0.17, 0.67, 0.83, 0.67)',
                            boxShadow: `0 8px 20px -5px ${colors[idx]}44`
                          }}></div>
                          <div style={{ position: 'absolute', bottom: -30, fontSize: '13px', fontWeight: '800', color: '#64748b', whiteSpace: 'nowrap' }}>{level}</div>
                       </div>
                     );
                   })}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', padding: '32px', borderRadius: '28px', color: '#fff', position: 'relative', overflow: 'hidden', flex: 1 }}>
                  <div style={{ position: 'absolute', top: '-10px', right: '-10px', fontSize: '100px', opacity: 0.1 }}>⚠️</div>
                  <h3 style={{ fontSize: '18px', fontWeight: '900', color: '#fff', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span>💡</span> Các vấn đề cần lưu ý
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {stats.topMistakes && stats.topMistakes.length > 0 ? stats.topMistakes.map((m, idx) => (
                      <div key={idx} style={{ padding: '14px', background: 'rgba(255,255,255,0.08)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ fontSize: '13px', fontWeight: '800', color: '#94a3b8', marginBottom: 4 }}># {idx + 1} Lỗi phổ biến</div>
                        <div style={{ fontSize: '14px', fontWeight: '700', color: '#fca5a5', lineHeight: 1.4 }}>{m.question}</div>
                        <div style={{ fontSize: '12px', color: '#cbd5e1', marginTop: 8 }}>Xuất hiện {m.count} lần</div>
                      </div>
                    )) : (
                      <div style={{ textAlign: 'center', padding: '40px 0', color: '#cbd5e1', fontWeight: '500' }}>
                        Chưa ghi nhận câu hỏi sai nhiều. <br/>Hệ thống cần thêm dữ liệu chơi chi tiết.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Student Analysis Table */}
            <div style={{ background: '#fff', borderRadius: '28px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 15px 45px rgba(0,0,0,0.03)' }}>
               <div style={{ padding: '30px 40px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                  <div>
                    <h3 style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a' }}>Nhật ký Chi tiết & Kết quả</h3>
                    <p style={{ fontSize: '14px', color: '#64748b', marginTop: 6, fontWeight: '500' }}>Toàn bộ tiến trình làm bài của học sinh được lưu trữ tại đây.</p>
                  </div>
                  <button 
                    onClick={exportStudentData}
                    style={{ background: '#059669', color: '#fff', border: 'none', padding: '12px 28px', borderRadius: '16px', fontWeight: '800', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, transition: '0.2s', boxShadow: '0 8px 16px rgba(5,150,105,0.2)' }}
                  >
                    📥 Xuất Báo cáo CSV
                  </button>
               </div>

               
               <div style={{ width: '100%', overflowX: 'auto' }}>
                 <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ background: '#f8fafc' }}>
                       <tr>
                          <th style={thProfileStyle}>Học sinh</th>
                          <th style={thProfileStyle}>Tên Trò chơi</th>
                          <th style={{ ...thProfileStyle, textAlign: 'center' }}>Kết quả</th>
                          <th style={{ ...thProfileStyle, textAlign: 'right' }}>Thời gian</th>
                       </tr>
                    </thead>
                    <tbody>
                       {stats.history && stats.history.length > 0 ? stats.history.map((h, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', transition: '0.2s' }}>
                             <td style={tdProfileStyle}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                   <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>👤</div>
                                   <div style={{ fontWeight: '700', color: '#1e293b' }}>{h.student_name}</div>
                                </div>
                             </td>
                             <td style={tdProfileStyle}>
                                <div style={{ fontSize: '14px', fontWeight: '600', color: '#444' }}>{h.game_title}</div>
                                <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h.game_type === 'match' ? '🧩 Ghép cặp' : '🎡 Vòng quay'}</div>
                             </td>
                             <td style={{ ...tdProfileStyle, textAlign: 'center' }}>
                                <span style={{ background: '#f0fdf4', color: '#166534', padding: '6px 14px', borderRadius: '10px', fontWeight: '800', fontSize: '13px', border: '1px solid #dcfce7' }}>
                                   {h.score} điểm
                                </span>
                             </td>
                             <td style={{ ...tdProfileStyle, textAlign: 'right', color: '#64748b', fontSize: '13px' }}>
                                <div>{new Date(h.created_at).toLocaleDateString('vi-VN')}</div>
                                <div style={{ fontSize: 10 }}>{new Date(h.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</div>
                             </td>
                          </tr>
                        )) : (
                          <tr><td colSpan="4" style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>
                            <div style={{ fontSize: '40px', marginBottom: 10 }}>📊</div>
                            <div>Chưa có dữ liệu hoạt động nào được ghi nhận.</div>
                          </td></tr>
                       )}
                    </tbody>
                 </table>
               </div>
            </div>
          </div>
        )}
      </main>

      {/* Leaderboard Modal */}
      {showLb && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
          <div style={{ background: '#fff', width: '100%', maxWidth: '500px', borderRadius: '32px', padding: '40px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', position: 'relative' }}>
            <button onClick={() => setShowLb(false)} style={{ position: 'absolute', top: '25px', right: '25px', background: '#f1f5f9', border: 'none', width: '36px', height: '36px', borderRadius: '12px', cursor: 'pointer', fontSize: '18px', fontWeight: '900' }}>✕</button>
            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
              <div style={{ fontSize: '40px', marginBottom: '15px' }}>🏆</div>
              <h2 style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a' }}>Bảng xếp hạng</h2>
              <p style={{ color: '#64748b', fontSize: '14px', fontWeight: '600' }}>{leaderboard?.title}</p>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '400px', overflowY: 'auto', paddingRight: '5px' }}>
              {leaderboard?.data.length > 0 ? leaderboard.data.map((u, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px', background: i === 0 ? '#f0fdf4' : '#f8fafc', borderRadius: '16px', border: i === 0 ? '1px solid #dcfce7' : '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{ 
                      width: '32px', height: '32px', borderRadius: '50%', background: i===0 ? '#10b981' : (i===1 ? '#94a3b8' : (i===2 ? '#f59e0b' : '#e2e8f0')),
                      color: i<=2 ? '#fff' : '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '900'
                    }}>{u.rank}</div>
                    <span style={{ fontWeight: '700', color: '#1e293b' }}>{u.name}</span>
                  </div>
                  <span style={{ fontWeight: '900', color: i===0 ? '#10b981' : '#1e293b' }}>{u.score} đ</span>
                </div>
              )) : <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Chưa có lượt chơi nào.</div>}
            </div>
            
            <button onClick={() => setShowLb(false)} style={{ width: '100%', marginTop: '30px', padding: '15px', borderRadius: '16px', border: 'none', background: '#1e293b', color: '#fff', fontWeight: '800', cursor: 'pointer' }}>Đóng lại</button>
          </div>
        </div>
      )}
    </div>
  );
}

// --- HELPER COMPONENTS ---
function StatCard({ title, value, icon, color }) {
  return (
    <div style={{ background: '#fff', padding: '30px', borderRadius: '28px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '22px', boxShadow: '0 6px 20px rgba(0,0,0,0.03)', transition: '0.3s' }}>
      <div style={{ width: '64px', height: '64px', borderRadius: '20px', background: color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.2)' }}>{icon}</div>
      <div>
        <div style={{ fontSize: '14px', color: '#64748b', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 4 }}>{title}</div>
        <div style={{ fontSize: '30px', fontWeight: '950', color: '#0f172a', lineHeight: 1 }}>{value}</div>
      </div>
    </div>
  );
}

// --- STYLES ---
const thProfileStyle = { padding: '22px 40px', textAlign: 'left', fontSize: '12px', fontWeight: '950', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1.2px' };
const tdProfileStyle = { padding: '24px 40px' };

