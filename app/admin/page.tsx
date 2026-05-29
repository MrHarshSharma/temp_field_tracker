'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import styles from './admin.module.css';

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    google: any;
  }
}

type Point = { lat: number; lng: number; timestamp: string };

export default function AdminPage() {
  const [workers, setWorkers] = useState<string[]>([]);
  const [selectedWorker, setSelectedWorker] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [distance, setDistance] = useState<number | null>(null);
  const [sessionCount, setSessionCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const polylinesRef = useRef<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<any[]>([]);

  const initMap = useCallback(() => {
    if (!mapRef.current || !window.google) return;
    mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
      center: { lat: 20.5937, lng: 78.9629 },
      zoom: 5,
    });
  }, []);

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) return;
    if (window.google) { initMap(); return; }
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
    script.async = true;
    script.onload = initMap;
    document.head.appendChild(script);
  }, [initMap]);

  const fetchWorkers = async () => {
    const res = await fetch('/api/workers', { cache: 'no-store' });
    const data = await res.json();
    setWorkers(data.workers || []);
  };

  useEffect(() => { fetchWorkers(); }, []);

  const loadRoute = async () => {
    if (!selectedWorker || !date) { setError('Select a worker and date'); return; }
    setError('');
    setLoading(true);

    const res = await fetch(`/api/route?worker=${encodeURIComponent(selectedWorker)}&date=${date}`, { cache: 'no-store' });
    const data = await res.json();
    setLoading(false);

    const sessions: Point[][] = data.sessions ?? [];
    setDistance(data.distance_km);
    setSessionCount(sessions.length);

    if (!window.google || !mapInstanceRef.current) return;

    polylinesRef.current.forEach((p) => p.setMap(null));
    polylinesRef.current = [];
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    if (sessions.length === 0) { setError('No data found for this worker on this date'); return; }

    const bounds = new window.google.maps.LatLngBounds();

    sessions.forEach((points, i) => {
      const path = points.map((p) => ({ lat: p.lat, lng: p.lng }));
      const polyline = new window.google.maps.Polyline({
        path, geodesic: true, strokeColor: '#2563eb', strokeOpacity: 1, strokeWeight: 4,
      });
      polyline.setMap(mapInstanceRef.current);
      polylinesRef.current.push(polyline);
      path.forEach((p) => bounds.extend(p));
      markersRef.current.push(new window.google.maps.Marker({
        position: path[0], map: mapInstanceRef.current,
        label: { text: `S${i + 1}`, color: 'white', fontWeight: 'bold' },
        title: `Trip ${i + 1} start: ${new Date(points[0].timestamp).toLocaleTimeString()}`,
      }));
      markersRef.current.push(new window.google.maps.Marker({
        position: path[path.length - 1], map: mapInstanceRef.current,
        label: { text: `E${i + 1}`, color: 'white', fontWeight: 'bold' },
        title: `Trip ${i + 1} end: ${new Date(points[points.length - 1].timestamp).toLocaleTimeString()}`,
      }));
    });

    mapInstanceRef.current.fitBounds(bounds);
  };

  return (
    <div className={styles.page}>

      {/* Top Nav */}
      <header className={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px #22c55e' }} />
          <span style={{ color: '#f8fafc', fontWeight: 700, fontSize: '1rem', letterSpacing: '-0.01em' }}>FieldTracker</span>
        </div>
        <span style={{ color: '#94a3b8', fontSize: '0.8125rem', fontWeight: 500 }}>Admin Dashboard</span>
      </header>

      <main className={styles.main}>

        {/* Controls Card */}
        <div className={styles.controlsCard}>
          <div className={styles.controlGroup}>
            <label style={labelStyle}>Worker</label>
            <select
              value={selectedWorker}
              onChange={(e) => setSelectedWorker(e.target.value)}
              className={styles.input}
            >
              <option value="">Select worker</option>
              {workers.map((w) => <option key={w} value={w}>{w}</option>)}
            </select>
          </div>

          <div className={styles.controlGroup}>
            <label style={labelStyle}>Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={styles.input}
            />
          </div>

          <button
            onClick={loadRoute}
            disabled={loading}
            className={styles.btnPrimary}
            style={{ background: loading ? '#93c5fd' : '#2563eb', cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? 'Loading…' : 'Load Route'}
          </button>

          <button onClick={fetchWorkers} className={styles.btnSecondary}>
            ↺ Refresh
          </button>
        </div>

        {/* Error Banner */}
        {error && (
          <div style={{
            marginBottom: '1.25rem', padding: '0.875rem 1rem',
            background: '#fef2f2', border: '1px solid #fecaca',
            borderRadius: '8px', color: '#dc2626', fontSize: '0.875rem', fontWeight: 500,
          }}>
            {error}
          </div>
        )}

        {/* Stat Cards */}
        {distance !== null && (
          <div className={styles.statsGrid}>
            <StatCard label="Total Distance" value={`${distance} km`} accent="#2563eb" />
            <StatCard label="Trips" value={String(sessionCount)} accent="#7c3aed" />
            <StatCard label="Worker" value={selectedWorker} accent="#059669" small />
          </div>
        )}

        {/* Map Card */}
        <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
          <div style={{
            padding: '0.875rem 1.5rem', borderBottom: '1px solid #f1f5f9',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.9375rem' }}>Route Map</span>
              {selectedWorker && distance !== null && (
                <span style={{
                  background: '#eff6ff', color: '#2563eb', fontSize: '0.75rem',
                  fontWeight: 600, padding: '0.2rem 0.6rem', borderRadius: '99px',
                }}>
                  {selectedWorker}
                </span>
              )}
            </div>
            {distance !== null && (
              <span style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>{date}</span>
            )}
          </div>
          <div ref={mapRef} className={styles.mapDiv} />
        </div>

      </main>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '0.6875rem', fontWeight: 600,
  color: '#64748b', marginBottom: '0.375rem',
  textTransform: 'uppercase', letterSpacing: '0.06em',
};

function StatCard({ label, value, accent, small }: {
  label: string; value: string | null; accent: string; small?: boolean;
}) {
  return (
    <div style={{
      background: 'white', borderRadius: '12px', padding: '1.125rem 1.25rem',
      boxShadow: '0 1px 3px rgba(0,0,0,0.07)', borderLeft: `4px solid ${accent}`,
    }}>
      <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.375rem' }}>
        {label}
      </div>
      <div style={{ fontSize: small ? '1.25rem' : '1.625rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.1 }}>
        {value ?? '—'}
      </div>
    </div>
  );
}
