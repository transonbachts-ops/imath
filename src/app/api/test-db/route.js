import pool from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [qr] = await pool.query('SHOW TABLES');
    let qrSchema = null;
    let uSchema = null;
    
    // find quiz table
    for (const row of qr) {
      const tb = Object.values(row)[0];
      if (tb.includes('quiz')) {
         const [res] = await pool.query(`DESCRIBE ${tb}`);
         qrSchema = { table: tb, schema: res };
      }
    }
    
    const [u] = await pool.query('DESCRIBE users');
    uSchema = u;
    
    return NextResponse.json({ qrSchema, uSchema, tables: qr });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
