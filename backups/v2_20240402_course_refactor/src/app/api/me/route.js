import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'supersecret_smart_edu_key_999';

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token');
  
  if (!token) return NextResponse.json({ role: 'guest' });

  try {
    const user = jwt.verify(token.value, JWT_SECRET);
    return NextResponse.json({ id: user.userId, role: user.role, name: user.full_name });
  } catch(e) {
    return NextResponse.json({ role: 'guest' });
  }
}
