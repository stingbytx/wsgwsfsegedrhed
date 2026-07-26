// ============================================================================
// Permissions Engine — role-based access control.
//
// Defines system roles with sensible default permission sets and provides
// `can()` helpers used by UI guards and service pre-checks. Roles are also
// persisted in the `roles` table so admins can customize them later.
// ============================================================================

import type { PosDatabase } from "@/lib/db";
import type { Role, RoleName, Permission } from "@/types/enterprise";
import { generateId, nowIso } from "@/lib/utils";

const ALL: Permission[] = [
  "pos.use",
  "products.view", "products.create", "products.edit", "products.delete",
  "inventory.view", "inventory.adjust", "inventory.transfer",
  "customers.view", "customers.create", "customers.edit", "customers.delete",
  "suppliers.view", "suppliers.create", "suppliers.edit", "suppliers.delete",
  "employees.view", "employees.create", "employees.edit", "employees.delete",
  "purchases.view", "purchases.create", "purchases.edit", "purchases.delete",
  "grns.view", "grns.create", "grns.edit",
  "returns.view", "returns.create",
  "expenses.view", "expenses.create", "expenses.edit", "expenses.delete",
  "reports.view", "reports.export",
  "settings.view", "settings.edit",
  "audit.view",
  "backup.export", "backup.restore",
];

export const SYSTEM_ROLES: Omit<Role, "id" | "createdAt" | "updatedAt">[] = [
  {
    name: "OWNER", label: "Owner", description: "Full access to everything.", isSystem: true,
    permissions: [...ALL],
  },
  {
    name: "ADMINISTRATOR", label: "Administrator", description: "Full system administration.", isSystem: true,
    permissions: [...ALL],
  },
  {
    name: "MANAGER", label: "Manager", description: "Manage operations, staff, and reports.", isSystem: true,
    permissions: [
      "pos.use",
      "products.view", "products.create", "products.edit",
      "inventory.view", "inventory.adjust", "inventory.transfer",
      "customers.view", "customers.create", "customers.edit",
      "suppliers.view", "suppliers.create", "suppliers.edit",
      "employees.view", "employees.create", "employees.edit",
      "purchases.view", "purchases.create", "purchases.edit",
      "grns.view", "grns.create", "grns.edit",
      "returns.view", "returns.create",
      "expenses.view", "expenses.create", "expenses.edit",
      "reports.view", "reports.export",
      "settings.view",
      "audit.view",
    ],
  },
  {
    name: "CASHIER", label: "Cashier", description: "Process sales and manage held orders.", isSystem: true,
    permissions: ["pos.use", "products.view", "customers.view", "customers.create", "returns.view", "returns.create"],
  },
  {
    name: "INVENTORY_OFFICER", label: "Inventory Officer", description: "Manage products, stock, and GRNs.", isSystem: true,
    permissions: [
      "products.view", "products.create", "products.edit",
      "inventory.view", "inventory.adjust", "inventory.transfer",
      "suppliers.view",
      "purchases.view", "purchases.create", "purchases.edit",
      "grns.view", "grns.create", "grns.edit",
      "reports.view",
    ],
  },
  {
    name: "ACCOUNTANT", label: "Accountant", description: "Manage expenses and financial reports.", isSystem: true,
    permissions: [
      "expenses.view", "expenses.create", "expenses.edit", "expenses.delete",
      "reports.view", "reports.export",
      "customers.view",
      "audit.view",
    ],
  },
  {
    name: "SALES_REPRESENTATIVE", label: "Sales Representative", description: "Process sales and view products/customers.", isSystem: true,
    permissions: ["pos.use", "products.view", "customers.view", "customers.create"],
  },
  {
    name: "GUEST", label: "Guest", description: "Read-only dashboard access.", isSystem: true,
    permissions: ["reports.view"],
  },
];

/** Seed system roles into the DB if none exist yet. */
export async function ensureRolesSeeded(db: PosDatabase): Promise<void> {
  const count = await db.roles.count();
  if (count > 0) return;
  const now = nowIso();
  await db.roles.bulkAdd(
    SYSTEM_ROLES.map((r) => ({ ...r, id: generateId(), createdAt: now, updatedAt: now }))
  );
}

export async function getRoleByName(db: PosDatabase, name: RoleName): Promise<Role | undefined> {
  const roles = await db.roles.toArray();
  return roles.find((r) => r.name === name);
}

export async function listRoles(db: PosDatabase): Promise<Role[]> {
  return db.roles.toArray();
}

/** Permission check helper (client-side guard). */
export function hasPermission(role: Role | undefined | null, perm: Permission): boolean {
  if (!role) return false;
  return role.permissions.includes(perm);
}

/** Map a RoleName to its permission list without a DB round-trip. */
export function permissionsForRole(name: RoleName): Permission[] {
  return SYSTEM_ROLES.find((r) => r.name === name)?.permissions ?? [];
}
