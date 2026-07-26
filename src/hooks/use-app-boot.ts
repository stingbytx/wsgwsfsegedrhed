"use client";
import * as React from "react";
import { useDb } from "./use-db";
import { useAuthStore } from "@/stores/auth-store";
import { ensureRolesSeeded } from "@/services/permissions";
import { setAuditContext, detectBrowser } from "@/services/audit";
import { getMergedSettings } from "@/services/settings";

/**
 * App boot hook — runs once when the DB becomes available.
 * Seeds system roles, applies global formatting from settings, and
 * sets the ambient audit context (user + browser). Idempotent.
 */
export function useAppBoot() {
  const db = useDb();
  const user = useAuthStore((s) => s.user);
  const ranRef = React.useRef(false);

  React.useEffect(() => {
    if (!db || ranRef.current) return;
    ranRef.current = true;
    (async () => {
      try {
        await ensureRolesSeeded(db);
        await getMergedSettings(db); // applies formatter config
        setAuditContext({
          userId: user?.id ?? null,
          userEmail: user?.email ?? null,
          userRole: "OWNER",
          browser: detectBrowser(),
        });
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn("[boot] initialization error", e);
      }
    })();
  }, [db, user]);
}
