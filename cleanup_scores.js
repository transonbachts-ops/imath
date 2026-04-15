const mysql = require('mysql2/promise');
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'smart_edu_db'
});

async function cleanup() {
  console.log('--- Cleaning up Quiz Results ---');
  // Cap scores at 10 for quiz_results (some might be slightly over due to float math)
  const [qRes] = await pool.query('UPDATE quiz_results SET score = 10 WHERE score > 10');
  console.log(`Updated ${qRes.affectedRows} quiz results.`);

  console.log('--- Cleaning up Game Scores ---');
  // Normalize Studio Game scores. 
  // If > 100, assuming it's point scale (0-1000 or 0-100), divide by 100 or 10.
  const [gRes1] = await pool.query('UPDATE game_scores SET score = score / 100 WHERE score >= 100');
  const [gRes2] = await pool.query('UPDATE game_scores SET score = score / 10 WHERE score > 10 AND score < 100');
  const [gRes3] = await pool.query('UPDATE game_scores SET score = 10 WHERE score > 10');

  console.log(`Updated ${gRes1.affectedRows + gRes2.affectedRows + gRes3.affectedRows} game scores.`);
  process.exit(0);
}
cleanup();
