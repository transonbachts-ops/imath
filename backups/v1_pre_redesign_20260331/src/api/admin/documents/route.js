import pool from '@/lib/db';
import { NextResponse } from 'next/server';

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS documents (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      cover_image_url VARCHAR(500),
      introduction TEXT,
      pdf_url VARCHAR(500),
      table_of_contents TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

export async function GET() {
  try {
    await initDB();
    const [rows] = await pool.query('SELECT * FROM documents ORDER BY created_at DESC');
    return NextResponse.json({ documents: rows }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await initDB();
    const data = await req.json();
    const { id, title, cover_image_url, introduction, pdf_url, table_of_contents } = data;

    if (id) {
      // Update
      await pool.query(
        'UPDATE documents SET title=?, cover_image_url=?, introduction=?, pdf_url=?, table_of_contents=? WHERE id=?',
        [title, cover_image_url, introduction, pdf_url, table_of_contents, id]
      );
      return NextResponse.json({ message: 'Cập nhật ấn phẩm thành công' }, { status: 200 });
    } else {
      // Insert
      await pool.query(
        'INSERT INTO documents (title, cover_image_url, introduction, pdf_url, table_of_contents) VALUES (?, ?, ?, ?, ?)',
        [title, cover_image_url, introduction, pdf_url, table_of_contents]
      );
      return NextResponse.json({ message: 'Tạo tài liệu thành công' }, { status: 201 });
    }
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { id } = await req.json();
    await pool.query('DELETE FROM documents WHERE id = ?', [id]);
    return NextResponse.json({ message: 'Đã xóa ấn phẩm' }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
