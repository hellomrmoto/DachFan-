import { NextResponse } from 'next/server';
import {
  addPing,
  appendLedger,
  createSession,
  getCreator,
  getPing,
  getRequest,
  pingsForRequest,
  updatePing,
  updateRequest,
} from '@/lib/store';
import { tickDispatch } from '@/lib/dispatch';

/**
 * A (human) creator answers a ping. Accept → first-accept-wins: expire the
 * other pending pings, create the session, hold escrow.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { accept } = (await req.json().catch(() => ({}))) as { accept?: boolean };
  const ping = await getPing(id);
  if (!ping || ping.status !== 'pending') {
    return NextResponse.json({ error: 'Ping is no longer pending' }, { status: 409 });
  }
  const request = await getRequest(ping.requestId);
  const creator = await getCreator(ping.creatorId);
  if (!request || !creator) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (!accept) {
    await updatePing(id, { status: 'declined' });
    await tickDispatch(request.id); // keep dispatch moving
    return NextResponse.json({ ping: await getPing(id) });
  }

  await updatePing(id, { status: 'accepted' });
  for (const other of await pingsForRequest(request.id)) {
    if (other.id !== id && other.status === 'pending') {
      await updatePing(other.id, { status: 'expired' });
    }
  }
  const holdCents = Math.min(request.budgetCents, creator.rateCentsPerMin * request.maxMinutes);
  const session = await createSession({
    requestId: request.id,
    buyerId: request.buyerId,
    creatorId: creator.id,
    rateCentsPerMin: creator.rateCentsPerMin,
    startedAt: Date.now(),
    status: 'active',
    heldCents: holdCents,
  });
  await appendLedger({
    type: 'hold',
    sessionId: session.id,
    amountCents: holdCents,
    memo: `Escrow hold for session ${session.id} @ $${(creator.rateCentsPerMin / 100).toFixed(2)}/min`,
  });
  await updateRequest(request.id, {
    status: 'matched',
    matchedCreatorId: creator.id,
    sessionId: session.id,
  });
  return NextResponse.json({ ping: await getPing(id), session });
}

/** Demo helper: inject a ping for a creator (used by the creator dashboard demo). */
export async function PUT(req: Request) {
  const { requestId, creatorId } = (await req.json().catch(() => ({}))) as {
    requestId?: string;
    creatorId?: string;
  };
  if (!requestId || !creatorId) {
    return NextResponse.json({ error: 'requestId and creatorId are required' }, { status: 400 });
  }
  const request = await getRequest(requestId);
  const creator = await getCreator(creatorId);
  if (!request || !creator) {
    return NextResponse.json({ error: 'Unknown request or creator' }, { status: 404 });
  }
  const now = Date.now();
  const ping = await addPing({
    requestId,
    creatorId,
    status: 'pending',
    sentAt: now,
    respondBy: now + 60_000,
    seq: 0,
  });
  return NextResponse.json({ ping });
}
