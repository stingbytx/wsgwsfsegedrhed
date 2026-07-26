// ============================================================================
// Audit Engine — single global audit log. Every meaningful action in the
// app is recorded through `logAudit()`. This replaces scattered ad-hoc
// activityLogs writes with one canonical entry point.
//
// Legacy `activityLogs` table is left untouched; the new `auditLogs` table
// holds the richer enterprise records (user, role, browser, old/new value).
// ============================================================================

import type { PosDatabase } from "@/lib/db";
import type { AuditAction, AuditEntry } from "@/types/enterprise";
import { generateId, nowIso } from "@/lib/utils";

export interface AuditContext {
  userId?: string | null;
  userEmail?: string | null;
  userRole?: string | null;
  ip?: string | null;
  browser?: string | null;
}

let _ctx: AuditContext = {};

/** Set the ambient audit context (user/role/browser) once per session. */
export function setAuditContext(ctx: AuditContext) {
  _ctx = { ..._ctx, ...ctx };
}

export function getAuditContext(): AuditContext {
  return _ctx;
}

/** Detect browser string once (client-only). */
export function detectBrowser(): string | null {
  if (typeof navigator === "undefined") return null;
  return navigator.userAgent || "unknown";
}

export interface LogAuditInput {
  action: AuditAction;
  entity: string;
  entityId?: string;
  oldValue?: unknown;
  newValue?: unknown;
  meta?: Record<string, unknown>;
  ctx?: AuditContext; // override ambient context
}

export async function logAudit(db: PosDatabase, input: LogAuditInput): Promise<void> {
  const ctx = { ..._ctx, ...input.ctx };
  const entry: AuditEntry = {
    id: generateId(),
    action: input.action,
    entity: input.entity,
    entityId: input.entityId,
    userId: ctx.userId ?? null,
    userEmail: ctx.userEmail ?? null,
    userRole: ctx.userRole ?? null,
    ip: ctx.ip ?? null,
    browser: ctx.browser ?? null,
    oldValue: input.oldValue,
    newValue: input.newValue,
    meta: input.meta,
    timestamp: nowIso(),
    createdAt: nowIso(),
  };
  try {
    await db.auditLogs.add(entry);
  } catch {
    // Audit must never break the calling operation.
    // eslint-disable-next-line no-console
    console.warn("[audit] failed to write entry", entry);
  }
}

/** Convenience: wrap an async operation and log before/after. */
export async function withAudit<T>(
  db: PosDatabase,
  input: LogAuditInput,
  fn: () => Promise<T>
): Promise<T> {
  const result = await fn();
  await logAudit(db, input);
  return result;
}

export async function listAudit(db: PosDatabase, limit = 200): Promise<AuditEntry[]> {
  const all = await db.auditLogs.toArray();
  return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);
}
