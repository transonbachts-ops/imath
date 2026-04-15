const mysql = require('mysql2/promise');

async function run() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'smart_edu_db'
  });
  
  await connection.execute(`
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
  
  console.log("Table 'documents' created successfully.");
  process.exit(0);
}

run();
