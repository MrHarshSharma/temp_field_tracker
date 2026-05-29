import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { worker_name, lat, lng } = body;

  if (!worker_name || lat == null || lng == null) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const sql = getDb();
  await sql`
    INSERT INTO locations (worker_name, lat, lng)
    VALUES (${worker_name}, ${lat}, ${lng})
  `;

  return NextResponse.json({ ok: true });
}
