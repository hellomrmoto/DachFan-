import { NextResponse } from 'next/server';
import { getSession, getCreator, updateRequest } from '@/lib/store';
import { addTip, endSession } from '@/lib/ledger';
import { getProcessor } from '@/lib/payments';
import { makeRoomConfig } from '@/lib/video';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getSession(id);
  if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({
    session,
    creator: await getCreator(session.creatorId),
    video: makeRoomConfig(id, 'buyer'),
  });
}

/** POST {action:'end'} → settle escrow. POST {action:'tip', amountCents} → tip. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { action, amountCents } = (await req.json().catch(() => ({}))) as {
    action?: 'end' | 'tip';
    amountCents?: number;
  };

  if (action === 'tip') {
    const session = await getSession(id);
    if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const cents = Math.max(0, Math.floor(Number(amountCents) || 0));
    if (cents < 100) return NextResponse.json({ error: 'Minimum tip is $1' }, { status: 400 });
    await getProcessor().charge(cents, session.buyerId);
    if (!(await addTip(id, cents))) {
      return NextResponse.json({ error: 'Session is not active' }, { status: 409 });
    }
    return NextResponse.json({ ok: true, tipCents: cents });
  }

  const result = await endSession(id);
  if (!result) return NextResponse.json({ error: 'Session not found or not active' }, { status: 404 });
  const session = await getSession(id);
  if (session) await updateRequest(session.requestId, { status: 'completed' });
  return NextResponse.json({ accounting: result });
}
