'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { NICHES } from '@/lib/niches';
import type { NicheId } from '@/lib/types';

export default function OnboardingPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [niches, setNiches] = useState<NicheId[]>([]);
  const [rate, setRate] = useState(3.5);
  const [minMinutes, setMinMinutes] = useState(5);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function toggle(n: NicheId) {
    setNiches((prev) => (prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]));
  }

  async function submit() {
    setError('');
    if (!name.trim()) return setError('Stage name is required.');
    if (niches.length === 0) return setError('Pick at least one niche.');
    setBusy(true);
    try {
      const res = await fetch('/api/creators', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          tagline: tagline.trim(),
          niches,
          rateCentsPerMin: Math.round(rate * 100),
          minMinutes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      router.push(`/creator?as=${data.creator.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-3xl font-black mb-2">Become a creator</h1>
      <p className="text-zinc-400 mb-8">
        Go online, get pinged, get paid. You keep 75% of every session + 75% of tips.
      </p>

      <label className="block text-sm font-semibold mb-2">Stage name</label>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Maya Blaze"
        className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 mb-6"
      />

      <label className="block text-sm font-semibold mb-2">Tagline</label>
      <input
        value={tagline}
        onChange={(e) => setTagline(e.target.value)}
        placeholder="One line buyers see on your ping"
        className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 mb-6"
      />

      <label className="block text-sm font-semibold mb-2">Your niches</label>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        {NICHES.map((n) => (
          <button
            key={n.id}
            onClick={() => toggle(n.id)}
            className={`rounded-2xl border p-4 text-left transition ${
              niches.includes(n.id)
                ? 'border-rose-500 bg-rose-500/10'
                : 'border-white/10 bg-white/5 hover:bg-white/10'
            }`}
          >
            <div className="text-2xl">{n.emoji}</div>
            <div className="font-bold text-sm mt-1">{n.name}</div>
          </button>
        ))}
      </div>

      <label className="block text-sm font-semibold mb-2">
        Rate: ${rate.toFixed(2)}/min
      </label>
      <input
        type="range"
        min={1}
        max={20}
        step={0.5}
        value={rate}
        onChange={(e) => setRate(Number(e.target.value))}
        className="w-full mb-6 accent-rose-500"
      />

      <label className="block text-sm font-semibold mb-2">
        Minimum session: {minMinutes} min
      </label>
      <input
        type="range"
        min={5}
        max={60}
        step={5}
        value={minMinutes}
        onChange={(e) => setMinMinutes(Number(e.target.value))}
        className="w-full mb-8 accent-rose-500"
      />

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
        {busy ? 'Creating…' : 'Create creator profile'}
      </button>
      <p className="mt-4 text-xs text-zinc-500 text-center">
        Demo: ID verification (Veriff/Persona) plugs in here before go-live.
      </p>
    </div>
  );
}
