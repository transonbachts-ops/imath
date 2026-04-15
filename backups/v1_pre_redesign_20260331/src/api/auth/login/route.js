import pool from '@/lib/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const JWT_SECRET = 'supersecret_smart_edu_key_999';

export async function POST(req) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Vui lòng nhập Email và Mật khẩu!' }, { status: 400 });
    }

    const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return NextResponse.json({ error: 'Thông tin đăng nhập không chính xác!' }, { status: 401 });
    }

    const user = users[0];
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return NextResponse.json({ error: 'Thông tin đăng nhập không chính xác!' }, { status: 401 });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, name: user.full_name, role: user.role },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    const cookieStore = await cookies();
    cookieStore.set('token', token, {
      httpOnly: true,
      secure: false, // Disabled to allow login via VPN IP without HTTPS
      sameSite: 'lax',
      maxAge: 60 * 60 * 24
    });

    return NextResponse.json({
      message: 'Đăng nhập thành công!',
      user: { id: user.id, name: user.full_name, email: user.email }
    }, { status: 200 });

  } catch (error) {
    console.error('Login Error', error);
    return NextResponse.json({ error: 'Lỗi máy chủ nội bộ!' }, { status: 500 });
  }
}

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token');
  if (!token) {
    return NextResponse.json({ user: null });
  }
  try {
    const decoded = jwt.verify(token.value, JWT_SECRET);
    return NextResponse.json({ user: decoded });
  } catch(e) {
    return NextResponse.json({ user: null });
  }
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete('token');
  return NextResponse.json({ message: 'Đăng xuất thành công!' });
}
