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
    if (user.role !== 'admin' && user.role !== 'teacher') {
      redirect('/dashboard'); // Kick non-admins out to regular dashboard
    }
  } catch(e) {
    redirect('/admin/login');
  }

  return <AdminUI userRole={user.role} userId={user.userId} />;
}
