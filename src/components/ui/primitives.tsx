import * as React from "react";
import { cn } from "@/lib/utils";
import { Loader2, X } from "lucide-react";

// ─── Spinner ──────────────────────────────────────────────────────────────
export function Spinner({ className, size = 16 }: { className?: string; size?: number }) {
  return <Loader2 className={cn("animate-spin text-[#0070E0]", className)} style={{ width: size, height: size }} />;
}

export function LoadingOverlay({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-3">
      <Spinner size={28} />
      <p className="text-sm">{label}</p>
    </div>
  );
}

// ─── Badge ────────────────────────────────────────────────────────────────
type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info" | "purple";

const TONES: Record<BadgeTone, string> = {
  neutral: "bg-slate-100 text-slate-600",
  success: "bg-emerald-50 text-emerald-700",
  warning: "bg-amber-50 text-amber-700",
  danger: "bg-red-50 text-red-700",
  info: "bg-blue-50 text-blue-700",
  purple: "bg-purple-50 text-purple-700",
};

export function Badge({ tone = "neutral", children, className }: { tone?: BadgeTone; children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium", TONES[tone], className)}>
      {children}
    </span>
  );
}

export function statusTone(status: string): BadgeTone {
  const s = status.toUpperCase();
  if (["COMPLETED", "RECEIVED", "ACTIVE", "PAID", "OK"].includes(s)) return "success";
  if (["PARTIAL", "PARTIALLY_REFUNDED", "LOW", "ORDERED", "PENDING"].includes(s)) return "warning";
  if (["REFUNDED", "CANCELLED", "OVERDUE", "OUT OF STOCK", "INACTIVE"].includes(s)) return "danger";
  if (["OPEN", "DRAFT"].includes(s)) return "info";
  return "neutral";
}

// ─── Empty State ────────────────────────────────────────────────────────────
export function EmptyState({ icon: Icon, title, description }: { icon?: React.ComponentType<{ className?: string }>; title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-slate-400">
      {Icon && <Icon className="h-10 w-10 mb-3 opacity-30" />}
      <p className="text-sm font-medium text-slate-500">{title}</p>
      {description && <p className="text-xs mt-1">{description}</p>}
    </div>
  );
}

// ─── Modal ──────────────────────────────────────────────────────────────────
export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  footer?: React.ReactNode;
}

const SIZES = { sm: "max-w-sm", md: "max-w-md", lg: "max-w-lg", xl: "max-w-2xl" };

export function Modal({ open, onClose, title, children, size = "md", footer }: ModalProps) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4 overflow-y-auto">
      <div className={cn("w-full bg-white rounded-2xl shadow-xl border border-slate-100 my-8 relative", SIZES[size])}>
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5 max-h-[70vh] overflow-y-auto">{children}</div>
        {footer && <div className="p-5 border-t border-slate-100 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

// ─── Page Header ─────────────────────────────────────────────────────────────
export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-3">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}

// ─── Stat Card ───────────────────────────────────────────────────────────────
export function StatCard({ label, value, icon: Icon, tone = "info", hint }: {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
  tone?: BadgeTone;
  hint?: string;
}) {
  const iconColor: Record<BadgeTone, string> = {
    neutral: "text-slate-400", success: "text-emerald-500", warning: "text-amber-500",
    danger: "text-red-500", info: "text-[#0070E0]", purple: "text-purple-500",
  };
  return (
    <div className="rounded-[20px] bg-white border border-slate-100 shadow-[0_2px_20px_rgba(0,48,135,0.06)] p-5">
      <div className="flex items-center gap-2 mb-1">
        {Icon && <Icon className={cn("h-4 w-4", iconColor[tone])} />}
        <p className="text-xs text-slate-400">{label}</p>
      </div>
      <p className="text-xl font-semibold text-slate-800">{value}</p>
      {hint && <p className="text-[11px] text-slate-400 mt-0.5">{hint}</p>}
    </div>
  );
}
