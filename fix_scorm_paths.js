const mysql = require('mysql2/promise');
const fs = require('fs/promises');
const path = require('path');

async function runFix() {
  const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'smart_edu_db'
  });

  console.log('--- Bắt đầu sửa lỗi đường dẫn SCORM ---');

  try {
    const [activities] = await pool.query('SELECT id, url FROM course_activities WHERE type = "scorm"');
    
    for (const act of activities) {
      if (!act.url) continue;
      
      const parts = act.url.split('/');
      // Expected: /scorm/folder_name/entry.html
      const scormIndex = parts.indexOf('scorm');
      if (scormIndex === -1 || parts.length < scormIndex + 2) continue;

      const folderName = decodeURIComponent(parts[scormIndex + 1]);
      const scormRoot = path.join(process.cwd(), 'public', 'scorm', folderName);

      try {
        const stats = await fs.stat(scormRoot);
        if (!stats.isDirectory()) continue;

        const files = await fs.readdir(scormRoot, { recursive: true });
        const rootEntries = ['index_lms.html', 'index_lms_html5.html', 'story.html', 'index.html'];
        
        let foundPath = files.find(f => rootEntries.some(e => path.basename(f) === e));
        
        if (foundPath) {
           const encodedPath = foundPath.replace(/\\/g, '/').split('/').map(s => encodeURIComponent(s)).join('/');
           const newUrl = `/scorm/${encodeURIComponent(folderName)}/${encodedPath}`;
           
           if (newUrl !== act.url) {
              console.log(`Cập nhật ID ${act.id}: ${act.url} -> ${newUrl}`);
              await pool.query('UPDATE course_activities SET url = ? WHERE id = ?', [newUrl, act.id]);
           }
        }
      } catch (e) {
        console.error(`Thanh kiểm tra thư mục ${folderName} thất bại:`, e.message);
      }
    }
    
    console.log('--- Đã hoàn thành sửa chữa! ---');
  } catch (err) {
    console.error('Lỗi hệ thống:', err.message);
  } finally {
    await pool.end();
  }
}

runFix();
