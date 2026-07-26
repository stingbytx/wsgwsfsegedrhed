"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import {
  LayoutDashboard, ShoppingCart, Package, Users, BarChart3, Settings, LogOut,
  Truck, UserCog, Warehouse, FileText, Boxes, Undo2, Wallet, ScrollText,
  ChevronDown, ChevronRight, Gauge, Tag, Ruler, Megaphone, Receipt,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV: NavGroup[] = [
  {
    label: "Main",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/executive-dashboard", label: "Exec BI Dashboard", icon: Gauge },
      { href: "/pos", label: "POS", icon: ShoppingCart },
      { href: "/products", label: "Products (PIM)", icon: Package },
      { href: "/inventory", label: "Inventory", icon: Package },
      { href: "/invoices", label: "Bill History", icon: Receipt },
    ],
  },
  {
    label: "Sales",
    items: [
      { href: "/crm", label: "CRM", icon: Users },
      { href: "/customers", label: "Customers", icon: Users },
      { href: "/returns", label: "Returns", icon: Undo2 },
      { href: "/expenses", label: "Expenses", icon: Wallet },
    ],
  },
  {
    label: "Procurement",
    items: [
      { href: "/suppliers", label: "Suppliers", icon: Truck },
      { href: "/purchases", label: "Purchase Orders", icon: FileText },
      { href: "/grns", label: "GRNs", icon: Boxes },
      { href: "/warehouses", label: "Warehouses", icon: Warehouse },
    ],
  },
  {
    label: "Catalog",
    items: [
      { href: "/brands", label: "Brands", icon: Tag },
      { href: "/units", label: "Units", icon: Ruler },
      { href: "/promotions", label: "Promotions", icon: Megaphone },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/shifts", label: "Shifts & Cash Drawer", icon: Wallet },
      { href: "/employees", label: "Employees", icon: UserCog },
      { href: "/audit-log", label: "Audit Log", icon: ScrollText },
      { href: "/reports", label: "Reports", icon: BarChart3 },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsedGroups, setCollapsedGroups] = React.useState<Record<string, boolean>>({});

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  const toggleGroup = (label: string) => setCollapsedGroups((g) => ({ ...g, [label]: !g[label] }));

  return (
    <aside className="w-60 shrink-0 h-screen sticky top-0 bg-white border-r border-slate-100 flex flex-col">
      {/* Logo */}
      <div className="p-4 flex items-center justify-start">
        <Image
          src="/assets/unipos-logo.png"
          alt="UniPOS"
          width={160}
          height={50}
          className="h-5 w-auto"
          quality={100}
          priority
        />
      </div>

      <nav className="flex-1 px-3 space-y-3 overflow-y-auto">
        {NAV.map((group) => {
          const collapsed = collapsedGroups[group.label];
          const hasActive = group.items.some((i) => pathname.startsWith(i.href));
          return (
            <div key={group.label}>
              <button
                onClick={() => toggleGroup(group.label)}
                className={cn(
                  "flex items-center gap-1 w-full px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-600",
                  hasActive && "text-slate-500"
                )}
              >
                {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                {group.label}
              </button>
              {!collapsed && (
                <div className="space-y-1 mt-1">
                  {group.items.map(({ href, label, icon: Icon }) => {
                    const active = pathname.startsWith(href);
                    return (
                      <Link
                        key={href}
                        href={href}
                        className={cn(
                          "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                          active ? "bg-[#0070E0] text-white" : "text-slate-600 hover:bg-slate-50"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        {label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer Links */}
      <div className="px-3 py-3 border-t border-slate-100 space-y-1">
        <Link href="/about" className="block text-xs text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-50">
          About Us
        </Link>
        <Link href="/terms" className="block text-xs text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-50">
          Terms &amp; Conditions
        </Link>
        <Link href="/contact" className="block text-xs text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-50">
          Contact Us
        </Link>
      </div>

      {/* Sign Out */}
      <div className="p-3 border-t border-slate-100">
        <button
          onClick={signOut}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-50"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
    </aside>
  );
}
