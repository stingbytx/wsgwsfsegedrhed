import type { PosDatabase } from "@/lib/db";

/** Exports the entire local business database to a single JSON object. */
export async function exportBackup(db: PosDatabase) {
  const [products, categories, suppliers, orders, inventoryMovements, customers, creditSales, expenses, heldOrders, receipts, activityLogs, settings] =
    await Promise.all([
      db.products.toArray(),
      db.categories.toArray(),
      db.suppliers.toArray(),
      db.orders.toArray(),
      db.inventoryMovements.toArray(),
      db.customers.toArray(),
      db.creditSales.toArray(),
      db.expenses.toArray(),
      db.heldOrders.toArray(),
      db.receipts.toArray(),
      db.activityLogs.toArray(),
      db.settings.toArray(),
    ]);

  return {
    exportedAt: new Date().toISOString(),
    version: 1,
    data: {
      products,
      categories,
      suppliers,
      orders,
      inventoryMovements,
      customers,
      creditSales,
      expenses,
      heldOrders,
      receipts,
      activityLogs,
      settings,
    },
  };
}

export function downloadBackup(backup: unknown) {
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `universal-pos-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Restores a JSON backup into IndexedDB, replacing existing records by id. */
export async function restoreBackup(db: PosDatabase, backup: { data: Record<string, unknown[]> }) {
  const tables = [
    "products",
    "categories",
    "suppliers",
    "orders",
    "inventoryMovements",
    "customers",
    "creditSales",
    "expenses",
    "heldOrders",
    "receipts",
    "activityLogs",
    "settings",
  ] as const;

  await db.transaction("rw", tables.map((t) => db[t]), async () => {
    for (const t of tables) {
      const rows = backup.data[t];
      if (Array.isArray(rows) && rows.length) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (db[t] as any).bulkPut(rows);
      }
    }
  });
}
