import type { SessionAccounting } from './types';
import { appendLedger, getSession, ledgerForSession, listSessions, updateSession } from './store';
import { PLATFORM_FEE_BPS } from './dispatch';

export const PLATFORM_FEE_RATE = PLATFORM_FEE_BPS / 10000;

/**
 * End a session and settle the escrow. Server-authoritative: duration is
 * computed from server timestamps, never the client clock.
 *
 * - minutes billed = ceil(duration), minimum 1
 * - capture = min(minutes * rate, held)
 * - release = held - capture (remainder back to buyer)
 * - tips captured in full; platform takes 25% of (capture + tips)
 */
export async function endSession(
  sessionId: string,
  now: number = Date.now(),
): Promise<SessionAccounting | undefined> {
  const s = await getSession(sessionId);
  if (!s || s.status !== 'active') return undefined;

  const endedAt = now;
  const minutes = Math.max(1, Math.ceil((endedAt - s.startedAt) / 60000));
  const gross = minutes * s.rateCentsPerMin;
  const captureCents = Math.min(gross, s.heldCents);
  const releaseCents = s.heldCents - captureCents;

  await appendLedger({
    type: 'capture',
    sessionId,
    amountCents: captureCents,
    memo: `${minutes} min @ $${(s.rateCentsPerMin / 100).toFixed(2)}/min`,
  });
  if (releaseCents > 0) {
    await appendLedger({
      type: 'release',
      sessionId,
      amountCents: -releaseCents,
      memo: 'Unused escrow released to buyer',
    });
  }

  const tips = (await ledgerForSession(sessionId))
    .filter((e) => e.type === 'tip')
    .reduce((sum, e) => sum + e.amountCents, 0);
  const revenue = captureCents + tips;
  const platformFee = Math.round(revenue * PLATFORM_FEE_RATE);
  await appendLedger({
    type: 'platform_fee',
    sessionId,
    amountCents: platformFee,
    memo: `${(PLATFORM_FEE_RATE * 100).toFixed(0)}% platform fee`,
  });
  await appendLedger({
    type: 'payout',
    sessionId,
    amountCents: revenue - platformFee,
    memo: 'Creator payout (capture + tips minus fee)',
  });

  await updateSession(sessionId, { status: 'ended', endedAt });
  return accounting(sessionId);
}

export async function addTip(sessionId: string, amountCents: number): Promise<boolean> {
  const s = await getSession(sessionId);
  if (!s || s.status !== 'active' || amountCents <= 0) return false;
  await appendLedger({
    type: 'tip',
    sessionId,
    amountCents,
    memo: `Buyer tip $${(amountCents / 100).toFixed(2)}`,
  });
  return true;
}

export async function accounting(sessionId: string): Promise<SessionAccounting | undefined> {
  const s = await getSession(sessionId);
  if (!s) return undefined;
  const entries = await ledgerForSession(sessionId);
  const capture = entries.filter((e) => e.type === 'capture').reduce((a, e) => a + e.amountCents, 0);
  const tips = entries.filter((e) => e.type === 'tip').reduce((a, e) => a + e.amountCents, 0);
  const fee = entries.filter((e) => e.type === 'platform_fee').reduce((a, e) => a + e.amountCents, 0);
  const minutes =
    s.endedAt != null ? Math.max(1, Math.ceil((s.endedAt - s.startedAt) / 60000)) : 0;
  return {
    sessionId,
    minutes,
    rateCentsPerMin: s.rateCentsPerMin,
    grossCents: capture + tips,
    buyerChargedCents: capture + tips,
    platformFeeCents: fee,
    creatorNetCents: capture + tips - fee,
    releasedCents: s.heldCents - capture,
  };
}

export async function creatorEarnings(
  creatorId: string,
): Promise<{ sessions: number; netCents: number }> {
  // Derive from payout entries across sessions for this creator.
  let net = 0;
  let count = 0;
  for (const s of await listSessions()) {
    if (s.creatorId !== creatorId || s.status !== 'ended') continue;
    const a = await accounting(s.id);
    if (a) {
      net += a.creatorNetCents;
      count += 1;
    }
  }
  return { sessions: count, netCents: net };
}
