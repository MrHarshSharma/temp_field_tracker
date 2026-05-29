import { neon } from '@neondatabase/serverless';

// Lazy factory — avoids URL validation at build/import time
export function getDb() {
  return neon(process.env.DATABASE_URL!);
}
