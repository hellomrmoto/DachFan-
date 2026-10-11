import Link from "next/link";
import { NICHES } from "@/lib/niches";

export default function Home() {
  return (
    <div>
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pt-16 pb-12 text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-rose-400 font-semibold mb-4">
          DoorDash dispatch · OnlyFans monetization
        </p>
        <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-tight">
          Don&apos;t browse rooms.
          <br />
          <span className="bg-gradient-to-r from-rose-500 to-orange-400 bg-clip-text text-transparent">
            Send the request. Creators come to you.
          </span>
        </h1>
        <p className="mt-6 text-zinc-400 max-w-2xl mx-auto text-lg">
          Pick your niche, go instant or schedule it out. Your request pings
          available creators — first to accept opens your private live session.
          Pay per minute, tip anytime.
        </p>
        <div className="mt-8 flex gap-3 justify-center">
          <Link
            href="/request"
            className="px-8 py-4 rounded-2xl bg-rose-600 hover:bg-rose-500 font-bold text-lg transition"
          >
            Request a session
          </Link>
          <Link
            href="/creator/onboarding"
            className="px-8 py-4 rounded-2xl border border-white/20 hover:bg-white/10 font-bold text-lg transition"
          >
            Become a creator
          </Link>
        </div>
      </section>

      {/* Niches */}
      <section className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="text-2xl font-bold mb-6">Pick your niche</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {NICHES.map((n) => (
            <Link
              key={n.id}
              href={`/request?niche=${n.id}`}
              className="rounded-2xl border border-white/10 bg-white/5 p-6 hover:bg-white/10 hover:border-rose-500/50 transition text-left"
            >
              <div className="text-3xl mb-2">{n.emoji}</div>
              <div className="font-bold">{n.name}</div>
              <div className="text-sm text-zinc-400">{n.blurb}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="text-2xl font-bold mb-6">How it works</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { t: "1. You request", d: "Choose a niche, set a length or budget, go instant or pick a time." },
            { t: "2. Creators get pinged", d: "Online creators in your niche get the request — like a DoorDash order." },
            { t: "3. Private session opens", d: "First to accept starts your 1:1 video call. Escrow held, pay per minute, tip anytime." },
          ].map((s) => (
            <div key={s.t} className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="font-bold text-lg mb-2">{s.t}</div>
              <div className="text-zinc-400 text-sm">{s.d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Trust strip */}
      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 flex flex-wrap gap-x-8 gap-y-3 justify-center text-sm text-zinc-400">
          <span>🔒 ID-verified creators</span>
          <span>💧 Escrow on every session</span>
          <span>©️ Watermarked streams</span>
          <span>🚫 No recording without consent</span>
          <span>📱 Web app — no app-store games</span>
        </div>
      </section>
    </div>
  );
}
