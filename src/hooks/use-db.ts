"use client";
import { useMemo } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { getDb } from "@/lib/db";

/** Returns the IndexedDB instance scoped to the current logged-in user. */
export function useDb() {
  const user = useAuthStore((s) => s.user);
  return useMemo(() => (user ? getDb(user.id) : null), [user]);
}
