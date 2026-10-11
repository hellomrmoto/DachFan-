'use client';

import { Suspense, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { NICHES } from '@/lib/niches';
import { money } from '@/lib/format';
import type { NicheId } from '@/lib/types';

function Builder() {
  const params = useSearchParams();
  const router = useRouter();
  const [niche, setNiche] = useState<NicheId>(
    (params.get('niche') as NicheId) || 'solo',
  );
  const [mode, setMode] = useState<'instant' | 'scheduled'>('instant');
  const [scheduledFor, setScheduledFor] = useState('');
  const [maxMinutes, setMaxMinutes] = useState(10);
  const [budget, setBudget] = useState(50);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const scheduledTs = useMemo(() => {
    if (!scheduledFor) return null;
    const t = new Date(scheduledFor).getTime();
    return Number.isNaN(t) ? null : t;
  }, [scheduledFor]);

  async function submit() {
    setError('');
    if (mode === 'scheduled' && (!scheduledTs || scheduledTs < Date.now() + 5 * 60000)) {
      setError('Pick a time at least 5 minutes in the future.');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          niche,
          mode,
          scheduledFor: mode === 'scheduled' ? scheduledTs : undefined,
          maxMinutes,
          budgetCents: Math.round(budget * 100),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');
      router.push(`/track/${data.request.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed');
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-3xl font-black mb-2">Build your request</h1>
      <p className="text-zinc-400 mb-8">
        This goes out to every online creator in the niche — like a delivery order.
      </p>

      <label className="block text-sm font-semibold mb-2">Niche</label>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        {NICHES.map((n) => (
          <button
            key={n.id}
            onClick={() => setNiche(n.id)}
            className={`rounded-2xl border p-4 text-left transition ${
              niche === n.id
                ? 'border-rose-500 bg-rose-500/10'
                : 'border-white/10 bg-white/5 hover:bg-white/10'
            }`}
          >
            <div className="text-2xl">{n.emoji}</div>
            <div className="font-bold text-sm mt-1">{n.name}</div>
          </button>
        ))}
      </div>

      <label className="block text-sm font-semibold mb-2">When</label>
      <div className="flex gap-3 mb-6">
        {(['instant', 'scheduled'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex-1 rounded-2xl border p-4 font-bold transition ${
              mode === m ? 'border-rose-500 bg-rose-500/10' : 'border-white/10 bg-white/5 hover:bg-white/10'
            }`}
          >
            {m === 'instant' ? '⚡ Right now' : '📅 Schedule it'}
          </button>
        ))}
      </div>

      {mode === 'scheduled' && (
        <div className="mb-6">
          <label className="block text-sm font-semibold mb-2">Date &amp; time</label>
          <input
            type="datetime-local"
            value={scheduledFor}
            onChange={(e) => setScheduledFor(e.target.value)}
            className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white [color-scheme:dark]"
          />
        </div>
      )}

      <label className="block text-sm font-semibold mb-2">
        Max length: {maxMinutes} min
      </label>
      <input
        type="range"
        min={5}
        max={60}
        step={5}
        value={maxMinutes}
        onChange={(e) => setMaxMinutes(Number(e.target.value))}
        className="w-full mb-6 accent-rose-500"
      />

      <label className="block text-sm font-semibold mb-2">
        Budget cap: {money(budget * 100)}
      </label>
      <input
        type="range"
        min={10}
        max={200}
        step={5}
        value={budget}
        onChange={(e) => setBudget(Number(e.target.value))}
        className="w-full mb-2 accent-rose-500"
      />
      <p className="text-xs text-zinc-500 mb-8">
        You&apos;re only charged for actual minutes used. Unused escrow is released automatically.
      </p>

      {error && (
        <div className="mb-4 rounded-xl bg-red-500/10 border border-red-500/40 text-red-300 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <button
        onClick={submit}
        disabled={busy}
        className="w-full py-4 rounded-2xl bg-rose-600 hover:bg-rose-500 font-bold text-lg transition disabled:opacity-50"
      >
        {busy ? 'Sending…' : mode === 'instant' ? '⚡ Send request now' : '📅 Book this session'}
      </button>
    </div>
  );
}

export default function RequestPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-zinc-400">Loading…</div>}>
      <Builder />
    </Suspense>
  );
}
