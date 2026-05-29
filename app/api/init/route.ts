import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const sql = getDb();
  await sql`
    CREATE TABLE IF NOT EXISTS locations (
      id          SERIAL PRIMARY KEY,
      worker_name TEXT NOT NULL,
      session_id  TEXT NOT NULL DEFAULT '',
      lat         REAL NOT NULL,
      lng         REAL NOT NULL,
      timestamp   TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  // Add session_id to tables created before this change
  await sql`
    ALTER TABLE locations ADD COLUMN IF NOT EXISTS session_id TEXT NOT NULL DEFAULT ''
  `;
  return NextResponse.json({ ok: true, message: 'Database initialised' });
}
