import { NextResponse } from 'next/server';
import { addReport } from '@/lib/store';

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    sessionId?: string;
    reporterRole?: 'buyer' | 'creator';
    reason?: string;
    detail?: string;
  };
  if (!body.reason) return NextResponse.json({ error: 'Reason is required' }, { status: 400 });
  const report = await addReport({
    sessionId: body.sessionId,
    reporterRole: body.reporterRole === 'creator' ? 'creator' : 'buyer',
    reason: String(body.reason).slice(0, 120),
    detail: String(body.detail || '').slice(0, 1000),
  });
  return NextResponse.json({ report });
}
