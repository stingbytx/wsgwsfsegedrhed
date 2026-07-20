import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/marketing/site-header";

export default async function RootPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-[#FDF3EF] flex flex-col">
      <SiteHeader />

      <div className="relative flex-1 grid grid-cols-1 lg:grid-cols-2 items-center overflow-hidden">
        {/* Left: copy */}
        <div className="relative z-10 px-6 sm:px-14 py-10">
          <h1 className="font-serif font-black text-slate-900 leading-[0.95] text-5xl sm:text-6xl lg:text-7xl tracking-tight">
            Welcome to
            <br />
            UniPOS
          </h1>
          <p className="mt-8 text-slate-600 max-w-sm leading-relaxed">
            UniPOS is a smart and easy-to-use Point of Sale system designed to help your business run smoothly.
          </p>
          <p className="mt-3 text-slate-600 max-w-sm leading-relaxed">
            Manage sales, inventory, customers, and reports all in one place — fast, secure, and built for growth.
          </p>
          <Link
            href="/login"
            className="inline-block mt-9 rounded-full bg-slate-900 text-white text-sm font-medium px-7 py-3.5 hover:bg-slate-800 transition-colors lowercase"
          >
            get started
          </Link>
        </div>

        {/* Right: abstract blue blob panel — bleeds off the edge like the reference */}
        <div className="relative h-[420px] lg:h-full lg:min-h-[680px] overflow-visible">
          <div
            className="absolute"
            style={{
              top: "-8%",
              bottom: "-8%",
              left: "0",
              right: "-15%",
              background:
                "radial-gradient(60% 65% at 55% 50%, #2f6fe0 0%, #0e57d9 45%, rgba(14,87,217,0) 78%)",
              filter: "blur(14px)",
            }}
          />
          {/* vertical soft stripe cuts for the "brush" look */}
          <div className="absolute inset-0 flex" style={{ left: "-4%", right: "-15%" }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex-1"
                style={{
                  background: i % 2 === 0 ? "rgba(255,255,255,0.14)" : "transparent",
                  filter: "blur(7px)",
                }}
              />
            ))}
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
            <p className="text-white/85 text-xs tracking-wide mb-3 -translate-x-6">
              Smart
              <br />
              business
              <br />
              management
            </p>
            <p className="text-white font-black text-5xl sm:text-6xl lg:text-7xl tracking-tight drop-shadow-sm mt-6">
              UniPOS
            </p>
          </div>
          <p className="absolute left-[8%] bottom-[28%] text-white/80 text-[12px] leading-tight max-w-[110px]">
            All-in-one
            <br />
            POS solution
          </p>
          <p className="absolute right-[6%] bottom-[14%] text-white/80 text-[12px] leading-tight max-w-[120px] text-right">
            Built for speed,
            <br />
            designed for you
          </p>
        </div>
      </div>

      <footer className="text-center text-xs text-slate-400 py-6 px-4">
        © 2026 UniPOS. All rights reserved.
        <br />
        Proudly made in Sri Lanka
      </footer>
    </div>
  );
}
