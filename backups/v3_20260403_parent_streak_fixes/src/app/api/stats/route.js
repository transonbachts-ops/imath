import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

export async function GET(req) {
  // Get real stats for the landing page
  const [[studentCount]] = await pool.query('SELECT COUNT(*) as cnt FROM users WHERE role="student"');
  const [[oldest]] = await pool.query('SELECT MIN(created_at) as start FROM users');
  const [[views]] = await pool.query('SELECT COUNT(*) as cnt FROM page_views').catch(() => [[{cnt: 0}]]);
  
  const startYear = oldest.start ? new Date(oldest.start).getFullYear() : new Date().getFullYear();
  const yearsActive = new Date().getFullYear() - startYear + 1;

  return NextResponse.json({
    students: studentCount.cnt,
    years: yearsActive,
    views: views.cnt
  });
}

export async function POST(req) {
  // Track a page view
  try {
    const body = await req.json();
    await pool.query('INSERT INTO page_views (path) VALUES (?)', [body.path || '/']);
  } catch(e) {}
  return NextResponse.json({ ok: true });
}
