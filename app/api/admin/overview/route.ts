import { NextResponse } from 'next/server';
import { getLedger, listReports, listRequests, listSessions } from '@/lib/store';

export async function GET() {
  const ledger = await getLedger();
  const volume = ledger
    .filter((e) => e.type === 'capture' || e.type === 'tip')
    .reduce((a, e) => a + e.amountCents, 0);
  const fees = ledger
    .filter((e) => e.type === 'platform_fee')
    .reduce((a, e) => a + e.amountCents, 0);
  const sessions = await listSessions();
  const requests = await listRequests();
  const reports = await listReports();
  return NextResponse.json({
    stats: {
      grossVolumeCents: volume,
      platformFeesCents: fees,
      sessions: sessions.length,
      requests: requests.length,
      openReports: reports.filter((r) => r.status === 'open').length,
    },
    ledger: [...ledger].reverse().slice(0, 100),
    reports: reports.slice(0, 50),
    sessions: sessions.slice(0, 20),
  });
}
