"use client";
import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuthStore } from "@/stores/auth-store";
import { useUIStore } from "@/stores/ui-store";
import {
  ShoppingCart, FileText, PackagePlus, PackageMinus, UserPlus, Truck,
  Wallet, BarChart3, DatabaseBackup, Upload, Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const QUICK_ACTIONS = [
  { href: "/pos", label: "New Sale", icon: ShoppingCart },
  { href: "/purchases", label: "New Purchase", icon: FileText },
  { href: "/inventory?stock=in", label: "Stock In", icon: PackagePlus },
  { href: "/inventory?stock=out", label: "Stock Out", icon: PackageMinus },
  { href: "/customers", label: "New Customer", icon: UserPlus },
  { href: "/suppliers", label: "New Supplier", icon: Truck },
  { href: "/expenses", label: "Expense", icon: Wallet },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/settings#backup", label: "Backup", icon: DatabaseBackup },
  { href: "/settings#backup", label: "Restore", icon: Upload },
  { href: "/settings", label: "Settings", icon: Settings },
];

/** Live ticking clock. */
function LiveClock() {
  const [now, setNow] = React.useState(new Date());
  React.useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="text-right leading-tight">
      <p className="text-sm font-semibold text-slate-700 tabular-nums">
        {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
      </p>
      <p className="text-[11px] text-slate-400">
        {now.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
      </p>
    </div>
  );
}

export function ExecutiveHeader({ warehouse = "Main" }: { warehouse?: string }) {
  const user = useAuthStore((s) => s.user);
  const { currency } = useUIStore();
  const name = (user?.user_metadata as { full_name?: string } | null)?.full_name ?? user?.email?.split("@")[0] ?? "User";

  return (
    <div className="rounded-[20px] bg-white border border-slate-100 shadow-[0_2px_20px_rgba(0,48,135,0.06)] p-5">
      <div className="flex flex-wrap items-center gap-4 justify-between">
        <div className="flex items-center gap-3">
          <Image src="/assets/unipos-logo.png" alt="UniPOS" width={48} height={48} className="h-11 w-11 rounded-xl object-contain" />
          <div>
            <h1 className="text-xl font-semibold text-slate-800">Welcome back, {name}</h1>
            <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 flex-wrap">
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> Online
              </span>
              <span>•</span>
              <span>Warehouse: <strong className="text-slate-600">{warehouse}</strong></span>
              <span>•</span>
              <span>Currency: <strong className="text-slate-600">{currency}</strong></span>
              <span>•</span>
              <span className="inline-flex items-center gap-1 text-emerald-600">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Business Online
              </span>
            </div>
          </div>
        </div>
        <LiveClock />
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-100">
        {QUICK_ACTIONS.map(({ href, label, icon: Icon }) => (
          <Link
            key={label}
            href={href}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium",
              "bg-slate-50 text-slate-600 hover:bg-[#0070E0]/10 hover:text-[#0070E0] transition-colors"
            )}
          >
            <Icon className="h-3.5 w-3.5" /> {label}
          </Link>
        ))}
      </div>
    </div>
  );
}
