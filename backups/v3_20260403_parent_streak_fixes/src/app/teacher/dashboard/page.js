import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { redirect } from 'next/navigation';
import TeacherUI from './TeacherUI';

export default async function TeacherDashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token');
  
  if (!token) {
    redirect('/admin/login');
  }

  let user = null;
  try {
    user = jwt.verify(token.value, 'supersecret_smart_edu_key_999');
    if (user.role !== 'teacher') {
      redirect('/admin'); // Kick non-teachers out to admin (which handles routing to normal dashboard if needed)
    }
  } catch(e) {
    redirect('/admin/login');
  }

  return <TeacherUI userId={user.userId} />;
}
