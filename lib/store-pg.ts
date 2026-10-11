// Postgres backend for the store. Active when DATABASE_URL (or POSTGRES_URL)
// is set — i.e. on Vercel with a database provisioned. Same function surface
// as store-memory.ts; lib/store.ts picks between them.

import { Pool } from 'pg';
import type {
  BuyerRequest,
  Creator,
  LedgerEntry,
  Ping,
  Report,
  Session,
} from './types';
import { seedCreators } from './seed';

// Embedded so the serverless bundle needs no extra file includes.
const SCHEMA = `
CREATE TABLE IF NOT EXISTS creators (id TEXT PRIMARY KEY, data JSONB NOT NULL);
CREATE TABLE IF NOT EXISTS requests (id TEXT PRIMARY KEY, data JSONB NOT NULL);
CREATE TABLE IF NOT EXISTS pings (id TEXT PRIMARY KEY, data JSONB NOT NULL);
CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, data JSONB NOT NULL);
CREATE TABLE IF NOT EXISTS reports (id TEXT PRIMARY KEY, data JSONB NOT NULL);
CREATE TABLE IF NOT EXISTS ledger (
  seq SERIAL PRIMARY KEY,
  id TEXT NOT NULL,
  ts BIGINT NOT NULL,
  data JSONB NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_pings_request ON pings ((data ->> 'requestId'));
CREATE INDEX IF NOT EXISTS idx_ledger_session ON ledger ((data ->> 'sessionId'));
`;

let pool: Pool | null = null;
let initPromise: Promise<void> | null = null;
let seq = 0;

function nid(prefix: string): string {
  seq += 1;
  return `${prefix}_${Date.now().toString(36)}_${seq.toString(36)}`;
}

function db(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
      max: 5,
    });
  }
  return pool;
}

async function init(): Promise<void> {
  await db().query(SCHEMA);
  const { rows } = await db().query('SELECT COUNT(*)::int AS n FROM creators');
  if (rows[0].n === 0) {
    for (const c of seedCreators()) {
      await db().query('INSERT INTO creators (id, data) VALUES ($1, $2)', [
        c.id,
        JSON.stringify(c),
      ]);
    }
  }
}

async function ready(): Promise<Pool> {
  if (!initPromise) initPromise = init();
  await initPromise;
  return db();
}

// --- helpers ---
async function put(table: string, id: string, data: unknown): Promise<void> {
  const p = await ready();
  await p.query(
    `INSERT INTO ${table} (id, data) VALUES ($1, $2)
     ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data`,
    [id, JSON.stringify(data)],
  );
}

async function get<T>(table: string, id: string): Promise<T | undefined> {
  const p = await ready();
  const { rows } = await p.query(`SELECT data FROM ${table} WHERE id = $1`, [id]);
  return rows[0]?.data as T | undefined;
}

async function all<T>(table: string, orderBy: string): Promise<T[]> {
  const p = await ready();
  const { rows } = await p.query(`SELECT data FROM ${table} ORDER BY ${orderBy}`);
  return rows.map((r) => r.data as T);
}

// --- interface (mirrors store-memory.ts) ---
export async function ensureSeeded() {
  await ready();
}

export async function resetStore() {
  const p = await ready();
  await p.query(
    'TRUNCATE creators, requests, pings, sessions, reports, ledger RESTART IDENTITY',
  );
  initPromise = null;
  seq = 0;
}

export async function listCreators() {
  return all<Creator>('creators', "(data ->> 'name')");
}

export async function getCreator(id: string) {
  await ensureSeeded();
  return get<Creator>('creators', id);
}

export async function upsertCreator(c: Creator) {
  await ensureSeeded();
  await put('creators', c.id, c);
  return c;
}

export async function updateCreator(id: string, patch: Partial<Creator>) {
  await ensureSeeded();
  const c = await get<Creator>('creators', id);
  if (!c) return undefined;
  const next = { ...c, ...patch };
  await put('creators', id, next);
  return next;
}

export function newCreatorId(): string {
  return nid('cr');
}

