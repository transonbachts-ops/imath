import pool from '@/lib/db';
import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { fullName, email, password, inviteCode } = await req.json();

    if (!fullName || !email || !password || !inviteCode) {
      return NextResponse.json({ error: 'Vui lòng điền đầy đủ thông tin và mã mời!' }, { status: 400 });
    }

    // 1. Validate invite code → find student
    const [students] = await pool.query(
      "SELECT id, full_name FROM users WHERE invite_code = ? AND role = 'student'",
      [inviteCode.trim().toUpperCase()]
    );
    if (students.length === 0) {
      return NextResponse.json({ error: 'Mã mời không hợp lệ. Vui lòng kiểm tra lại với con bạn.' }, { status: 400 });
    }
    const student = students[0];

    // 2. Check if student already linked
    const [existingLinks] = await pool.query(
      'SELECT id FROM parent_student_links WHERE student_id = ?', [student.id]
    );
    if (existingLinks.length > 0) {
      return NextResponse.json({ error: 'Học sinh này đã được liên kết với một tài khoản phụ huynh khác.' }, { status: 400 });
    }

    // 3. Check email uniqueness
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return NextResponse.json({ error: 'Email này đã được sử dụng!' }, { status: 400 });
    }

    // 4. Create parent account
    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      "INSERT INTO users (full_name, email, password, role) VALUES (?, ?, ?, 'parent')",
      [fullName, email, hashedPassword]
    );
    const parentId = result.insertId;

    // 5. Create parent-student link
    await pool.query(
      'INSERT INTO parent_student_links (parent_id, student_id) VALUES (?, ?)',
      [parentId, student.id]
    );

    return NextResponse.json({
      message: `Đăng ký thành công! Tài khoản đã được liên kết với học sinh ${student.full_name}.`
    }, { status: 201 });
  } catch (error) {
    console.error('Parent Register Error:', error);
    return NextResponse.json({ error: 'Lỗi máy chủ nội bộ. Vui lòng thử lại.' }, { status: 500 });
  }
}
