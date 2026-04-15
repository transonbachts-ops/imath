import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import path from 'path';
import fs from 'fs/promises';
import AdmZip from 'adm-zip';

const JWT_SECRET = 'supersecret_smart_edu_key_999';

export async function POST(req) {
  const cookieStore = await cookies();
  const token = cookieStore.get('token');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const user = jwt.verify(token.value, JWT_SECRET);
    if (user.role !== 'admin' && user.role !== 'teacher') {
       return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get('file');

    if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Create a unique folder name
    const timestamp = Date.now();
    const folderName = file.name.replace(/\.[^/.]+$/, "").replace(/[^a-z0-9]/gi, '_').toLowerCase() + "_" + timestamp;
    const uploadDir = path.join(process.cwd(), 'public', 'scorm', folderName);

    await fs.mkdir(uploadDir, { recursive: true });

    const isRar = file.name.toLowerCase().endsWith('.rar');
    if (isRar) {
       const { createExtractorFromData } = await import('node-unrar-js');
       const extractor = await createExtractorFromData({ data: buffer });
       const { files: extractedFiles } = extractor.extract({ files: [] });
       for (const f of extractedFiles) {
          const outPath = path.join(uploadDir, f.fileHeader.name);
          await fs.mkdir(path.dirname(outPath), { recursive: true });
          if (!f.fileHeader.flags.directory) {
             await fs.writeFile(outPath, f.extraction);
          }
       }
    } else {
       // Extract ZIP
       const zip = new AdmZip(buffer);
       zip.extractAllTo(uploadDir, true);
    }

    // Look for entry file (recursively find the best match)
    const filesList = await fs.readdir(uploadDir, { recursive: true });
    
    const rootEntries = ['index_lms.html', 'index_lms_html5.html', 'story.html', 'index.html'];
    // Try to find in root first
    let entryFile = rootEntries.find(e => filesList.includes(e));

    if (!entryFile) {
       // Search deeper if not found in root (use path.basename to handle both / and \ accurately)
       entryFile = filesList.find(f => rootEntries.some(e => path.basename(f) === e));
    }

    if (!entryFile) entryFile = 'index.html'; // fallback

    // Return the URL. Encode components to handle Vietnamese characters/spaces.
    const urlPath = entryFile.replace(/\\/g, '/').split('/').map(segment => encodeURIComponent(segment)).join('/');
    const scormUrl = `/scorm/${folderName}/${urlPath}`;

    return NextResponse.json({ success: true, url: scormUrl });

  } catch (err) {
    console.error('SCORM Upload Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
