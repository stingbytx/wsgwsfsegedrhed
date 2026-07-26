"use client";
import { useLiveQuery } from "dexie-react-hooks";
import { useDb } from "./use-db";
import { computeDashboardAnalytics, computeSalesSeries, type TrendGranularity } from "@/services/dashboard-analytics";

/**
 * Auto-refreshing analytics for the Executive BI Dashboard.
 * dexie-react-hooks re-runs whenever any read table changes, so every
 * widget refreshes after a sale/purchase/return/adjustment/expense — no
 * page reload required.
 */
export function useDashboardAnalytics() {
  const db = useDb();
  return useLiveQuery(() => (db ? computeDashboardAnalytics(db) : Promise.resolve(null)), [db], null);
}

export function useSalesSeries(granularity: TrendGranularity) {
  const db = useDb();
  return useLiveQuery(() => (db ? computeSalesSeries(db, granularity) : Promise.resolve([])), [db, granularity], []);
}
