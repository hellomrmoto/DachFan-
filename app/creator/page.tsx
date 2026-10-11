'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { money, perMin, timeAgo } from '@/lib/format';
import { nicheById } from '@/lib/niches';

interface CreatorView {
  id: string;
  name: string;
  online: boolean;
  rateCentsPerMin: number;
  minMinutes: number;
  rating: number;
  ratingsCount: number;
  color: string;
}

interface PingView {
  id: string;
  sentAt: number;
  respondBy: number;
  request?: {
    id: string;
    niche: { name: string; emoji: string };
    mode: string;
    maxMinutes: number;
    budgetCents: number;
  };
}

function Dashboard() {
  const params = useSearchParams();
  const asParam = params.get('as');
  const [creators, setCreators] = useState<CreatorView[]>([]);
  const [creatorId, setCreatorId] = useState<string>('');
  const [online, setOnline] = useState(false);
  const [rate, setRate] = useState(0);
  const [pings, setPings] = useState<PingView[]>([]);
  const [earnings, setEarnings] = useState({ sessions: 0, netCents: 0 });
  const [scheduled, setScheduled] = useState<
    { id: string; niche: string; scheduledFor?: number; maxMinutes: number; budgetCents: number }[]
  >([]);

  const loadCreators = useCallback(async () => {
    const res = await fetch('/api/creators');
    const data = await res.json();
    setCreators(data.creators);
    const pick = asParam || data.creators[0]?.id || '';
    setCreatorId((prev) => prev || pick);
  }, [asParam]);

  const loadDashboard = useCallback(async () => {
    if (!creatorId) return;
    const res = await fetch(`/api/creators/${creatorId}`);
    if (!res.ok) return;
    const data = await res.json();
    setOnline(data.creator.online);
    setRate(data.creator.rateCentsPerMin);
    setEarnings(data.earnings);
    setScheduled(
      data.scheduled.map((r: { id: string; niche: string; scheduledFor?: number; maxMinutes: number; budgetCents: number }) => ({
        ...r,
        niche: nicheById(r.niche as never)?.name ?? r.niche,
      })),
    );
    const p = await fetch(`/api/creators/${creatorId}/pings`);
    if (p.ok) setPings((await p.json()).pings);
  }, [creatorId]);

  useEffect(() => {
    loadCreators();
  }, [loadCreators]);
  useEffect(() => {
    loadDashboard();
    const t = setInterval(loadDashboard, 3000);
    return () => clearInterval(t);
  }, [loadDashboard]);

  async function patch(body: Record<string, unknown>) {
    const res = await fetch(`/api/creators/${creatorId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.ok) loadDashboard();
  }

  async function respond(pingId: string, accept: boolean) {
    await fetch(`/api/pings/${pingId}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accept }),
    });
    loadDashboard();
  }

  const creator = creators.find((c) => c.id === creatorId);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-black">Creator dashboard</h1>
          <p className="text-zinc-400 text-sm">You keep 75% of sessions + 75% of tips</p>
        </div>
        <select
          value={creatorId}
          onChange={(e) => setCreatorId(e.target.value)}
          className="rounded-xl bg-white/5 border border-white/10 px-4 py-2 text-sm"
        >
          {creators.map((c) => (
            <option key={c.id} value={c.id} className="bg-zinc-900">
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Status + rate */}
      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="text-sm text-zinc-400 mb-2">Status</div>
          <button
            onClick={() => patch({ online: !online })}
            className={`w-full py-3 rounded-xl font-bold transition ${
              online ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-zinc-700 hover:bg-zinc-600'
            }`}
          >
            {online ? '🟢 Online — taking pings' : '⚫ Offline'}
          </button>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="text-sm text-zinc-400 mb-2">Rate: {perMin(rate)}</div>
          <input
            type="range"
            min={100}
            max={2000}
            step={25}
            value={rate}
            onChange={(e) => setRate(Number(e.target.value))}
            onMouseUp={() => patch({ rateCentsPerMin: rate })}
            onTouchEnd={() => patch({ rateCentsPerMin: rate })}
            className="w-full accent-rose-500"
          />
          <div className="text-xs text-zinc-500 mt-1">Release the slider to save</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="text-sm text-zinc-400 mb-2">Earnings (demo)</div>
          <div className="text-2xl font-black">{money(earnings.netCents)}</div>
          <div className="text-xs text-zinc-500">{earnings.sessions} sessions</div>
        </div>
      </div>

      {/* Incoming pings */}
      <h2 className="text-xl font-bold mb-4">
        Incoming pings {pings.length > 0 && <span className="text-rose-400">({pings.length})</span>}
      </h2>
      {pings.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-zinc-500 mb-8">
          {online
            ? 'No pings right now. Stay online — requests come to you.'
            : 'Go online to start receiving pings.'}
          <div className="mt-4 text-xs">
            Demo: send a buyer request from the <Link href="/request" className="underline">request page</Link> and
            watch it land here.
          </div>
        </div>
      ) : (
        <div className="space-y-3 mb-8">
          {pings.map((p) => (
            <div key={p.id} className="rounded-2xl border border-amber-500/40 bg-amber-500/5 p-5">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <div className="font-bold text-lg">
                    {p.request?.niche.emoji} {p.request?.niche.name} session
                  </div>
                  <div className="text-sm text-zinc-400">
                    Up to {p.request?.maxMinutes} min · budget {p.request ? money(p.request.budgetCents) : ''} · {timeAgo(p.sentAt)}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => respond(p.id, false)}
                    className="px-5 py-2.5 rounded-xl border border-white/20 hover:bg-white/10 font-bold transition"
                  >
                    Decline
                  </button>
                  <button
                    onClick={() => respond(p.id, true)}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold transition"
                  >
                    Accept ⚡
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Scheduled bookings */}
      <h2 className="text-xl font-bold mb-4">Scheduled bookings</h2>
      {scheduled.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-zinc-500 text-sm">
          Nothing booked yet.
        </div>
      ) : (
        <div className="space-y-3">
          {scheduled.map((s) => (
            <div key={s.id} className="rounded-2xl border border-white/10 bg-white/5 p-4 flex justify-between items-center">
              <div>
                <div className="font-bold">{s.niche}</div>
                <div className="text-sm text-zinc-400">
                  {s.scheduledFor ? new Date(s.scheduledFor).toLocaleString() : ''} · up to {s.maxMinutes} min
                </div>
              </div>
              <div className="text-sm text-zinc-400">{money(s.budgetCents)} cap</div>
            </div>
          ))}
        </div>
      )}

      {creator && (
        <p className="mt-8 text-xs text-zinc-500">
          {creator.name} · ⭐ {creator.rating.toFixed(1)} ({creator.ratingsCount} ratings) · min {creator.minMinutes} min
        </p>
      )}
    </div>
  );
}

export default function CreatorPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-zinc-400">Loading…</div>}>
      <Dashboard />
    </Suspense>
  );
}
