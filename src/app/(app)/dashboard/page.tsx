"use client";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDashboardStats } from "@/hooks/use-dashboard-stats";
import { formatCurrency } from "@/lib/utils";
import { useUIStore } from "@/stores/ui-store";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  ShoppingBag,
  DollarSign,
  TrendingUp,
  Wallet,
  Package,
  Users,
  AlertTriangle,
  Plus,
  Warehouse,
  FileBarChart,
  Receipt,
  SlidersHorizontal,
} from "lucide-react";

const QUICK_ACTIONS = [
  { href: "/pos", label: "New Sale", icon: ShoppingBag },
  { href: "/inventory?new=product", label: "Add Product", icon: Plus },
  { href: "/inventory", label: "Inventory", icon: Warehouse },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/reports", label: "Reports", icon: FileBarChart },
  { href: "/settings", label: "Settings", icon: SlidersHorizontal },
];

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="text-xs font-medium text-slate-400">{label}</p>
          <p className="text-xl font-semibold text-slate-800 mt-1">{value}</p>
        </div>
        <div className={`h-10 w-10 rounded-2xl flex items-center justify-center ${accent ?? "bg-[#0070E0]/10 text-[#0070E0]"}`}>
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const stats = useDashboardStats();
  const { currencySymbol } = useUIStore();

  if (!stats) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 w-48 bg-slate-100 rounded-lg animate-pulse" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-24 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const fmt = (n: number) => formatCurrency(n, currencySymbol);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Dashboard</h1>
          <p className="text-sm text-slate-500">Here&apos;s what&apos;s happening in your store today.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={DollarSign} label="Today's Sales" value={fmt(stats.todaySales)} />
        <StatCard icon={ShoppingBag} label="Today's Orders" value={String(stats.todayOrdersCount)} />
        <StatCard icon={TrendingUp} label="Revenue" value={fmt(stats.revenue)} />
        <StatCard icon={Wallet} label="Profit" value={fmt(stats.profit)} />
        <StatCard icon={Receipt} label="Expenses" value={fmt(stats.expenses)} />
        <StatCard icon={Package} label="Inventory Value" value={fmt(stats.inventoryValue)} />
        <StatCard icon={Package} label="Products" value={String(stats.productsCount)} />
        <StatCard icon={Users} label="Customers" value={String(stats.customersCount)} />
      </div>

      {stats.lowStock.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/60">
          <CardContent className="flex items-center gap-3 p-4">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
            <p className="text-sm text-amber-700">
              {stats.lowStock.length} product(s) are low on stock:{" "}
              {stats.lowStock.slice(0, 5).map((p) => p.name).join(", ")}
              {stats.lowStock.length > 5 ? "…" : ""}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {QUICK_ACTIONS.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href}>
            <Card className="hover:shadow-md hover:-translate-y-0.5 transition-all p-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-[#0070E0] flex items-center justify-center text-white">
                <Icon className="h-4 w-4" />
              </div>
              <span className="font-medium text-slate-700 text-sm">{label}</span>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Sales — Last 7 Days</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.last7Days}>
                <defs>
                  <linearGradient id="sales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0070E0" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#0070E0" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => fmt(Number(v))} />
                <Area type="monotone" dataKey="sales" stroke="#0070E0" fill="url(#sales)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Products</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.topProducts}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => fmt(Number(v))} />
                <Bar dataKey="revenue" fill="#009CDE" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats.recentOrders.length === 0 && <p className="text-sm text-slate-400">No orders yet.</p>}
            {stats.recentOrders.map((o) => (
              <div key={o.id} className="flex items-center justify-between text-sm py-1.5 border-b border-slate-50 last:border-0">
                <span className="text-slate-600">{o.orderNumber}</span>
                <span className="font-medium text-slate-800">{fmt(o.total)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent Customers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats.recentCustomers.length === 0 && <p className="text-sm text-slate-400">No customers yet.</p>}
            {stats.recentCustomers.map((c) => (
              <div key={c.id} className="flex items-center justify-between text-sm py-1.5 border-b border-slate-50 last:border-0">
                <span className="text-slate-600">{c.name}</span>
                <span className="text-slate-400 text-xs">{c.phone}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent Products</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats.recentProducts.length === 0 && <p className="text-sm text-slate-400">No products yet.</p>}
            {stats.recentProducts.map((p) => (
              <div key={p.id} className="flex items-center justify-between text-sm py-1.5 border-b border-slate-50 last:border-0">
                <span className="text-slate-600">{p.name}</span>
                <span className="font-medium text-slate-800">{fmt(p.price)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
