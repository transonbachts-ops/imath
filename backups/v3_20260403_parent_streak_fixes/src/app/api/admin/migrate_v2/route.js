import pool from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // 1. users: streaks
    try { await pool.query('ALTER TABLE users ADD COLUMN current_streak INT DEFAULT 0'); } catch(e) {}
    try { await pool.query('ALTER TABLE users ADD COLUMN longest_streak INT DEFAULT 0'); } catch(e) {}
    try { await pool.query('ALTER TABLE users ADD COLUMN last_quiz_date DATE NULL'); } catch(e) {}

    // 2. question_bank
    await pool.query(`CREATE TABLE IF NOT EXISTS question_bank (
      id INT AUTO_INCREMENT PRIMARY KEY,
      grade VARCHAR(10) NOT NULL,
      question_text TEXT NOT NULL,
      options_json JSON,
      correct_answer VARCHAR(1) DEFAULT 'A',
      tags VARCHAR(255) DEFAULT '',
      hint TEXT,
      image_url VARCHAR(500),
      video_url VARCHAR(500),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    // 3. daily_quiz_results
    await pool.query(`CREATE TABLE IF NOT EXISTS daily_quiz_results (
      id INT AUTO_INCREMENT PRIMARY KEY,
      student_id INT NOT NULL,
      grade VARCHAR(10) NOT NULL,
      score FLOAT DEFAULT 0,
      details_json TEXT,
      date_seed DATE NOT NULL,
      submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_daily_result (student_id, date_seed)
    )`);

    return NextResponse.json({ success: true, message: 'migration success' });
  } catch(e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