export async function createRequest(
  r: Omit<BuyerRequest, 'id' | 'createdAt' | 'attempts' | 'status'> & {
    status?: BuyerRequest['status'];
  },
) {
  const req: BuyerRequest = {
    ...r,
    id: nid('req'),
    createdAt: Date.now(),
    attempts: 0,
    status: r.status ?? 'dispatching',
  };
  await put('requests', req.id, req);
  return req;
}

export async function getRequest(id: string) {
  return get<BuyerRequest>('requests', id);
}

export async function updateRequest(id: string, patch: Partial<BuyerRequest>) {
  const r = await get<BuyerRequest>('requests', id);
  if (!r) return undefined;
  const next = { ...r, ...patch };
  await put('requests', id, next);
  return next;
}

export async function listRequests() {
  return all<BuyerRequest>('requests', "(data ->> 'createdAt')::bigint DESC");
}

export async function addPing(p: Omit<Ping, 'id'>) {
  const ping: Ping = { ...p, id: nid('ping') };
  await put('pings', ping.id, ping);
  return ping;
}

export async function getPing(id: string) {
  return get<Ping>('pings', id);
}

export async function updatePing(id: string, patch: Partial<Ping>) {
  const p = await get<Ping>('pings', id);
  if (!p) return undefined;
  const next = { ...p, ...patch };
  await put('pings', id, next);
  return next;
}

export async function pingsForRequest(requestId: string) {
  const p = await ready();
  const { rows } = await p.query(
    `SELECT data FROM pings WHERE data ->> 'requestId' = $1 ORDER BY (data ->> 'seq')::int`,
    [requestId],
  );
  return rows.map((r) => r.data as Ping);
}

export async function pendingPingsForCreator(creatorId: string) {
  const p = await ready();
  const { rows } = await p.query(
    `SELECT data FROM pings WHERE data ->> 'creatorId' = $1 AND data ->> 'status' = 'pending'`,
    [creatorId],
  );
  return rows.map((r) => r.data as Ping);
}

export async function createSession(s: Omit<Session, 'id'>) {
  const sess: Session = { ...s, id: nid('ses') };
  await put('sessions', sess.id, sess);
  return sess;
}

export async function getSession(id: string) {
  return get<Session>('sessions', id);
}

export async function updateSession(id: string, patch: Partial<Session>) {
  const s = await get<Session>('sessions', id);
  if (!s) return undefined;
  const next = { ...s, ...patch };
  await put('sessions', id, next);
  return next;
}

export async function listSessions() {
  return all<Session>('sessions', "(data ->> 'startedAt')::bigint DESC");
}

export async function appendLedger(
  e: Omit<LedgerEntry, 'seq' | 'id' | 'ts'> & { ts?: number },
) {
  const p = await ready();
  const entry = { ...e, id: nid('le'), ts: e.ts ?? Date.now() };
  const { rows } = await p.query(
    'INSERT INTO ledger (id, ts, data) VALUES ($1, $2, $3) RETURNING seq',
    [entry.id, entry.ts, JSON.stringify(entry)],
  );
  return { ...entry, seq: rows[0].seq } as LedgerEntry;
}

export async function getLedger() {
  const p = await ready();
  const { rows } = await p.query(
    'SELECT seq, data FROM ledger ORDER BY seq',
  );
  return rows.map((r) => ({ ...(r.data as object), seq: r.seq }) as LedgerEntry);
}

export async function ledgerForSession(sessionId: string) {
  const p = await ready();
  const { rows } = await p.query(
    `SELECT seq, data FROM ledger WHERE data ->> 'sessionId' = $1 ORDER BY seq`,
    [sessionId],
  );
  return rows.map((r) => ({ ...(r.data as object), seq: r.seq }) as LedgerEntry);
}

export async function addReport(r: Omit<Report, 'id' | 'ts' | 'status'>) {
  const report: Report = { ...r, id: nid('rep'), ts: Date.now(), status: 'open' };
  await put('reports', report.id, report);
  return report;
}

export async function listReports() {
  return all<Report>('reports', "(data ->> 'ts')::bigint DESC");
}

export async function reviewReport(id: string) {
  const r = await get<Report>('reports', id);
  if (!r) return undefined;
  const next = { ...r, status: 'reviewed' as const };
  await put('reports', id, next);
  return next;
}
