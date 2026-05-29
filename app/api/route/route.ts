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
    SELECT lat, lng, timestamp, session_id
    FROM locations
    WHERE worker_name = ${worker}
      AND DATE(timestamp AT TIME ZONE 'Asia/Kolkata') = ${date}
    ORDER BY timestamp ASC
  `;

  // Group by session_id, preserving chronological session order
  const sessionMap = new Map<string, { lat: number; lng: number; timestamp: string }[]>();
  for (const r of rows) {
    const sid = r.session_id as string;
    if (!sessionMap.has(sid)) sessionMap.set(sid, []);
    sessionMap.get(sid)!.push({
      lat: r.lat as number,
      lng: r.lng as number,
      timestamp: r.timestamp as string,
    });
  }

  // Sum distance across sessions — never connects points between sessions
  let totalDist = 0;
  const sessions: { lat: number; lng: number; timestamp: string }[][] = [];
  for (const sessionPoints of Array.from(sessionMap.values())) {
    totalDist += totalDistance(sessionPoints);
    sessions.push(sessionPoints);
  }

  return NextResponse.json({
    sessions,
    distance_km: Math.round(totalDist * 100) / 100,
  });
}
