import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { redirect } from 'next/navigation';
import AdminUI from './AdminUI';

export default async function AdminPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token');
  
  if (!token) {
    redirect('/admin/login');
  }

  let user = null;
  try {
    user = jwt.verify(token.value, 'supersecret_smart_edu_key_999');
    if (user.role === 'teacher') {
      redirect('/teacher/dashboard'); // Send teachers to their own dedicated workspace
    } else if (user.role !== 'admin') {
      redirect('/dashboard'); // Kick any other non-admins out
    }
  } catch(e) {
    redirect('/admin/login');
  }

  return <AdminUI userRole={user.role} userId={user.userId} />;
}
