import Link from "next/link";
import { SiteHeader } from "./site-header";

/** Shared shell for About / Terms / Contact — same card look as the landing page. */
export function MarketingPageShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#EEF2FA] py-8 px-4 sm:px-8">
      <div
        className="relative overflow-hidden rounded-[32px] bg-[#FBF9F6] shadow-2xl max-w-5xl mx-auto"
        style={{
          backgroundImage:
            "radial-gradient(1200px 400px at 100% -10%, rgba(0,112,224,0.06), transparent)",
        }}
      >
        <SiteHeader />
        <main className="px-6 sm:px-12 pb-16 pt-4 max-w-3xl">
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 mb-8">{title}</h1>
          <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed [&_h2]:text-slate-900 [&_h2]:font-bold [&_h2]:mt-8 [&_h2]:mb-3 [&_h3]:text-slate-900 [&_h3]:font-bold [&_h3]:mt-6 [&_h3]:mb-2 [&_a]:text-[#0070E0] [&_ul]:list-disc [&_ul]:pl-5 [&_strong]:text-slate-800">
            {children}
          </div>
          <Link href="/" className="inline-block mt-10 text-sm font-medium text-[#0070E0] hover:underline">
            ← Back to home
          </Link>
        </main>
      </div>
      <footer className="text-center text-xs text-slate-400 py-6 px-4">
        © 2026 UniPOS. All rights reserved.
        <br />
        Proudly made in Sri Lanka
      </footer>
    </div>
  );
}
