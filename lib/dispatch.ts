import type { BuyerRequest, Creator, NicheId, Ping } from './types';
import {
  addPing,
  getRequest,
  listCreators,
  pingsForRequest,
  updatePing,
  updateRequest,
  createSession,
  getCreator,
  appendLedger,
} from './store';

export const PING_TIMEOUT_MS = 25_000;
export const PING_BATCH_SIZE = 3;
export const MAX_ATTEMPTS = 2;
export const PLATFORM_FEE_BPS = 2500; // 25%

/** Deterministic PRNG so the demo sim is reproducible per request. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Score creators for a request: niche match required, then rating vs price. */
export async function rankCreators(
  niche: NicheId,
  budgetCents: number,
  maxMinutes: number,
  excludeIds: string[] = [],
): Promise<Creator[]> {
  const creators = await listCreators();
  return creators
    .filter((c) => c.online)
    .filter((c) => c.niches.includes(niche))
    .filter((c) => !excludeIds.includes(c.id))
    .filter((c) => c.rateCentsPerMin * c.minMinutes <= budgetCents)
    .map((c) => ({
      c,
      score: c.rating * 10 - c.rateCentsPerMin / 100 + (c.niches[0] === niche ? 2 : 0),
    }))
    .sort((a, b) => b.score - a.score)
    .map((x) => x.c);
}

async function sendBatch(requestId: string, now: number): Promise<Ping[]> {
  const req = await getRequest(requestId);
  if (!req) return [];
  const alreadyPinged = (await pingsForRequest(requestId)).map((p) => p.creatorId);
  const batch = (
    await rankCreators(req.niche, req.budgetCents, req.maxMinutes, alreadyPinged)
  ).slice(0, PING_BATCH_SIZE);
  const existing = (await pingsForRequest(requestId)).length;
  const out: Ping[] = [];
  for (let i = 0; i < batch.length; i++) {
    out.push(
      await addPing({
        requestId,
        creatorId: batch[i].id,
        status: 'pending',
        sentAt: now,
        respondBy: now + PING_TIMEOUT_MS,
        seq: existing + i,
      }),
    );
  }
  return out;
}

/**
 * Advance the dispatch simulation. Called on every status poll.
 * Mock creators "respond" once their responseTimeSec elapses, using a
 * seeded RNG so behavior is stable per request.
 */
export async function tickDispatch(requestId: string, now: number = Date.now()): Promise<void> {
  const req = await getRequest(requestId);
  if (!req || req.status !== 'dispatching') return;

  let pings = await pingsForRequest(requestId);
  if (pings.length === 0) {
    pings = await sendBatch(requestId, now);
    await updateRequest(requestId, { attempts: req.attempts + 1 });
    if (pings.length === 0) {
      await updateRequest(requestId, {
        status: 'failed',
        failReason: 'No creators available in this niche right now.',
      });
    }
    return;
  }

  const rng = mulberry32(hashStr(requestId));
  // burn RNG draws for already-resolved pings so draws stay aligned
  for (const p of pings) if (p.status !== 'pending') rng();

  for (const ping of pings) {
    if (ping.status !== 'pending') continue;
    const creator = await getCreator(ping.creatorId);
    if (!creator) {
      await updatePing(ping.id, { status: 'expired' });
      continue;
    }
    const responseAt = ping.sentAt + creator.responseTimeSec * 1000;
    if (now >= Math.min(responseAt, ping.respondBy)) {
      const accepted = now < ping.respondBy && rng() < creator.acceptProbability;
      await updatePing(ping.id, {
        status: accepted ? 'accepted' : now < ping.respondBy ? 'declined' : 'expired',
      });
      if (accepted) {
        // First accept wins — expire the rest.
        for (const other of await pingsForRequest(requestId)) {
          if (other.id !== ping.id && other.status === 'pending') {
            await updatePing(other.id, { status: 'expired' });
          }
        }
        const holdCents = Math.min(
          req.budgetCents,
          creator.rateCentsPerMin * req.maxMinutes,
        );
        const session = await createSession({
          requestId: req.id,
          buyerId: req.buyerId,
          creatorId: creator.id,
          rateCentsPerMin: creator.rateCentsPerMin,
          startedAt: now,
          status: 'active',
          heldCents: holdCents,
        });
        await appendLedger({
          type: 'hold',
          sessionId: session.id,
          amountCents: holdCents,
          memo: `Escrow hold for session ${session.id} @ $${(creator.rateCentsPerMin / 100).toFixed(2)}/min`,
        });
        await updateRequest(requestId, {
          status: 'matched',
          matchedCreatorId: creator.id,
          sessionId: session.id,
        });
        return;
      }
    }
  }

  pings = await pingsForRequest(requestId);
  const anyPending = pings.some((p) => p.status === 'pending');
  if (!anyPending) {
    const accepted = pings.some((p) => p.status === 'accepted');
    if (!accepted) {
      const fresh = (await getRequest(requestId))!;
      if (fresh.attempts < MAX_ATTEMPTS) {
        const next = await sendBatch(requestId, now);
        await updateRequest(requestId, { attempts: fresh.attempts + 1 });
        if (next.length === 0) {
          await updateRequest(requestId, {
            status: 'failed',
            failReason: 'Everyone in this niche is busy. Try again in a few minutes.',
          });
        }
      } else {
        await updateRequest(requestId, {
          status: 'failed',
          failReason: 'No creators accepted. Try again or schedule for later.',
        });
      }
    }
  }
}

/** Buyer cancels while dispatching: expire pending pings. */
export async function cancelDispatch(requestId: string): Promise<void> {
  const req = await getRequest(requestId);
  if (!req || (req.status !== 'dispatching' && req.status !== 'scheduled')) return;
  for (const p of await pingsForRequest(requestId)) {
    if (p.status === 'pending') await updatePing(p.id, { status: 'expired' });
  }
  await updateRequest(requestId, { status: 'cancelled' });
}
