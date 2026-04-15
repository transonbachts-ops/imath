import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ error: 'Vui lòng chọn file' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const originalName = file.name;
    const sanitizedName = Date.now() + '_' + originalName.replace(/[^a-zA-Z0-9.\-_]/g, '');
    
    // Build path
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filePath = path.join(uploadDir, sanitizedName);
    fs.writeFileSync(filePath, buffer);

    // Return the relative URL string that can be used directly as image/pdf src
    return NextResponse.json({ url: `/uploads/${sanitizedName}`, message: 'Upload thành công!' });
  } catch (error) {
    return NextResponse.json({ error: 'Tải file thất bại: ' + error.message }, { status: 500 });
  }
}
