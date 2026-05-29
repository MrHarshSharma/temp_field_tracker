'use client';
import { useState, useEffect, useRef, useCallback } from 'react';

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
  const [pointCount, setPointCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const polylineRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<any[]>([]);

  const initMap = useCallback(() => {
    if (!mapRef.current || !window.google) return;
    mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
      center: { lat: 20.5937, lng: 78.9629 },
      zoom: 5,
    });
  }, []);

  // Load Google Maps script
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) return;

    if (window.google) {
      initMap();
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
    script.async = true;
    script.onload = initMap;
    document.head.appendChild(script);
  }, [initMap]);

  const fetchWorkers = async () => {
    const res = await fetch('/api/workers');
    const data = await res.json();
    setWorkers(data.workers || []);
  };

  useEffect(() => { fetchWorkers(); }, []);

  const loadRoute = async () => {
    if (!selectedWorker || !date) {
      setError('Select a worker and date');
      return;
    }
    setError('');
    setLoading(true);

    const res = await fetch(
      `/api/route?worker=${encodeURIComponent(selectedWorker)}&date=${date}`
    );
    const data = await res.json();
    setLoading(false);

    setDistance(data.distance_km);
    setPointCount(data.points.length);

    if (!window.google || !mapInstanceRef.current) return;

    // Clear previous drawings
    if (polylineRef.current) polylineRef.current.setMap(null);
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    const points: Point[] = data.points;
    if (points.length === 0) {
      setError('No data found for this worker on this date');
      return;
    }

    const path = points.map((p) => ({ lat: p.lat, lng: p.lng }));

    polylineRef.current = new window.google.maps.Polyline({
      path,
      geodesic: true,
      strokeColor: '#2563eb',
      strokeOpacity: 1,
      strokeWeight: 4,
    });
    polylineRef.current.setMap(mapInstanceRef.current);

    // Start marker
    markersRef.current.push(
      new window.google.maps.Marker({
        position: path[0],
        map: mapInstanceRef.current,
        label: { text: 'S', color: 'white', fontWeight: 'bold' },
        title: `Start: ${new Date(points[0].timestamp).toLocaleTimeString()}`,
      })
    );

    // End marker
    markersRef.current.push(
      new window.google.maps.Marker({
        position: path[path.length - 1],
        map: mapInstanceRef.current,
        label: { text: 'E', color: 'white', fontWeight: 'bold' },
        title: `End: ${new Date(points[points.length - 1].timestamp).toLocaleTimeString()}`,
      })
    );

    const bounds = new window.google.maps.LatLngBounds();
    path.forEach((p) => bounds.extend(p));
    mapInstanceRef.current.fitBounds(bounds);
  };

  return (
    <main style={{ padding: '1.5rem' }}>
      <h1 style={{ marginBottom: '1.5rem' }}>Admin Dashboard</h1>

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem', alignItems: 'center' }}>
        <select
          value={selectedWorker}
          onChange={(e) => setSelectedWorker(e.target.value)}
          style={{ padding: '0.5rem 0.75rem', fontSize: '1rem', borderRadius: '6px', border: '1px solid #d1d5db' }}
        >
          <option value="">Select worker</option>
          {workers.map((w) => (
            <option key={w} value={w}>{w}</option>
          ))}
        </select>

        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          style={{ padding: '0.5rem 0.75rem', fontSize: '1rem', borderRadius: '6px', border: '1px solid #d1d5db' }}
        />

        <button
          onClick={loadRoute}
          disabled={loading}
          style={{
            padding: '0.5rem 1.5rem', fontSize: '1rem', fontWeight: 600,
            background: loading ? '#93c5fd' : '#2563eb', color: 'white',
            border: 'none', borderRadius: '6px', cursor: 'pointer',
          }}
        >
          {loading ? 'Loading...' : 'Load Route'}
        </button>

        <button
          onClick={fetchWorkers}
          style={{
            padding: '0.5rem 1rem', fontSize: '0.95rem',
            border: '1px solid #d1d5db', borderRadius: '6px',
            background: 'white', cursor: 'pointer',
          }}
        >
          Refresh Workers
        </button>
      </div>

      {error && (
        <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#fef2f2', borderRadius: '6px', color: '#dc2626' }}>
          {error}
        </div>
      )}

      {distance !== null && (
        <div style={{
          marginBottom: '1rem', padding: '1rem',
          background: '#eff6ff', borderRadius: '8px',
          display: 'flex', gap: '2.5rem', flexWrap: 'wrap',
          border: '1px solid #bfdbfe',
        }}>
          <div><span style={{ color: '#6b7280' }}>Distance</span><br /><strong style={{ fontSize: '1.4rem' }}>{distance} km</strong></div>
          <div><span style={{ color: '#6b7280' }}>GPS Points</span><br /><strong style={{ fontSize: '1.4rem' }}>{pointCount}</strong></div>
          <div><span style={{ color: '#6b7280' }}>Worker</span><br /><strong style={{ fontSize: '1.1rem' }}>{selectedWorker}</strong></div>
          <div><span style={{ color: '#6b7280' }}>Date</span><br /><strong style={{ fontSize: '1.1rem' }}>{date}</strong></div>
        </div>
      )}

      <div
        ref={mapRef}
        style={{
          width: '100%', height: '520px',
          borderRadius: '10px', border: '1px solid #e5e7eb',
          background: '#f3f4f6',
        }}
      />

      {!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && (
        <p style={{ marginTop: '0.75rem', color: '#dc2626', fontSize: '0.9rem' }}>
          NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not set — map will not load.
        </p>
      )}
    </main>
  );
}
