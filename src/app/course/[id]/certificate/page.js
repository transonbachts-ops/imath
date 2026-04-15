'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Head from 'next/head';
import Link from 'next/link';

export default function CertificatePage() {
  const params = useParams();
  const { id: courseId } = params;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState(null);
  const [user, setUser] = useState(null);
  const [dateStr, setDateStr] = useState('');

  useEffect(() => {
    fetchData();
  }, [courseId]);

  const fetchData = async () => {
    try {
      // 1. Fetch User Info (who am I)
      const resMe = await fetch('/api/me');
      if (resMe.ok) {
        const u = await resMe.json();
        setUser(u);
      }

      // 2. Fetch Course Info
      // We can use a public endpoint or admin endpoint. Since /api/admin/courses requires admin, let's just fetch from an existing student endpoint.
      // Easiest is to fetch the activities endpoint and extract course or just directly query.
      // But we don't have a direct /api/courses/[id] for students.
      // Instead, we can create a tiny proxy or just use the enrollments logic.
      // To save time, we will rely on a new server component or a quick API. But WAIT! Since this is a Client Component, I will fetch `/api/quizzes/1` wait no.
      // Can I just make `/api/certificate/[courseId]`? Yes, let's fetch that.
      const res = await fetch(`/api/certificate/${courseId}`);
      if (res.ok) {
         const data = await res.json();
         setCourse(data.course);
         setUser(data.user); // overrides /api/me to ensure we get proper full name
         setDateStr(new Date().toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric'}));
      } else {
         alert('Bạn chưa đủ điều kiện nhận chứng chỉ hoặc khóa học không tồn tại!');
         router.push(`/course/${courseId}/learn`);
      }
    } catch(e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) return <div style={{padding: 50, textAlign: 'center'}}>Đang tải chứng chỉ...</div>;
  if (!course || !user) return null;

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Dancing+Script:wght@700&family=Inter:wght@400;600;700&display=swap&subset=vietnamese');
        
        body { background: #e0e5ec; font-family: 'Inter', sans-serif; }
        
        @media print {
            body { background: white !important; margin: 0; padding: 0; }
            .no-print { display: none !important; }
            .cert-container { 
                box-shadow: none !important; 
                width: 100% !important; 
                max-width: none !important;
                margin: 0 !important;
                border: none !important;
                aspect-ratio: auto !important;
                height: 100vh !important;
                page-break-inside: avoid;
            }
        }
      `}} />
      
      <div style={{minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 20px'}}>
         
         <div className="no-print" style={{display: 'flex', gap: 20, marginBottom: 30}}>
            <Link href={`/course/${courseId}/learn`} style={{background: '#fff', color: '#003380', padding: '12px 25px', borderRadius: 30, textDecoration: 'none', fontWeight: 'bold', border: '1px solid #003380'}}>← Trở về Khóa Học</Link>
            <button onClick={handlePrint} style={{background: '#003380', color: '#fff', padding: '12px 25px', borderRadius: 30, border: 'none', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 15px rgba(0,51,128,0.3)'}}>🖨️ In / Tải PDF (Lưu ảnh)</button>
         </div>

         {/* CERTIFICATE CANVAS */}
         <div className="cert-container" style={{
             background: '#fff', 
             width: '100%', 
             maxWidth: 1000, 
             aspectRatio: '1.414 / 1', // standard cert proportion
             position: 'relative',
             boxShadow: '0 20px 50px rgba(0,0,0,0.15)',
             border: '1px solid #ddd',
             overflow: 'hidden'
         }}>
             {/* DESIGN ELEMENTS */}
             <div style={{position: 'absolute', top: 20, left: 20, right: 20, bottom: 20, border: '4px double #003380', pointerEvents: 'none'}}></div>
             <div style={{position: 'absolute', top: 0, left: 0, width: 140, height: 140, background: '#003380', clipPath: 'polygon(0 0, 100% 0, 0 100%)', pointerEvents: 'none'}}></div>
             <div style={{position: 'absolute', bottom: 0, right: 0, width: 140, height: 140, background: '#f39c12', clipPath: 'polygon(100% 100%, 0 100%, 100% 0)', pointerEvents: 'none'}}></div>

             {/* CONTENT */}
             <div style={{position: 'absolute', inset: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center'}}>
                 
                 <div style={{color: '#003380', fontSize: 24, fontWeight: 900, letterSpacing: 2, marginBottom: 40, fontFamily: "'Playfair Display', serif"}}>
                    IMATH EDUCATION
                 </div>
                 
                 <h1 style={{fontFamily: "'Playfair Display', serif", fontSize: 50, color: '#333', margin: '0 0 10px 0', letterSpacing: 3}}>CHỨNG CHỈ</h1>
                 <h2 style={{fontFamily: "'Playfair Display', serif", fontSize: 22, color: '#666', margin: '0 0 40px 0', fontWeight: 500, letterSpacing: 8}}>HOÀN THÀNH KHÓA HỌC</h2>

                 <p style={{fontSize: 16, color: '#777', margin: '0 0 15px 0', textTransform: 'uppercase', letterSpacing: 1}}>Trân trọng chứng nhận rằng</p>
                 
                 <div style={{fontSize: 52, fontWeight: 700, color: '#003380', marginBottom: 15, fontFamily: "'Dancing Script', cursive"}}>
                    {user.full_name || user.email}
                 </div>

                 <p style={{fontSize: 16, color: '#777', margin: '0 0 15px 0', letterSpacing: 0.5}}>Đã hoàn thành xuất sắc tất cả các yêu cầu của khóa học trực tuyến</p>

                 <div style={{fontSize: 28, fontWeight: 800, color: '#333', maxWidth: '80%', lineHeight: 1.4, margin: '0 0 60px 0', fontFamily: "'Playfair Display', serif"}}>
                    {course.title.toUpperCase()}
                 </div>

                 {/* SIGNATURES */}
                 <div style={{display: 'flex', width: '100%', justifyContent: 'space-between', padding: '0 60px', boxSizing: 'border-box', marginTop: 'auto'}}>
                     <div style={{textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
                         <div style={{fontSize: 16, fontWeight: 'bold', color: '#555', marginBottom: 5}}>Ngày cấp</div>
                         <div style={{borderBottom: '1px solid #000', width: 220, paddingBottom: 5, marginBottom: 5, fontSize: 16}}>{dateStr}</div>
                     </div>
                     
                     <div style={{textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
                         {/* SIGNATURE FONT */}
                         <div style={{fontFamily: "'Dancing Script', cursive", fontSize: 44, color: '#003380', marginBottom: -15, transform: 'rotate(-3deg)'}}>
                            Tran Son Bach
                         </div>
                         <div style={{borderBottom: '1px solid #000', width: 220, paddingBottom: 5, marginBottom: 5}}></div>
                         <div style={{fontSize: 18, fontWeight: 'bold', color: '#555'}}>Trần Sơn Bách</div>
                         <div style={{fontSize: 14, color: '#777'}}>Sáng lập & Giám đốc điều hành</div>
                     </div>
                 </div>

             </div>
         </div>
      </div>
    </>
  );
}
