import { NextResponse } from 'next/server';
import { getCreator, getRequest, getSession, pingsForRequest } from '@/lib/store';
import { cancelDispatch, tickDispatch } from '@/lib/dispatch';

/** Poll dispatch status. Each poll advances the simulation clock. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  await tickDispatch(id);
  const request = await getRequest(id);
  if (!request) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const rawPings = await pingsForRequest(id);
  const pings = await Promise.all(
    rawPings.map(async (p) => ({ ...p, creator: await getCreator(p.creatorId) })),
  );
  const session = request.sessionId ? await getSession(request.sessionId) : undefined;
  const matchedCreator = request.matchedCreatorId
    ? await getCreator(request.matchedCreatorId)
    : undefined;
  return NextResponse.json({ request, pings, session, matchedCreator });
}

/** Buyer cancels while dispatching or scheduled. */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  await cancelDispatch(id);
  const request = await getRequest(id);
  return NextResponse.json({ request });
}
