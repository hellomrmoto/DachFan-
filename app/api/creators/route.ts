import { NextResponse } from 'next/server';
import { NICHES } from '@/lib/niches';
import { listCreators, newCreatorId, upsertCreator } from '@/lib/store';
import type { NicheId } from '@/lib/types';

export async function GET() {
  const creators = await listCreators();
  return NextResponse.json({
    creators: creators.map((c) => ({
      ...c,
      acceptProbability: undefined,
      responseTimeSec: undefined,
    })),
  });
}

/** Creator onboarding: create a profile. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    name?: string;
    tagline?: string;
    niches?: NicheId[];
    rateCentsPerMin?: number;
    minMinutes?: number;
  };
  const name = (body.name || '').trim();
  if (!name) return NextResponse.json({ error: 'Stage name is required' }, { status: 400 });
  const niches = (body.niches || []).filter((n) => NICHES.some((x) => x.id === n));
  if (niches.length === 0) {
    return NextResponse.json({ error: 'Pick at least one niche' }, { status: 400 });
  }
  const rate = Math.min(Math.max(Math.floor(Number(body.rateCentsPerMin) || 300), 100), 2000);
  const mins = Math.min(Math.max(Math.floor(Number(body.minMinutes) || 5), 60), 60);

  const creator = await upsertCreator({
    id: newCreatorId(),
    name,
    tagline: (body.tagline || '').trim() || 'New creator — say hi 👋',
    niches,
    rateCentsPerMin: rate,
    minMinutes: mins,
    rating: 5.0,
    ratingsCount: 0,
    online: false,
    acceptProbability: 0.8,
    responseTimeSec: 8,
    color: 'from-violet-500 to-fuchsia-500',
  });
  return NextResponse.json({ creator });
}
