'use client';
import { useState, useEffect, useRef } from 'react';

export default function WorkerPage() {
  const [name, setName] = useState('');
  const [tracking, setTracking] = useState(false);
  const [status, setStatus] = useState('');
  const [pointCount, setPointCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const sessionIdRef = useRef<string>('');

  const sendLocation = async (workerName: string, sessionId: string) => {
    if (!navigator.geolocation) {
      setStatus('Geolocation not supported on this device');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch('/api/location', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              worker_name: workerName,
              session_id: sessionId,
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
            }),
          });
          if (res.ok) {
            setPointCount((c) => c + 1);
            setStatus(`Last ping: ${new Date().toLocaleTimeString()}`);
          }
        } catch {
          setStatus('Failed to send location — will retry next interval');
        }
      },
      (err) => setStatus(`GPS error: ${err.message}`)
    );
  };

  const startTracking = async () => {
    if (!name.trim()) {
      setStatus('Please enter your name first');
      return;
    }
    setTracking(true);
    setPointCount(0);
    setStatus('Starting...');

    // New session ID for each Start — keeps trips separate in DB
    sessionIdRef.current = crypto.randomUUID();

    // Request wake lock so screen stays on and JS keeps running
    if ('wakeLock' in navigator) {
      try {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
      } catch {
        // Wake lock not critical — continue without it
      }
    }

    await sendLocation(name.trim(), sessionIdRef.current);
    intervalRef.current = setInterval(
      () => sendLocation(name.trim(), sessionIdRef.current),
      30 * 1000
    );
  };

  const stopTracking = async () => {
    setTracking(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (wakeLockRef.current) {
      await wakeLockRef.current.release();
      wakeLockRef.current = null;
    }
    setStatus('Tracking stopped');
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (wakeLockRef.current) wakeLockRef.current.release();
    };
  }, []);

  return (
    <main style={{ padding: '2rem', maxWidth: '420px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '1.5rem' }}>Field Worker Tracker</h1>

      <input
        type="text"
        placeholder="Enter your name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        disabled={tracking}
        style={{
          width: '100%', padding: '0.75rem', fontSize: '1rem',
          border: '1px solid #d1d5db', borderRadius: '8px',
          boxSizing: 'border-box', marginBottom: '1rem',
        }}
      />

      {!tracking ? (
        <button
          onClick={startTracking}
          style={{
            width: '100%', padding: '1rem', fontSize: '1.1rem', fontWeight: 600,
            background: '#22c55e', color: 'white', border: 'none',
            borderRadius: '10px', cursor: 'pointer',
          }}
        >
          Start Tracking
        </button>
      ) : (
        <button
          onClick={stopTracking}
          style={{
            width: '100%', padding: '1rem', fontSize: '1.1rem', fontWeight: 600,
            background: '#ef4444', color: 'white', border: 'none',
            borderRadius: '10px', cursor: 'pointer',
          }}
        >
          Stop Tracking
        </button>
      )}

      {tracking && (
        <div style={{
          marginTop: '1.5rem', padding: '1rem',
          background: '#f0fdf4', borderRadius: '10px',
          border: '1px solid #bbf7d0',
        }}>
          <div style={{ fontWeight: 600, color: '#16a34a', marginBottom: '0.5rem' }}>
            Tracking active
          </div>
          <div>GPS points logged: <strong>{pointCount}</strong></div>
          <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '0.25rem' }}>
            Pings every 30 seconds — keep this tab open
          </div>
        </div>
      )}

      {status && (
        <p style={{ marginTop: '1rem', color: '#6b7280', fontSize: '0.9rem' }}>{status}</p>
      )}
    </main>
  );
}
