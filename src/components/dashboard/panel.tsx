"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

/** Shared titled panel container for dashboard widgets. */
export function Panel({
  title, subtitle, actions, children, className, bodyClassName,
}: {
  title?: React.ReactNode;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <div className={cn("rounded-[20px] bg-white border border-slate-100 shadow-[0_2px_20px_rgba(0,48,135,0.06)] p-5", className)}>
      {(title || actions) && (
        <div className="flex items-center justify-between gap-2 mb-3">
          <div>
            {title && <h3 className="text-sm font-semibold text-slate-700">{title}</h3>}
            {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
          {actions}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </div>
  );
}
