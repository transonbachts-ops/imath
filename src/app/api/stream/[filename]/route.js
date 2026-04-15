import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';

export async function GET(req, { params }) {
  const resolvedParams = await params;
  const filename = resolvedParams.filename;
  if (!filename) return new NextResponse('Missing filename', { status: 400 });

  const sanitizedFilename = filename.replace(/\\/g, '/').split('/').pop();
  const filePath = path.join(process.cwd(), 'public', 'uploads', sanitizedFilename);

  if (!fs.existsSync(filePath)) {
    return new NextResponse('File not found', { status: 404 });
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.get('range');

  const ext = path.extname(sanitizedFilename).toLowerCase();
  let contentType = 'application/octet-stream';
  if (ext === '.mp4') contentType = 'video/mp4';
  else if (ext === '.webm') contentType = 'video/webm';
  else if (ext === '.pdf') contentType = 'application/pdf';
  else if (['.png', '.jpg', '.jpeg', '.gif'].includes(ext)) contentType = 'image/' + ext.substring(1);

  // Helper: tạo web stream có error handling (tránh crash khi client ngắt kết nối)
  const createSafeWebStream = (nodeStream) => {
    nodeStream.on('error', () => {
      // Client đã ngắt kết nối (pause/seek) — bỏ qua, không crash server
      try { nodeStream.destroy(); } catch (_) {}
    });
    return Readable.toWeb(nodeStream);
  };

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = (end - start) + 1;

    const stream = fs.createReadStream(filePath, { start, end });
    const webStream = createSafeWebStream(stream);

    return new NextResponse(webStream, {
      status: 206,
      headers: {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': contentType,
      },
    });
  } else {
    const stream = fs.createReadStream(filePath);
    const webStream = createSafeWebStream(stream);

    return new NextResponse(webStream, {
      status: 200,
      headers: {
        'Content-Length': fileSize,
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes',
      },
    });
  }
}
