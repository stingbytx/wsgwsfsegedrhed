"use client";
import * as React from "react";
import { GlobalSearch } from "./global-search";
import { useAuthStore } from "@/stores/auth-store";
import { initials } from "@/lib/format";
import { useUIStore } from "@/stores/ui-store";

/** Top app header — hosts the global search bar and the user chip. */
export function AppHeader() {
  const user = useAuthStore((s) => s.user);
  const { currencySymbol } = useUIStore();
  const email = user?.email ?? "user@example.com";
  const name = (user?.user_metadata as { full_name?: string } | null)?.full_name ?? email.split("@")[0];

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-sm border-b border-slate-100 px-6 py-3 flex items-center gap-4">
      <GlobalSearch />
      <div className="ml-auto flex items-center gap-3">
        <span className="text-xs text-slate-400 hidden sm:inline">Currency: <strong className="text-slate-600">{currencySymbol}</strong></span>
        <div className="flex items-center gap-2 pl-3 border-l border-slate-100">
          <div className="h-8 w-8 rounded-full bg-[#0070E0] text-white text-xs font-semibold flex items-center justify-center shrink-0">
            {initials(name)}
          </div>
          <div className="hidden md:block leading-tight">
            <p className="text-sm font-medium text-slate-700 truncate max-w-[160px]">{name}</p>
            <p className="text-[11px] text-slate-400 truncate max-w-[160px]">{email}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
