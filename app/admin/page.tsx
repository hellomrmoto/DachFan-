'use client';

import { useEffect, useState } from 'react';
import { money, timeAgo } from '@/lib/format';

interface Overview {
  stats: {
    grossVolumeCents: number;
    platformFeesCents: number;
    sessions: number;
    requests: number;
    openReports: number;
  };
  ledger: { seq: number; ts: number; type: string; sessionId: string; amountCents: number; memo: string }[];
  reports: { id: string; ts: number; sessionId?: string; reporterRole: string; reason: string; status: string }[];
}

const TYPE_STYLE: Record<string, string> = {
  hold: 'text-sky-300',
  capture: 'text-emerald-300',
  release: 'text-zinc-400',
  tip: 'text-amber-300',
  platform_fee: 'text-rose-300',
  payout: 'text-violet-300',
};

export default function AdminPage() {
  const [data, setData] = useState<Overview | null>(null);

  useEffect(() => {
    fetch('/api/admin/overview')
      .then((r) => r.json())
      .then(setData);
  }, []);

  if (!data) return <div className="p-10 text-center text-zinc-400">Loading…</div>;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-black mb-8">Admin</h1>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-10">
        {[
          { k: 'Gross volume', v: money(data.stats.grossVolumeCents) },
          { k: 'Platform fees', v: money(data.stats.platformFeesCents) },
          { k: 'Sessions', v: String(data.stats.sessions) },
          { k: 'Requests', v: String(data.stats.requests) },
          { k: 'Open reports', v: String(data.stats.openReports) },
        ].map((s) => (
          <div key={s.k} className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs text-zinc-400">{s.k}</div>
            <div className="text-xl font-black mt-1">{s.v}</div>
          </div>
        ))}
      </div>

      <h2 className="text-xl font-bold mb-4">Moderation queue</h2>
      {data.reports.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-zinc-500 text-sm mb-10">
          No reports. Quiet is good.
        </div>
      ) : (
        <div className="space-y-2 mb-10">
          {data.reports.map((r) => (
            <div key={r.id} className="rounded-xl border border-white/10 bg-white/5 p-4 flex justify-between items-center text-sm">
              <div>
                <span className="font-bold">{r.reason}</span>
                <span className="text-zinc-500"> · {r.reporterRole} · {timeAgo(r.ts)}</span>
                {r.sessionId && <span className="text-zinc-500"> · {r.sessionId}</span>}
              </div>
              <span className={`text-xs px-2 py-1 rounded-full border ${r.status === 'open' ? 'border-amber-500/40 text-amber-300' : 'border-white/10 text-zinc-500'}`}>
                {r.status}
              </span>
            </div>
          ))}
        </div>
      )}

      <h2 className="text-xl font-bold mb-4">Ledger <span className="text-sm font-normal text-zinc-500">(append-only)</span></h2>
      <div className="rounded-2xl border border-white/10 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-white/5 text-left text-zinc-400 text-xs">
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Session</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3">Memo</th>
              <th className="px-4 py-3">When</th>
            </tr>
          </thead>
          <tbody>
            {data.ledger.map((e) => (
              <tr key={e.seq} className="border-t border-white/5">
                <td className="px-4 py-2.5 text-zinc-500 font-mono">{e.seq}</td>
                <td className={`px-4 py-2.5 font-mono font-bold ${TYPE_STYLE[e.type] ?? ''}`}>{e.type}</td>
                <td className="px-4 py-2.5 font-mono text-xs text-zinc-400">{e.sessionId}</td>
                <td className={`px-4 py-2.5 text-right font-mono ${e.amountCents < 0 ? 'text-zinc-500' : ''}`}>
                  {e.amountCents < 0 ? '−' : ''}{money(Math.abs(e.amountCents))}
                </td>
                <td className="px-4 py-2.5 text-zinc-400 text-xs max-w-[280px] truncate">{e.memo}</td>
                <td className="px-4 py-2.5 text-zinc-500 text-xs">{timeAgo(e.ts)}</td>
              </tr>
            ))}
            {data.ledger.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">
                  No ledger entries yet — run a session to see money move.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
