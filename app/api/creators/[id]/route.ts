import { NextResponse } from 'next/server';
import { getCreator, listRequests, updateCreator } from '@/lib/store';
import { creatorEarnings } from '@/lib/ledger';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const creator = await getCreator(id);
  if (!creator) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const scheduled = (await listRequests()).filter(
    (r) => r.status === 'scheduled' && r.matchedCreatorId === id,
  );
  return NextResponse.json({
    creator,
    earnings: await creatorEarnings(id),
    scheduled,
  });
}

/** Update presence, rate, minimums. */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as {
    online?: boolean;
    rateCentsPerMin?: number;
    minMinutes?: number;
  };
  const patch: Record<string, unknown> = {};
  if (typeof body.online === 'boolean') patch.online = body.online;
  if (body.rateCentsPerMin != null) {
    patch.rateCentsPerMin = Math.min(Math.max(Math.floor(body.rateCentsPerMin), 100), 2000);
  }
  if (body.minMinutes != null) {
    patch.minMinutes = Math.min(Math.max(Math.floor(body.minMinutes), 5), 60);
  }
  const creator = await updateCreator(id, patch);
  if (!creator) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ creator });
}
