"use client";
import { useState } from "react";
import { Lock } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { UpgradeDialog } from "./upgrade-dialog";

/**
 * Wrap any premium feature entry point with this. Free users see a lock
 * badge and clicking opens the upgrade dialog instead of the feature.
 */
export function PremiumLock({
  children,
  label,
  className,
}: {
  children: React.ReactNode;
  label: string;
  className?: string;
}) {
  const isPremium = useAuthStore((s) => s.isPremium);
  const [open, setOpen] = useState(false);

  if (isPremium) return <>{children}</>;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`flex items-center gap-1.5 opacity-70 hover:opacity-100 transition-opacity ${className ?? ""}`}
      >
        <Lock className="h-3.5 w-3.5 text-slate-400" />
        {children}
      </button>
      <UpgradeDialog open={open} onClose={() => setOpen(false)} featureLabel={label} />
    </>
  );
}
