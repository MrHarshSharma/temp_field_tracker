import Link from 'next/link';

export default function Home() {
  return (
    <main style={{ padding: '3rem', maxWidth: '400px', margin: '0 auto', textAlign: 'center' }}>
      <h1 style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>Field Worker Tracker</h1>
      <p style={{ color: '#666', marginBottom: '2rem' }}>Choose your role to continue</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <Link href="/worker" style={{
          display: 'block', padding: '1.2rem', background: '#22c55e',
          color: 'white', borderRadius: '10px', textDecoration: 'none',
          fontSize: '1.1rem', fontWeight: 600
        }}>
          I am a Field Worker
        </Link>
        <Link href="/admin" style={{
          display: 'block', padding: '1.2rem', background: '#2563eb',
          color: 'white', borderRadius: '10px', textDecoration: 'none',
          fontSize: '1.1rem', fontWeight: 600
        }}>
          I am the Admin
        </Link>
      </div>
    </main>
  );
}
