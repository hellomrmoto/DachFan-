'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { money, perMin } from '@/lib/format';

interface PingView {
  id: string;
  status: string;
  creator?: { id: string; name: string; rateCentsPerMin: number; rating: number; color: string };
}

interface TrackState {
  request: {
    id: string;
    status: string;
    niche: string;
    mode: string;
    maxMinutes: number;
    budgetCents: number;
    failReason?: string;
    sessionId?: string;
    scheduledFor?: number;
  };
  pings: PingView[];
  matchedCreator?: { id: string; name: string; tagline: string; rateCentsPerMin: number; rating: number; color: string };
}

function TrackClient() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [state, setState] = useState<TrackState | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const poll = useCallback(async () => {
    const res = await fetch(`/api/requests/${id}`);
    if (!res.ok) return;
    const data = (await res.json()) as TrackState;
    setState(data);
    if (data.request.status === 'matched' && data.request.sessionId) {
      if (timer.current) clearInterval(timer.current);
      router.push(`/session/${data.request.sessionId}`);
    }
    if (['failed', 'cancelled', 'completed'].includes(data.request.status)) {
      if (timer.current) clearInterval(timer.current);
    }
  }, [id, router]);

  useEffect(() => {
    poll();
    timer.current = setInterval(poll, 2000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [poll]);

  async function cancel() {
    setCancelling(true);
    await fetch(`/api/requests/${id}`, { method: 'DELETE' });
    poll();
    setCancelling(false);
  }

  if (!state) {
    return <div className="p-10 text-center text-zinc-400">Finding your creators…</div>;
  }
  const { request, pings, matchedCreator } = state;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      {request.status === 'dispatching' && (
        <>
          <div className="text-center mb-8">
            <div className="inline-block animate-pulse text-5xl mb-4">📡</div>
            <h1 className="text-2xl font-black">Pinging creators…</h1>
            <p className="text-zinc-400 mt-2">
              Your request is live. First to accept wins.
            </p>
          </div>
          <div className="space-y-3 mb-8">
            {pings.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4"
              >
                <div
                  className={`w-12 h-12 rounded-full bg-gradient-to-br ${p.creator?.color ?? 'from-zinc-600 to-zinc-800'} flex items-center justify-center font-black text-lg`}
                >
                  {p.creator?.name?.[0] ?? '?'}
                </div>
                <div className="flex-1">
                  <div className="font-bold">{p.creator?.name ?? '…'}</div>
                  <div className="text-sm text-zinc-400">
                    ⭐ {p.creator?.rating?.toFixed(1)} · {p.creator ? perMin(p.creator.rateCentsPerMin) : ''}
                  </div>
                </div>
                <PingBadge status={p.status} />
              </div>
            ))}
            {pings.length === 0 && (
              <div className="text-center text-zinc-500 text-sm">Contacting the niche…</div>
            )}
          </div>
          <button
            onClick={cancel}
            disabled={cancelling}
            className="w-full py-3 rounded-2xl border border-white/20 hover:bg-white/10 transition disabled:opacity-50"
          >
            {cancelling ? 'Cancelling…' : 'Cancel request'}
          </button>
        </>
      )}

      {request.status === 'scheduled' && (
        <div className="text-center">
          <div className="text-5xl mb-4">📅</div>
          <h1 className="text-2xl font-black mb-2">You&apos;re booked</h1>
          <p className="text-zinc-400 mb-2">
            {matchedCreator?.name} ·{' '}
            {request.scheduledFor
              ? new Date(request.scheduledFor).toLocaleString()
              : ''}
          </p>
          <p className="text-sm text-zinc-500 mb-8">
            Budget cap {money(request.budgetCents)} held at session start.
          </p>
          <button
            onClick={cancel}
            disabled={cancelling}
            className="px-6 py-3 rounded-2xl border border-white/20 hover:bg-white/10 transition disabled:opacity-50"
          >
            Cancel booking
          </button>
        </div>
      )}

      {request.status === 'failed' && (
        <div className="text-center">
          <div className="text-5xl mb-4">😕</div>
          <h1 className="text-2xl font-black mb-2">No creators available</h1>
          <p className="text-zinc-400 mb-8">{request.failReason}</p>
          <div className="flex gap-3 justify-center">
            <Link href="/request" className="px-6 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 font-bold transition">
              Try again
            </Link>
            <Link href={`/request?niche=${request.niche}`} className="px-6 py-3 rounded-2xl border border-white/20 hover:bg-white/10 transition">
              Schedule later
            </Link>
          </div>
        </div>
      )}

      {request.status === 'cancelled' && (
        <div className="text-center">
          <div className="text-5xl mb-4">✌️</div>
          <h1 className="text-2xl font-black mb-2">Request cancelled</h1>
          <p className="text-zinc-400 mb-8">No charge — escrow was never held.</p>
          <Link href="/request" className="px-6 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 font-bold transition">
            New request
          </Link>
        </div>
      )}
    </div>
  );
}

function PingBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
    accepted: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
    declined: 'bg-zinc-500/15 text-zinc-400 border-white/10',
    expired: 'bg-zinc-500/15 text-zinc-500 border-white/10',
  };
  return (
    <span className={`text-xs font-bold px-3 py-1 rounded-full border ${map[status] ?? map.expired}`}>
      {status}
    </span>
  );
}

export default function TrackPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-zinc-400">Finding your creators…</div>}>
      <TrackClient />
    </Suspense>
  );
}
