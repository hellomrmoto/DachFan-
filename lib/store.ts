// Store facade. Picks the backend once at import time:
//
// - DATABASE_URL (or POSTGRES_URL) set → Postgres (store-pg.ts).
//   Used on Vercel, where serverless functions can't share memory.
// - otherwise → in-memory (store-memory.ts). Used for local dev and tests.
//
// Both backends expose the same async function surface, so every caller
// just imports from '@/lib/store' and awaits.

import * as memory from './store-memory';
import * as pg from './store-pg';

const backend =
  process.env.DATABASE_URL || process.env.POSTGRES_URL ? pg : memory;

export const {
  ensureSeeded,
  resetStore,
  listCreators,
  getCreator,
  upsertCreator,
  updateCreator,
  newCreatorId,
  createRequest,
  getRequest,
  updateRequest,
  listRequests,
  addPing,
  getPing,
  updatePing,
  pingsForRequest,
  pendingPingsForCreator,
  createSession,
  getSession,
  updateSession,
  listSessions,
  appendLedger,
  getLedger,
  ledgerForSession,
  addReport,
  listReports,
  reviewReport,
} = backend;

export function backendName(): 'postgres' | 'memory' {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL ? 'postgres' : 'memory';
}
