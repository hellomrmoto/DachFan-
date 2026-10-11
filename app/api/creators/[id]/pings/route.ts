import { NextResponse } from 'next/server';
import { getCreator, getRequest, pendingPingsForCreator } from '@/lib/store';
import { nicheById } from '@/lib/niches';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const creator = await getCreator(id);
  if (!creator) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const raw = await pendingPingsForCreator(id);
  const pings = await Promise.all(
    raw.map(async (p) => {
      const request = await getRequest(p.requestId);
      return {
        ...p,
        request: request
          ? {
              id: request.id,
              niche: nicheById(request.niche),
              mode: request.mode,
              maxMinutes: request.maxMinutes,
              budgetCents: request.budgetCents,
              createdAt: request.createdAt,
            }
          : undefined,
      };
    }),
  );
  return NextResponse.json({ pings });
}
