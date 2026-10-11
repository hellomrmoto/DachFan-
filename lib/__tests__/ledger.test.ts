import { describe, expect, it, beforeEach } from 'vitest';
import { tickDispatch, cancelDispatch } from '../dispatch';
import {
  createRequest,
  createSession,
  getLedger,
  getRequest,
  pingsForRequest,
  resetStore,
  updateCreator,
} from '../store';
import { accounting, addTip, endSession } from '../ledger';

beforeEach(async () => {
  await resetStore();
});

async function instantRequest() {
  return createRequest({
    buyerId: 'buyer_demo',
    niche: 'solo',
    mode: 'instant',
    maxMinutes: 10,
    budgetCents: 10000,
  });
}

describe('dispatch simulation', () => {
  it('sends a ping batch on first tick', async () => {
    const req = await instantRequest();
    await tickDispatch(req.id, Date.now());
    const pings = await pingsForRequest(req.id);
    expect(pings.length).toBeGreaterThan(0);
    expect(pings.length).toBeLessThanOrEqual(3);
    expect((await getRequest(req.id))!.attempts).toBe(1);
  });

  it('fails cleanly when no creators are available', async () => {
    const req = await createRequest({
      buyerId: 'buyer_demo',
      niche: 'couples',
      mode: 'instant',
      maxMinutes: 10,
      budgetCents: 100, // nobody's minimum fits
    });
    await tickDispatch(req.id, Date.now());
    const r = (await getRequest(req.id))!;
    expect(r.status).toBe('failed');
    expect(r.failReason).toBeTruthy();
  });

  it('a guaranteed-accept creator produces a session + escrow hold', async () => {
    // cr_maya tops the solo ranking, so she lands in the first ping batch
    await updateCreator('cr_maya', { acceptProbability: 1, responseTimeSec: 0 });
    const req = await instantRequest();
    const t0 = Date.now();
    await tickDispatch(req.id, t0); // sends batch
    await tickDispatch(req.id, t0 + 1000); // resolves: maya accepts
    const r = (await getRequest(req.id))!;
    expect(r.status).toBe('matched');
    expect(r.matchedCreatorId).toBe('cr_maya');
    expect(r.sessionId).toBeTruthy();
    const holds = (await getLedger()).filter((e) => e.type === 'hold');
    expect(holds).toHaveLength(1);
    expect(holds[0].amountCents).toBe(350 * 10); // 350cpm * 10 min
  });

  it('all-decline leads to failed after max attempts', async () => {
    for (const c of ['cr_maya', 'cr_dante', 'cr_onyx', 'cr_sasha'] as const) {
      await updateCreator(c, { acceptProbability: 0, responseTimeSec: 0 });
    }
    const req = await instantRequest();
    let t = Date.now();
    for (let i = 0; i < 10; i++) {
      t += 1000;
      await tickDispatch(req.id, t);
      if ((await getRequest(req.id))!.status === 'failed') break;
    }
    const r = (await getRequest(req.id))!;
    expect(r.status).toBe('failed');
    expect(r.attempts).toBe(2);
  });

  it('cancel expires pending pings', async () => {
    const req = await instantRequest();
    await tickDispatch(req.id, Date.now());
    expect((await pingsForRequest(req.id)).some((p) => p.status === 'pending')).toBe(true);
    await cancelDispatch(req.id);
    const r = (await getRequest(req.id))!;
    expect(r.status).toBe('cancelled');
    expect((await pingsForRequest(req.id)).every((p) => p.status !== 'pending')).toBe(true);
  });
});

describe('ledger settlement', () => {
  async function activeSession() {
    const startedAt = Date.now() - 7 * 60000; // 7 minutes ago
    return createSession({
      requestId: 'req_x',
      buyerId: 'buyer_demo',
      creatorId: 'cr_maya',
      rateCentsPerMin: 350,
      startedAt,
      status: 'active',
      heldCents: 3500,
    });
  }

  it('settles capture + release + 25% fee + payout', async () => {
    const s = await activeSession();
    const a = (await endSession(s.id, s.startedAt + 7 * 60000))!;
    expect(a.minutes).toBe(7);
    // capture = 7 * 350 = 2450; release = 3500 - 2450 = 1050
    expect(a.buyerChargedCents).toBe(2450);
    expect(a.releasedCents).toBe(1050);
    expect(a.platformFeeCents).toBe(Math.round(2450 * 0.25)); // 613 (rounded)
    expect(a.creatorNetCents).toBe(2450 - a.platformFeeCents);

    const types = (await getLedger()).map((e) => e.type);
    expect(types).toEqual(['capture', 'release', 'platform_fee', 'payout']);
  });

  it('tips flow to the creator minus the fee', async () => {
    const s = await activeSession();
    expect(await addTip(s.id, 1000)).toBe(true);
    const a = (await endSession(s.id, s.startedAt + 7 * 60000))!;
    // revenue = 2450 + 1000 = 3450; fee = round(3450 * .25) = 863
    expect(a.buyerChargedCents).toBe(3450);
    expect(a.platformFeeCents).toBe(863);
    expect(a.creatorNetCents).toBe(3450 - 863);
  });

  it('capture never exceeds the hold', async () => {
    const s = await createSession({
      requestId: 'req_y',
      buyerId: 'buyer_demo',
      creatorId: 'cr_maya',
      rateCentsPerMin: 350,
      startedAt: Date.now() - 60 * 60000, // ran long
      status: 'active',
      heldCents: 3500,
    });
    const a = (await endSession(s.id))!;
    expect(a.buyerChargedCents).toBe(3500); // capped at hold
    expect(a.releasedCents).toBe(0);
  });

  it('ending twice is a no-op', async () => {
    const s = await activeSession();
    expect(await endSession(s.id)).toBeTruthy();
    expect(await endSession(s.id)).toBeUndefined();
  });

  it('ledger has no update or delete path (append-only)', async () => {
    const store = await import('../store');
    const keys = Object.keys(store);
    expect(keys).not.toContain('updateLedger');
    expect(keys).not.toContain('deleteLedger');
    expect(keys).toContain('appendLedger');
  });

  it('accounting() reflects a live session before end', async () => {
    const s = await activeSession();
    const a = (await accounting(s.id))!;
    expect(a.minutes).toBe(0); // not ended yet
    expect(a.rateCentsPerMin).toBe(350);
  });
});
