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
    <div className="min-h-screen bg-[#EEF2FA] py-8 px-4 sm:px-8">
      <div className="relative overflow-hidden rounded-[32px] bg-[#FBF9F6] shadow-2xl max-w-6xl mx-auto min-h-[640px] flex flex-col">
        <SiteHeader />

        <div className="relative flex-1 grid grid-cols-1 lg:grid-cols-2 items-center">
          {/* Left: copy */}
          <div className="relative z-10 px-6 sm:px-12 py-10">
            <h1 className="font-black text-slate-900 leading-[1.05] text-4xl sm:text-6xl tracking-tight">
              Welcome to
              <br />
              UniPOS
            </h1>
            <p className="mt-6 text-slate-600 max-w-sm leading-relaxed">
              UniPOS is a smart and easy-to-use Point of Sale system designed to help your business run smoothly.
            </p>
            <p className="mt-3 text-slate-600 max-w-sm leading-relaxed">
              Manage sales, inventory, customers, and reports all in one place — fast, secure, and built for growth.
            </p>
            <Link
              href="/login"
              className="inline-block mt-8 rounded-full bg-slate-900 text-white text-sm font-medium px-7 py-3 hover:bg-slate-800 transition-colors"
            >
              Get Started
            </Link>
          </div>

          {/* Right: abstract blue blob panel */}
          <div className="relative h-[420px] lg:h-full lg:min-h-[560px] overflow-hidden">
            <div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(60% 60% at 50% 45%, #1e63e0 0%, #0070E0 45%, rgba(0,112,224,0) 75%)",
                filter: "blur(18px)",
              }}
            />
            {/* vertical soft stripes for the "brush" look */}
            <div className="absolute inset-0 flex">
              {Array.from({ length: 7 }).map((_, i) => (
                <div
                  key={i}
                  className="flex-1"
                  style={{
                    background: i % 2 === 0 ? "rgba(255,255,255,0.10)" : "transparent",
                    filter: "blur(6px)",
                  }}
                />
              ))}
            </div>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
              <p className="text-white/80 text-xs tracking-wide mb-2">Smart business management</p>
              <p className="text-white font-black text-4xl sm:text-6xl tracking-tight drop-shadow-sm">UniPOS</p>
            </div>
            <p className="absolute left-6 top-1/4 text-white/70 text-[11px] leading-tight max-w-[90px]">
              All-in-one POS solution
            </p>
            <p className="absolute right-6 bottom-10 text-white/70 text-[11px] leading-tight max-w-[110px] text-right">
              Built for speed, designed for you
            </p>
          </div>
        </div>
      </div>

      <p className="text-center text-xs text-slate-400 mt-6">
        UniPOS is a subsidiary of DotcomOne © {new Date().getFullYear()}
      </p>
    </div>
  );
}
