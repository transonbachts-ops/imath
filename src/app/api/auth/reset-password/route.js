import pool from '@/lib/db';
import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { email, fullName, newPassword } = await req.json();

    if (!email || !fullName || !newPassword) {
      return NextResponse.json({ error: 'Vui lòng nhập đầy đủ thông tin!' }, { status: 400 });
    }

    // Find the user by exactly matching Name and Email
    const [users] = await pool.query(
      'SELECT id, role FROM users WHERE email = ? AND full_name = ?',
      [email.trim(), fullName.trim()]
    );

    if (!users.length) {
      return NextResponse.json({ error: 'Thông tin không khớp với bất kỳ tài khoản nào!' }, { status: 404 });
    }

    const user = users[0];

    // Security Constraint: Admins cannot reset password through this flow
    if (user.role === 'admin') {
      return NextResponse.json({ error: 'Tài khoản quản trị không thể khôi phục bằng cách này. Vui lòng liên hệ hỗ trợ hệ thống.' }, { status: 403 });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the password
    await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, user.id]);

    return NextResponse.json({ message: 'Đặt lại mật khẩu thành công! Bạn có thể đăng nhập ngay now.' });

  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({ error: 'Lỗi máy chủ: ' + error.message }, { status: 500 });
  }
}
