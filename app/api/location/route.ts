import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { worker_name, session_id, lat, lng } = body;

  if (!worker_name || !session_id || lat == null || lng == null) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const sql = getDb();
  await sql`
    INSERT INTO locations (worker_name, session_id, lat, lng)
    VALUES (${worker_name}, ${session_id}, ${lat}, ${lng})
  `;

  return NextResponse.json({ ok: true });
}
