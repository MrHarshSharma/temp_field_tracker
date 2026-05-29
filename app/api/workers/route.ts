import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const sql = getDb();
  const rows = await sql`
    SELECT DISTINCT worker_name
    FROM locations
    ORDER BY worker_name ASC
  `;
  return NextResponse.json({ workers: rows.map((r) => r.worker_name as string) });
}
