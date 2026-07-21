"use client";
import Link from "next/link";

const LINKS = [
  { href: "/about-us", label: "About" },
  { href: "/terms-and-conditions", label: "Terms" },
  { href: "/contact", label: "Contact" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/70 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-6 sm:px-10 py-4">
        <Link href="/" className="flex items-center gap-2 font-bold tracking-tight text-lg text-white">
          <span className="h-7 w-7 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-white text-xs font-black">
            U
          </span>
          UniPOS
        </Link>
        <nav className="hidden sm:flex items-center gap-8">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="text-sm text-slate-300 hover:text-white transition-colors">
              {l.label}
            </Link>
          ))}
        </nav>
        <Link
          href="/login"
          className="text-sm font-medium text-slate-950 bg-white hover:bg-slate-100 rounded-full px-4 py-2 transition-colors"
        >
          Sign in
        </Link>
      </div>
    </header>
  );
}
