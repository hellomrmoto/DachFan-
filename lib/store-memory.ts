// In-memory store seam. Module-level Maps persist for the life of the
// server process (dev + single-process start). Swap this module for a
// Postgres-backed implementation later — the function signatures stay.

import type {
  BuyerRequest,
  Creator,
  LedgerEntry,
  Ping,
  Report,
  Session,
} from './types';
import { seedCreators } from './seed';

let seq = 0;
function nid(prefix: string): string {
  seq += 1;
  return `${prefix}_${Date.now().toString(36)}_${seq.toString(36)}`;
}

const creators = new Map<string, Creator>();
const requests = new Map<string, BuyerRequest>();
const pings = new Map<string, Ping>();
const sessions = new Map<string, Session>();
const ledger: LedgerEntry[] = [];
const reports: Report[] = [];
let ledgerSeq = 0;
let seeded = false;

export async function ensureSeeded() {
  if (seeded) return;
  seeded = true;
  for (const c of seedCreators()) creators.set(c.id, c);
}

export async function resetStore() {
  creators.clear();
  requests.clear();
  pings.clear();
  sessions.clear();
  ledger.length = 0;
  reports.length = 0;
  ledgerSeq = 0;
  seeded = false;
}

// --- creators ---
export async function listCreators() {
  ensureSeeded();
  return [...creators.values()];
}
export async function getCreator(id: string) {
  ensureSeeded();
  return creators.get(id);
}
export async function upsertCreator(c: Creator) {
  ensureSeeded();
  creators.set(c.id, c);
  return c;
}
export async function updateCreator(id: string, patch: Partial<Creator>) {
  ensureSeeded();
  const c = creators.get(id);
  if (!c) return undefined;
  const next = { ...c, ...patch };
  creators.set(id, next);
  return next;
}
export function newCreatorId() {
  return nid('cr');
}

// --- requests ---
export async function createRequest(r: Omit<BuyerRequest, 'id' | 'createdAt' | 'attempts' | 'status'> & { status?: BuyerRequest['status'] }) {
  const req: BuyerRequest = {
    ...r,
    id: nid('req'),
    createdAt: Date.now(),
    attempts: 0,
    status: r.status ?? 'dispatching',
  };
  requests.set(req.id, req);
  return req;
}
export async function getRequest(id: string) {
  return requests.get(id);
}
export async function updateRequest(id: string, patch: Partial<BuyerRequest>) {
  const r = requests.get(id);
  if (!r) return undefined;
  const next = { ...r, ...patch };
  requests.set(id, next);
  return next;
}
export async function listRequests() {
  return [...requests.values()].sort((a, b) => b.createdAt - a.createdAt);
}

// --- pings ---
export async function addPing(p: Omit<Ping, 'id'>) {
  const ping: Ping = { ...p, id: nid('ping') };
  pings.set(ping.id, ping);
  return ping;
}
export async function getPing(id: string) {
  return pings.get(id);
}
export async function updatePing(id: string, patch: Partial<Ping>) {
  const p = pings.get(id);
  if (!p) return undefined;
  const next = { ...p, ...patch };
  pings.set(id, next);
  return next;
}
export async function pingsForRequest(requestId: string) {
  return [...pings.values()]
    .filter((p) => p.requestId === requestId)
    .sort((a, b) => a.seq - b.seq);
}
export async function pendingPingsForCreator(creatorId: string) {
  return [...pings.values()].filter(
    (p) => p.creatorId === creatorId && p.status === 'pending',
  );
}

// --- sessions ---
export async function createSession(s: Omit<Session, 'id'>) {
  const sess: Session = { ...s, id: nid('ses') };
  sessions.set(sess.id, sess);
  return sess;
}
export async function getSession(id: string) {
  return sessions.get(id);
}
export async function updateSession(id: string, patch: Partial<Session>) {
  const s = sessions.get(id);
  if (!s) return undefined;
  const next = { ...s, ...patch };
  sessions.set(id, next);
  return next;
}
export async function listSessions() {
  return [...sessions.values()].sort((a, b) => b.startedAt - a.startedAt);
}

// --- ledger (append-only; no updates or deletes exposed) ---
export async function appendLedger(e: Omit<LedgerEntry, 'seq' | 'id' | 'ts'> & { ts?: number }) {
  ledgerSeq += 1;
  const entry: LedgerEntry = { ...e, seq: ledgerSeq, id: nid('le'), ts: e.ts ?? Date.now() };
  ledger.push(entry);
  return entry;
}
export async function getLedger() {
  return [...ledger];
}
export async function ledgerForSession(sessionId: string) {
  return ledger.filter((e) => e.sessionId === sessionId);
}

// --- reports ---
export async function addReport(r: Omit<Report, 'id' | 'ts' | 'status'>) {
  const report: Report = { ...r, id: nid('rep'), ts: Date.now(), status: 'open' };
  reports.push(report);
  return report;
}
export async function listReports() {
  return [...reports].sort((a, b) => b.ts - a.ts);
}
export async function reviewReport(id: string) {
  const r = reports.find((x) => x.id === id);
  if (r) r.status = 'reviewed';
  return r;
}
