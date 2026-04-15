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
    const [result] = await pool.query(
      'INSERT INTO users (full_name, email, password) VALUES (?, ?, ?)',
      [fullName, email, hashedPassword]
    );

    // Auto-generate invite_code for students
    const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();
    try {
      await pool.query('ALTER TABLE users ADD COLUMN invite_code VARCHAR(20) UNIQUE NULL');
    } catch(e) {}
    await pool.query('UPDATE users SET invite_code = ? WHERE id = ?', [inviteCode, result.insertId]);

    // --- FIX STREAK BUG: Auto-login the new user so they don't use the previous user's session ---
    const jwt = require('jsonwebtoken');
    const { cookies } = require('next/headers');
    const JWT_SECRET = 'supersecret_smart_edu_key_999';

    const token = jwt.sign(
      { userId: result.insertId, email: email, name: fullName, role: 'student' },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    const cookieStore = await cookies();
    cookieStore.set('token', token, {
      httpOnly: true,
      secure: false, 
      sameSite: 'lax',
      maxAge: 60 * 60 * 24
    });

    return NextResponse.json({ message: 'Đăng ký thành công!', user: { id: result.insertId, name: fullName, email: email, role: 'student' } }, { status: 201 });
  } catch (error) {
    console.error('Registration Error', error);
    return NextResponse.json({ error: 'Lỗi máy chủ nội bộ. Vui lòng thử lại sau.' }, { status: 500 });
  }
}
