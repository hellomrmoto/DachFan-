import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Dash — Live 1:1 creator sessions, on demand",
  description:
    "Request a live one-on-one video session in your niche. Instant or scheduled. Creators come to you.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#0a0a0f",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[#0a0a0f] text-zinc-100">
        <header className="border-b border-white/10 bg-black/40 backdrop-blur sticky top-0 z-40">
          <nav className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
            <Link href="/" className="font-black text-xl tracking-tight">
              <span className="text-rose-500">●</span> dash
            </Link>
            <div className="flex items-center gap-1 text-sm">
              <Link href="/request" className="px-3 py-2 rounded-lg hover:bg-white/10">
                Request
              </Link>
              <Link href="/creator" className="px-3 py-2 rounded-lg hover:bg-white/10">
                Creator
              </Link>
              <Link href="/admin" className="px-3 py-2 rounded-lg hover:bg-white/10 text-zinc-400">
                Admin
              </Link>
            </div>
          </nav>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-white/10 py-6 text-center text-xs text-zinc-500">
          18+ only · All sessions private &amp; watermarked · Demo build — payments stubbed
        </footer>
      </body>
    </html>
  );
}
