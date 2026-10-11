import { NextResponse } from 'next/server';
import { NICHES } from '@/lib/niches';
import { createRequest, getRequest } from '@/lib/store';
import { tickDispatch, rankCreators } from '@/lib/dispatch';
import type { NicheId } from '@/lib/types';

const DEMO_BUYER = 'buyer_demo';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { niche, mode, scheduledFor, maxMinutes, budgetCents } = body as {
    niche: NicheId;
    mode: 'instant' | 'scheduled';
    scheduledFor?: number;
    maxMinutes?: number;
    budgetCents?: number;
  };

  if (!NICHES.some((n) => n.id === niche)) {
    return NextResponse.json({ error: 'Unknown niche' }, { status: 400 });
  }
  const mins = Math.min(Math.max(Number(maxMinutes) || 10, 5), 60);
  const budget = Math.max(Number(budgetCents) || 5000, 1000);

  if (mode === 'scheduled') {
    if (!scheduledFor || scheduledFor < Date.now() + 5 * 60000) {
      return NextResponse.json(
        { error: 'Scheduled time must be at least 5 minutes in the future' },
        { status: 400 },
      );
    }
    const [best] = await rankCreators(niche, budget, mins);
    if (!best) {
      return NextResponse.json({ error: 'No creators available in this niche' }, { status: 409 });
    }
    const request = await createRequest({
      buyerId: DEMO_BUYER,
      niche,
      mode,
      scheduledFor,
      maxMinutes: mins,
      budgetCents: budget,
      status: 'scheduled',
      matchedCreatorId: best.id,
    });
    return NextResponse.json({ request, creator: best });
  }

  const request = await createRequest({
    buyerId: DEMO_BUYER,
    niche,
    mode: 'instant',
    maxMinutes: mins,
    budgetCents: budget,
  });
  // Kick the first dispatch batch immediately so the first poll has pings.
  await tickDispatch(request.id);
  return NextResponse.json({ request: await getRequest(request.id) });
}
