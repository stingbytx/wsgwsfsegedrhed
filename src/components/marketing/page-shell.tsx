import Link from "next/link";
import { SiteHeader } from "./site-header";

/** Shared dark, futuristic shell for About / Terms / Contact. */
export function MarketingPageShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(700px 400px at 15% 0%, rgba(34,211,238,0.12), transparent), radial-gradient(700px 400px at 100% 20%, rgba(59,130,246,0.14), transparent)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      <div className="relative">
        <SiteHeader />
        <main className="max-w-3xl mx-auto px-6 sm:px-10 pt-14 pb-20">
          <h1 className="text-3xl sm:text-4xl font-black text-white mb-10 tracking-tight">{title}</h1>
          <div className="prose prose-invert max-w-none text-slate-300 leading-relaxed [&_h2]:text-white [&_h2]:font-bold [&_h2]:mt-8 [&_h2]:mb-3 [&_h3]:text-white [&_h3]:font-bold [&_h3]:mt-6 [&_h3]:mb-2 [&_a]:text-cyan-400 [&_ul]:list-disc [&_ul]:pl-5 [&_strong]:text-white">
            {children}
          </div>
          <Link href="/" className="inline-block mt-10 text-sm font-medium text-cyan-400 hover:text-cyan-300">
            ← Back to home
          </Link>
        </main>
        <footer className="text-center text-xs text-slate-500 py-8 px-4 border-t border-white/5">
          © 2026 UniPOS. All rights reserved.
          <br />
          Proudly made in Sri Lanka
        </footer>
      </div>
    </div>
  );
}
