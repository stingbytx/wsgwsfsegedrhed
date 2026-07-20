"use client";
import Link from "next/link";

const LINKS = [
  { href: "/about", label: "about us" },
  { href: "/terms", label: "terms & conditions" },
  { href: "/contact", label: "contact us" },
];

export function SiteHeader() {
  return (
    <header className="flex items-center justify-between px-6 sm:px-10 py-6">
      <Link href="/" className="font-black uppercase tracking-widest text-sm text-slate-900">
        UniPOS
      </Link>
      <nav className="hidden sm:flex items-center gap-8">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className="text-sm text-slate-600 hover:text-slate-900 transition-colors">
            {l.label}
          </Link>
        ))}
      </nav>
      <Link
        href="/login"
        className="sm:hidden text-sm font-medium text-slate-900 border border-slate-200 rounded-full px-4 py-1.5"
      >
        Login
      </Link>
    </header>
  );
}
