import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { totalDistance } from '@/lib/haversine';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const worker = searchParams.get('worker');
  const date = searchParams.get('date');

  if (!worker || !date) {
    return NextResponse.json({ error: 'Missing worker or date' }, { status: 400 });
  }

  const sql = getDb();
  const rows = await sql`
    SELECT lat, lng, timestamp
    FROM locations
    WHERE worker_name = ${worker}
      AND DATE(timestamp AT TIME ZONE 'Asia/Kolkata') = ${date}
    ORDER BY timestamp ASC
  `;

  const points = rows.map((r) => ({
    lat: r.lat as number,
    lng: r.lng as number,
    timestamp: r.timestamp as string,
  }));

  return NextResponse.json({
    points,
    distance_km: totalDistance(points),
  });
}
