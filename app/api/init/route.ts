import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const sql = getDb();
  await sql`
    CREATE TABLE IF NOT EXISTS locations (
      id        SERIAL PRIMARY KEY,
      worker_name TEXT NOT NULL,
      lat       REAL NOT NULL,
      lng       REAL NOT NULL,
      timestamp TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  return NextResponse.json({ ok: true, message: 'Database initialised' });
}
