'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { money, mmss, perMin } from '@/lib/format';

interface SessionView {
  session: {
    id: string;
    status: 'active' | 'ended';
    startedAt: number;
    endedAt?: number;
    rateCentsPerMin: number;
    heldCents: number;
  };
  creator?: { id: string; name: string; color: string };
  video: { provider: string; roomName?: string };
}

interface Accounting {
  minutes: number;
  rateCentsPerMin: number;
  grossCents: number;
  buyerChargedCents: number;
  platformFeeCents: number;
  creatorNetCents: number;
  releasedCents: number;
}

function SessionRoom() {
  const { id } = useParams<{ id: string }>();
  const [view, setView] = useState<SessionView | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [receipt, setReceipt] = useState<Accounting | null>(null);
  const [tipping, setTipping] = useState(false);
  const [tipTotal, setTipTotal] = useState(0);
  const [ending, setEnding] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reportDone, setReportDone] = useState(false);
  const clock = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/sessions/${id}`);
    if (res.ok) setView(await res.json());
  }, [id]);

  useEffect(() => {
    load();
    clock.current = setInterval(() => {
      setView((v) => {
        if (v && v.session.status === 'active') {
          setElapsed(Math.floor((Date.now() - v.session.startedAt) / 1000));
        }
        return v;
      });
    }, 1000);
    return () => {
      if (clock.current) clearInterval(clock.current);
    };
  }, [load]);

  async function tip(cents: number) {
    setTipping(true);
    const res = await fetch(`/api/sessions/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'tip', amountCents: cents }),
    });
    if (res.ok) setTipTotal((t) => t + cents);
    setTipping(false);
  }

  async function end() {
    setEnding(true);
    const res = await fetch(`/api/sessions/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'end' }),
    });
    if (res.ok) {
      const data = await res.json();
      setReceipt(data.accounting);
      if (clock.current) clearInterval(clock.current);
    }
    setEnding(false);
  }

  async function report(reason: string) {
    await fetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: id, reporterRole: 'buyer', reason, detail: '' }),
    });
    setReporting(false);
    setReportDone(true);
  }

  if (receipt) {
    return (
      <div className="mx-auto max-w-md px-4 py-10">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
          <div className="text-5xl mb-4">🧾</div>
          <h1 className="text-2xl font-black mb-6">Session receipt</h1>
          <dl className="text-left space-y-2 text-sm">
            <Row k="Duration" v={`${receipt.minutes} min @ ${perMin(receipt.rateCentsPerMin)}`} />
            <Row k="Session charge" v={money(receipt.buyerChargedCents - tipTotal)} />
            <Row k="Tips" v={money(tipTotal)} />
            <Row k="Total charged" v={money(receipt.buyerChargedCents)} bold />
            <Row k="Escrow released to you" v={money(receipt.releasedCents)} />
            <Row k="Creator received" v={money(receipt.creatorNetCents)} />
          </dl>
          <div className="mt-8 flex gap-3">
            <Link href="/request" className="flex-1 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 font-bold transition text-center">
              New session
            </Link>
            <Link href="/" className="flex-1 py-3 rounded-2xl border border-white/20 hover:bg-white/10 transition text-center">
              Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!view) return <div className="p-10 text-center text-zinc-400">Joining session…</div>;

  const costSoFar = Math.ceil(elapsed / 60) * view.session.rateCentsPerMin;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      {/* Room */}
      <div className="rounded-3xl overflow-hidden border border-white/10 bg-black">
        <div className="flex items-center justify-between px-4 py-2 bg-white/5 text-xs">
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> LIVE · {view.video.roomName}
          </span>
          <span className="text-zinc-500">© watermark: buyer_demo</span>
        </div>
        <div className="grid sm:grid-cols-2 gap-px bg-white/10">
          <div className={`aspect-video bg-gradient-to-br ${view.creator?.color ?? 'from-zinc-700 to-zinc-900'} flex flex-col items-center justify-center`}>
            <div className="text-5xl font-black opacity-80">{view.creator?.name?.[0]}</div>
            <div className="mt-2 font-bold">{view.creator?.name}</div>
            <div className="text-xs text-white/60 mt-1">
              {view.video.provider === 'mock' ? 'simulated video — wire LiveKit for real calls' : 'live video'}
            </div>
          </div>
          <div className="aspect-video bg-zinc-900 flex flex-col items-center justify-center">
            <div className="text-5xl">🙂</div>
            <div className="mt-2 font-bold text-zinc-300">You</div>
            <div className="text-xs text-zinc-500 mt-1">camera preview</div>
          </div>
        </div>
        <div className="flex items-center justify-between px-4 py-3 bg-white/5">
          <div className="font-mono text-xl font-bold">{mmss(elapsed)}</div>
          <div className="text-sm text-zinc-400">
            ~{money(costSoFar)} so far · {perMin(view.session.rateCentsPerMin)}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="mt-4 flex flex-wrap gap-3">
        {[100, 500, 1000].map((c) => (
          <button
            key={c}
            onClick={() => tip(c)}
            disabled={tipping}
            className="px-5 py-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 font-bold transition disabled:opacity-50"
          >
            💛 Tip {money(c)}
          </button>
        ))}
        {tipTotal > 0 && (
          <div className="px-5 py-3 text-sm text-amber-300 self-center">
            Tipped {money(tipTotal)} this session
          </div>
        )}
        <div className="flex-1" />
        {!reporting && !reportDone && (
          <button
            onClick={() => setReporting(true)}
            className="px-5 py-3 rounded-2xl border border-white/20 hover:bg-white/10 text-sm transition"
          >
            🚩 Report
          </button>
        )}
        {reportDone && <span className="self-center text-sm text-emerald-300">Report filed — we&apos;ll review.</span>}
        <button
          onClick={end}
          disabled={ending}
          className="px-8 py-3 rounded-2xl bg-red-600 hover:bg-red-500 font-bold transition disabled:opacity-50"
        >
          {ending ? 'Ending…' : 'End session'}
        </button>
      </div>

      {reporting && (
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-sm font-bold mb-3">What happened?</div>
          <div className="flex flex-wrap gap-2">
            {['Recording without consent', 'Underage concern', 'Harassment', 'Payment issue', 'Other'].map((r) => (
              <button
                key={r}
                onClick={() => report(r)}
                className="px-4 py-2 rounded-xl border border-white/20 hover:bg-white/10 text-sm transition"
              >
                {r}
              </button>
            ))}
            <button onClick={() => setReporting(false)} className="px-4 py-2 text-sm text-zinc-500">
              Cancel
            </button>
          </div>
        </div>
      )}

      <p className="mt-6 text-xs text-zinc-500 text-center">
        Billing is server-side by the minute (partial minutes round up). Tips go to the creator minus the 25% platform fee.
      </p>
    </div>
  );
}

function Row({ k, v, bold }: { k: string; v: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? 'font-bold text-base pt-2 border-t border-white/10' : ''}`}>
      <dt className="text-zinc-400">{k}</dt>
      <dd>{v}</dd>
    </div>
  );
}

export default function SessionPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-zinc-400">Joining session…</div>}>
      <SessionRoom />
    </Suspense>
  );
}
