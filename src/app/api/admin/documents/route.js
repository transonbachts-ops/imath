import pool from '@/lib/db';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'supersecret_smart_edu_key_999';

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS documents (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      cover_image_url VARCHAR(500),
      introduction TEXT,
      pdf_url VARCHAR(500),
      table_of_contents TEXT,
      owner_id INT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  // Migration for existing tables
  try { await pool.query('ALTER TABLE documents ADD COLUMN owner_id INT NULL'); } catch(e){}
}

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await initDB();
    const user = jwt.verify(token.value, JWT_SECRET);
    
    let rows = [];
    if (user.role === 'teacher') {
      [rows] = await pool.query('SELECT * FROM documents WHERE owner_id = ? ORDER BY created_at DESC', [user.userId]);
    } else {
      [rows] = await pool.query('SELECT * FROM documents ORDER BY created_at DESC');
    }
    return NextResponse.json({ documents: rows }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  const cookieStore = await cookies();
  const token = cookieStore.get('token');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await initDB();
    const user = jwt.verify(token.value, JWT_SECRET);
    const data = await req.json();
    const { id, title, cover_image_url, introduction, pdf_url, table_of_contents } = data;

    if (id) {
      // Update: Teachers can only update their own
      if (user.role === 'teacher') {
        const [existing] = await pool.query('SELECT owner_id FROM documents WHERE id = ?', [id]);
        if (existing.length && existing[0].owner_id !== user.userId) {
          return NextResponse.json({ error: 'Không thể chỉnh sửa tài liệu của người khác' }, { status: 403 });
        }
      }
      await pool.query(
        'UPDATE documents SET title=?, cover_image_url=?, introduction=?, pdf_url=?, table_of_contents=? WHERE id=?',
        [title, cover_image_url, introduction, pdf_url, table_of_contents, id]
      );
      return NextResponse.json({ message: 'Cập nhật ấn phẩm thành công' }, { status: 200 });
    } else {
      // Insert
      const ownerId = user.role === 'teacher' ? user.userId : null;
      await pool.query(
        'INSERT INTO documents (title, cover_image_url, introduction, pdf_url, table_of_contents, owner_id) VALUES (?, ?, ?, ?, ?, ?)',
        [title, cover_image_url, introduction, pdf_url, table_of_contents, ownerId]
      );
      return NextResponse.json({ message: 'Tạo tài liệu thành công' }, { status: 201 });
    }
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  const cookieStore = await cookies();
  const token = cookieStore.get('token');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const user = jwt.verify(token.value, JWT_SECRET);
    const { id } = await req.json();

    if (user.role === 'teacher') {
      const [existing] = await pool.query('SELECT owner_id FROM documents WHERE id = ?', [id]);
      if (existing.length && existing[0].owner_id !== user.userId) {
        return NextResponse.json({ error: 'Không có quyền xóa' }, { status: 403 });
      }
    }

    await pool.query('DELETE FROM documents WHERE id = ?', [id]);
    return NextResponse.json({ message: 'Đã xóa ấn phẩm' }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
