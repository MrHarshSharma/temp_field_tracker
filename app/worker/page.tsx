'use client';
import { useState, useEffect, useRef } from 'react';
import styles from './worker.module.css';

export default function WorkerPage() {
  const [name, setName] = useState('');
  const [tracking, setTracking] = useState(false);
  const [status, setStatus] = useState('');
  const [pointCount, setPointCount] = useState(0);
  const [lastPing, setLastPing] = useState('');
  const [sessionSummary, setSessionSummary] = useState<{ points: number; duration: string } | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const sessionIdRef = useRef<string>('');
  const startTimeRef = useRef<Date | null>(null);

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
            setLastPing(new Date().toLocaleTimeString());
            setStatus('');
          }
        } catch {
          setStatus('Failed to send — will retry');
        }
      },
      (err) => setStatus(`GPS error: ${err.message}`)
    );
  };

  const startTracking = async () => {
    if (!name.trim()) { setStatus('Please enter your name first'); return; }
    setTracking(true);
    setPointCount(0);
    setLastPing('');
    setSessionSummary(null);
    setStatus('Getting location…');
    startTimeRef.current = new Date();
    sessionIdRef.current = crypto.randomUUID();

    if ('wakeLock' in navigator) {
      try { wakeLockRef.current = await navigator.wakeLock.request('screen'); } catch { /* optional */ }
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
    if (wakeLockRef.current) { await wakeLockRef.current.release(); wakeLockRef.current = null; }

    const elapsed = startTimeRef.current
      ? Math.round((Date.now() - startTimeRef.current.getTime()) / 60000)
      : 0;
    const hrs = Math.floor(elapsed / 60);
    const mins = elapsed % 60;
    const duration = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;

    setSessionSummary({ points: pointCount, duration });
    setStatus('');
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (wakeLockRef.current) wakeLockRef.current.release();
    };
  }, []);

  return (
    <div className={styles.page}>

      {/* Header */}
      <header className={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px #22c55e' }} />
          <span style={{ color: '#f8fafc', fontWeight: 700, fontSize: '1rem', letterSpacing: '-0.01em' }}>FieldTracker</span>
        </div>
        <span style={{ color: '#94a3b8', fontSize: '0.8125rem', fontWeight: 500 }}>Worker</span>
      </header>

      <main className={styles.main}>

        {/* Name Card */}
        <div className={styles.card}>
          <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>
            Your Name
          </label>
          <input
            type="text"
            placeholder="e.g. Ravi Kumar"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={tracking}
            className={styles.nameInput}
          />
        </div>

        {/* Start / Stop Button */}
        {!tracking ? (
          <button onClick={startTracking} className={styles.btnStart}>
            Start Tracking
          </button>
        ) : (
          <button onClick={stopTracking} className={styles.btnStop}>
            Stop Tracking
          </button>
        )}

        {/* Error / Info status */}
        {status && (
          <p style={{ marginTop: '0.875rem', color: '#64748b', fontSize: '0.875rem', textAlign: 'center' }}>
            {status}
          </p>
        )}

        {/* Active tracking card */}
        {tracking && (
          <div className={styles.card} style={{ marginTop: '1rem', borderLeft: '4px solid #22c55e' }}>
            <div className={styles.statusRow}>
              <span className={styles.pulsingDot} />
              <span style={{ fontWeight: 700, color: '#15803d', fontSize: '0.9375rem' }}>Tracking Active</span>
            </div>
            <div className={styles.statRow}>
              <span style={{ color: '#64748b' }}>Worker</span>
              <span style={{ fontWeight: 600, color: '#0f172a' }}>{name}</span>
            </div>
            <div className={styles.statRow}>
              <span style={{ color: '#64748b' }}>Points logged</span>
              <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '1rem' }}>{pointCount}</span>
            </div>
            <div className={styles.statRow}>
              <span style={{ color: '#64748b' }}>Last ping</span>
              <span style={{ fontWeight: 600, color: '#0f172a' }}>{lastPing || '—'}</span>
            </div>
            <div style={{ marginTop: '0.875rem', fontSize: '0.8rem', color: '#94a3b8', textAlign: 'center' }}>
              Pings every 30 seconds · keep this tab open
            </div>
          </div>
        )}

        {/* Session complete card */}
        {!tracking && sessionSummary && (
          <div className={styles.card} style={{ marginTop: '1rem', borderLeft: '4px solid #2563eb' }}>
            <div style={{ fontWeight: 700, color: '#1e40af', marginBottom: '0.875rem', fontSize: '0.9375rem' }}>
              Session Complete
            </div>
            <div className={styles.statRow}>
              <span style={{ color: '#64748b' }}>Points logged</span>
              <span style={{ fontWeight: 700, color: '#0f172a' }}>{sessionSummary.points}</span>
            </div>
            <div className={styles.statRow}>
              <span style={{ color: '#64748b' }}>Duration</span>
              <span style={{ fontWeight: 700, color: '#0f172a' }}>{sessionSummary.duration}</span>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
