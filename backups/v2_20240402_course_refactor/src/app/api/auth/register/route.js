import pool from '@/lib/db';
import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { fullName, email, password } = await req.json();

    if (!fullName || !email || !password) {
      return NextResponse.json({ error: 'Vui lòng nhập đầy đủ thông tin!' }, { status: 400 });
    }

    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return NextResponse.json({ error: 'Email này đã được sử dụng!' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query(
      'INSERT INTO users (full_name, email, password) VALUES (?, ?, ?)',
      [fullName, email, hashedPassword]
    );

    return NextResponse.json({ message: 'Đăng ký thành công!' }, { status: 201 });
  } catch (error) {
    console.error('Registration Error', error);
    return NextResponse.json({ error: 'Lỗi máy chủ nội bộ. Vui lòng thử lại sau.' }, { status: 500 });
  }
}
