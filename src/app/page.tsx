import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/marketing/site-header";
import {
  ArrowRight,
  Zap,
  ShieldCheck,
  BarChart3,
  Boxes,
  Users,
  Barcode,
  CloudOff,
  Sparkles,
} from "lucide-react";

export const metadata: Metadata = {
  title: "UniPOS | Modern Cloud Point of Sale (POS) Software for Businesses",
  description:
    "UniPOS is a modern cloud-based Point of Sale (POS) software for retailers, restaurants, cafés, supermarkets, pharmacies, and businesses. Manage sales, inventory, customers, billing, reports, and more from anywhere.",
  alternates: { canonical: "/" },
};

const FEATURES = [
  { icon: Zap, title: "Lightning Fast Checkout", desc: "Barcode scanning, instant search, and keyboard-first billing built for high-volume counters." },
  { icon: CloudOff, title: "Offline-First", desc: "Runs entirely in your browser via IndexedDB — sales keep flowing even without internet." },
  { icon: Boxes, title: "Smart Inventory", desc: "Stock tracking, low-stock alerts, barcode generation, and product images out of the box." },
  { icon: Users, title: "Customer & Credit", desc: "Searchable customer directory, quick registration mid-sale, and credit-sale tracking." },
  { icon: BarChart3, title: "Real-Time Reports", desc: "Daily, weekly, monthly analytics with profit, expense, and refund breakdowns." },
  { icon: ShieldCheck, title: "Secure Auth", desc: "Email + Google sign-in via Supabase — your business data never leaves your device." },
];

const STATS = [
  { value: "0s", label: "Setup required" },
  { value: "100%", label: "Data stays local" },
  { value: "24/7", label: "Works offline" },
  { value: "∞", label: "Products & orders" },
];

export default async function RootPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white relative overflow-hidden">
      {/* Ambient gradient mesh background */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(900px 500px at 10% -10%, rgba(34,211,238,0.18), transparent), radial-gradient(900px 600px at 100% 0%, rgba(59,130,246,0.22), transparent), radial-gradient(700px 500px at 50% 110%, rgba(168,85,247,0.14), transparent)",
        }}
      />
      {/* Faint grid overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative">
        <SiteHeader />

        {/* Hero */}
        <section className="max-w-6xl mx-auto px-6 sm:px-10 pt-20 pb-24 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs text-cyan-300 mb-8">
            <Sparkles className="h-3.5 w-3.5" />
            Now available — browser-based, offline-first POS
          </div>
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.05]">
            The Point of Sale
            <br />
            <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
              built for the future.
            </span>
          </h1>
          <p className="mt-6 max-w-xl mx-auto text-slate-400 text-base sm:text-lg leading-relaxed">
            UniPOS helps retailers, restaurants, cafés, supermarkets, and pharmacies manage sales, inventory,
            customers, billing, and reporting — all from one fast, secure dashboard.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4 flex-wrap">
            <Link
              href="/login"
              className="group inline-flex items-center gap-2 rounded-full bg-white text-slate-950 font-semibold px-7 py-3.5 hover:bg-slate-100 transition-colors"
            >
              Get Started
              <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link
              href="/about-us"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 text-white font-medium px-7 py-3.5 hover:bg-white/5 transition-colors"
            >
              Learn More
            </Link>
          </div>

          {/* Stats strip */}
          <div className="mt-20 grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-3xl mx-auto">
            {STATS.map((s) => (
              <div key={s.label} className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm py-5">
                <p className="text-2xl sm:text-3xl font-black bg-gradient-to-br from-cyan-300 to-blue-400 bg-clip-text text-transparent">
                  {s.value}
                </p>
                <p className="text-xs text-slate-400 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Feature grid */}
        <section className="max-w-6xl mx-auto px-6 sm:px-10 pb-24">
          <div className="text-center mb-14">
            <h2 className="text-2xl sm:text-3xl font-bold">Everything your business needs</h2>
            <p className="text-slate-400 mt-2">One dashboard. Zero cloud dependency for your data.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="group rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-6 hover:border-cyan-400/30 hover:bg-white/[0.06] transition-all"
              >
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-400/20 to-blue-500/20 flex items-center justify-center mb-4 group-hover:from-cyan-400/30 group-hover:to-blue-500/30 transition-colors">
                  <Icon className="h-5 w-5 text-cyan-300" />
                </div>
                <h3 className="font-semibold text-white mb-1.5">{title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Barcode-flavored CTA band */}
        <section className="max-w-6xl mx-auto px-6 sm:px-10 pb-24">
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-blue-600/20 via-cyan-500/10 to-purple-600/20 p-10 sm:p-14 text-center">
            <Barcode className="h-8 w-8 text-cyan-300 mx-auto mb-4" />
            <h2 className="text-2xl sm:text-3xl font-bold">Ready to modernize your checkout?</h2>
            <p className="text-slate-300 mt-3 max-w-md mx-auto">
              Create your free UniPOS account in seconds — no credit card, no setup, no servers to manage.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 mt-8 rounded-full bg-white text-slate-950 font-semibold px-7 py-3.5 hover:bg-slate-100 transition-colors"
            >
              Get Started <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        <footer className="text-center text-xs text-slate-500 py-8 px-4 border-t border-white/5">
          © 2026 UniPOS. All rights reserved.
          <br />
          Proudly made in Sri Lanka
        </footer>
      </div>
    </div>
  );
}
