# Universal POS

A production-ready, browser-based Point of Sale system. Business data (products,
orders, customers, inventory, etc.) is stored **entirely in the browser via
IndexedDB (Dexie.js)** — never on a server. Supabase is used **only for
authentication** (email/password, email verification, password reset, Google
sign-in). Any authenticated user has full, unlimited access to every feature
— there is no subscription, billing, or feature gating.

## Tech Stack

- Next.js 15/16 (App Router) + React 19 + TypeScript
- Tailwind CSS
- Zustand (app state), React Hook Form + Zod (forms/validation), TanStack Query
- Dexie.js (IndexedDB) for all business data
- Supabase Auth (email, Google OAuth, email verification, password reset)

## 1. Install dependencies

```bash
npm install
```

## 2. Configure environment variables

Copy `.env.example` to `.env.local` and fill in:

```bash
cp .env.example .env.local
```

| Variable | Where to get it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard → Project Settings → API |
| `NEXT_PUBLIC_APP_URL` | Your deployed URL, e.g. `https://your-app.vercel.app` |

## 3. Supabase Auth setup

1. Create a project at supabase.com.
2. Authentication → Providers → enable **Email** and **Google** (add your
   Google OAuth client ID/secret from Google Cloud Console).
3. Authentication → URL Configuration → set:
   - Site URL: `https://your-app.vercel.app`
   - Redirect URLs: `https://your-app.vercel.app/auth/callback`
     (and `http://localhost:3000/auth/callback` for local dev)
4. Email templates already point verification/reset links at `/auth/callback`
   and `/reset-password` respectively — no DB tables are required.

**No Supabase database tables are created or needed.** Supabase is used purely
for identity — once a user is logged in, they get full access to the app.

## 4. Run locally

```bash
npm run dev
```

Visit http://localhost:3000 — sign up, verify your email, log in, and you're
in the POS dashboard with full access to every feature. All business data you
create lives only in this browser's IndexedDB.

## 5. Deploy to Vercel

1. Push this repo to GitHub.
2. Import it in Vercel.
3. Add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and
   `NEXT_PUBLIC_APP_URL` in Project Settings → Environment Variables
   (Production + Preview).
4. Redeploy after adding/changing env vars.
5. Update the Supabase Redirect URLs to your final Vercel domain.

## Access model

Every signed-up, authenticated user has unlimited access: unlimited products,
orders, customers, categories, advanced reports, profit analytics, barcode
generation/printing, receipt/report printing, and JSON backup & restore.
There is no free/premium split and no payment integration.

## Data & Backup

- All business data: IndexedDB (via Dexie), scoped per logged-in user id.
- Preferences only (theme, language, sidebar, currency, printer, last payment
  method): `localStorage`.
- Settings → Backup & Restore lets any user export/import the entire business
  as a single JSON file to move to another browser/device.

## Folder structure

```
src/
  app/            Next.js routes (auth pages, (app) authenticated group)
  components/     Reusable UI (ui/, layout/, inventory/, pos/, marketing/)
  hooks/          useDb, useDashboardStats, useAppBoot
  lib/            supabase clients, dexie db, utils, repository, format
  services/       centralized engines (see Enterprise Architecture below)
  stores/         zustand stores: auth, cart, ui
  types/          core types (index.ts) + enterprise types (enterprise.ts)
```

---

## Enterprise Architecture (v2 upgrade)

The v2 upgrade transforms UniPOS into an enterprise-grade retail platform
**without touching any existing functionality**. All legacy pages, routes,
APIs, stores, and the Dexie v1 schema are preserved. New capability is
purely additive and organized into a clean layered architecture.

### Layered design — ready for SQL/Supabase migration

```
UI Layer       → app/(app)/* pages + components/*
Business Logic → services/* (engines)
Data Access    → lib/repository.ts (Repository interface + DexieRepository)
Storage        → lib/db.ts (Dexie/IndexedDB, offline)
```

Every service engine talks to a `Repository`, never to Dexie directly.
Today the implementation is `DexieRepository` (fully offline). To migrate to
MySQL/PostgreSQL/Supabase later, implement the same `Repository` interface
against a remote client and swap the factory in `getRepository()` — **no
business logic changes**.

### Centralized service engines (single source of truth — no duplicated logic)

| Engine | File | Responsibility |
|---|---|---|
| **Inventory** | `services/inventory.ts` | The ONLY path stock moves through. Sale, purchase/GRN, return, damage, transfer, adjustment all call `recordMovement()`. Guarantees stock consistency + full movement history. |
| **Finance** | `services/finance.ts` | The ONLY path income/expense flow through. Derives revenue, COGS, gross/net profit, cash flow, margins. |
| **Dashboard** | `services/dashboard.ts` | One analytics engine every dashboard widget queries (cached). |
| **Reporting** | `services/reporting.ts` | One report builder for all 9 report kinds (sales, P&L, expenses, inventory valuation, tax, credit, refunds, stock movements, employee performance). |
| **Print** | `services/print.ts` | One print service for receipts, invoices, POs, GRNs, barcode/QR labels (thermal + A4). |
| **Barcode** | `services/barcode.ts` | Centralized barcode generation + validation for Code 39/128, EAN-13/8, UPC, QR. Duplicate detection against products. |
| **Audit** | `services/audit.ts` | Global audit log. Every create/edit/delete/sale/refund/return/adjustment/purchase/GRN/expense/settings change is recorded with user, role, browser, timestamp, old/new value. |
| **Search** | `services/search.ts` | Instant global search across products, invoices, customers, suppliers, employees, POs, GRNs, expenses, categories, credit sales, returns. |
| **Settings** | `services/settings.ts` | Merges legacy + enterprise settings into one object; configures the global formatter. |
| **Permissions** | `services/permissions.ts` | Role-based access (Owner, Administrator, Manager, Cashier, Inventory Officer, Accountant, Sales Rep, Guest) with seeded system roles + `can()` guards. |
| **Export** | `services/export.ts` | One service for CSV, Excel (SpreadsheetML), PDF/print for every table/report/list. |
| **Sequence** | `services/sequence.ts` | Prefix-based document numbering (INV/PO/GRN/RET/TRF) from configurable settings. |
| **Purchases** | `services/purchases.ts` | Purchase orders + GRNs (wires receipts through the Inventory Engine). |
| **Returns** | `services/returns.ts` | Sales returns with optional restock via the Inventory Engine. |
| **Format** | `lib/format.ts` | Global currency/date/time/number formatting (configurable from Settings). |

### New modules (all offline, all reuse the engines above)

- **Suppliers** — full CRUD, searchable/filterable/sortable/paginated table, CSV/Excel/PDF/print.
- **Employees** — CRUD with role assignment, auto-generated codes, status.
- **Warehouses** — CRUD, single-default enforcement.
- **Purchase Orders** — create POs from products/suppliers, line items, print PO, cancel, view detail.
- **GRNs** — receive goods against a PO; automatically increments stock via the Inventory Engine and updates PO received quantities/status; print GRN.
- **Sales Returns** — process returns against any order with per-line reasons; optional restock.
- **Expenses** — entry + category manager; finance-engine-backed.
- **Audit Log** — searchable/filterable/exportable history of every action.
- **Report Builder** (in Reports) — generate any of 9 report types with CSV/Excel/PDF export.

### Global features added

- **Global search bar** in the app header (`/` keyboard shortcut) — instant,
  grouped, keyboard-navigable results across every entity with deep links.
- **Reusable DataTable** (`components/ui/data-table.tsx`) — every table now has
  search, column filters, sortable columns, pagination, rows-per-page, date
  range, status quick-filter, and CSV/Excel/PDF/print export built in.
- **Global date/time/currency formatting** driven from Settings.
- **Expanded Settings** — company info (address, email, website, TIN, VAT),
  receipt header, default tax %, document prefixes, date/time format, receipt
  width, thermal printer size, theme, currency, auto-backup.
- **Role-based permissions** scaffold with 8 seeded system roles.
- **Audit logging** wired into every create/edit/delete and stock movement.

### Database migration (v1 → v2)

`lib/db.ts` declares Dexie **version 2**. The v1 stores are re-declared with
identical indexes (preserving existing data) and new enterprise stores are
added: `employees`, `warehouses`, `purchaseOrders`, `grns`, `salesReturns`,
`stockTransfers`, `expenseCategories`, `auditLogs`, `roles`,
`enterpriseSettings`. Existing user data is never touched.

### What was NOT changed

- All existing pages (dashboard, POS, inventory, customers, reports, settings)
  keep working — they were extended, not rewritten.
- The legacy `services/orders.ts` (completeSale/holdOrder/refundOrder) and
  `services/backup.ts` are untouched.
- The v1 Dexie schema and all v1 data are preserved.
- Routing, middleware, Supabase auth, the color palette, and the component
  theme are all unchanged.

### Build verification

```bash
npm install && npm run build   # → compiles cleanly, all 39 routes
```

### CRM — Customer Relationship Management (`/crm` + `/crm/[id]`)

An enterprise CRM delivered as **new routes** so the existing `/customers`
page is 100% preserved (a cross-link "Open CRM" was added to it). New types
in `src/types/crm.ts`; Dexie extended with CRM stores (`communicationLogs`,
`customerDocuments`, `customerGroups`, `creditPayments`, `loyaltyLedger`) and
extra indexes on the `customers` store (`code, city, companyName, loyaltyTier,
creditStatus, isVip, birthday, type, createdAt`) for high-performance search
/filter at scale (50k+ customers). Extended CRM fields live on the existing
`customers` record via a `CustomerCrmExtension` cast — no core type change.

- **CRM grid** (`/crm`) — instant multi-field search (name, phone, email,
  address, code, loyalty card #, tax ID, city, company, tags); filters
  (credit status, VIP, tag, city, type, loyalty tier, birthday month, has
  outstanding, blacklisted, new this month, top customers); sort
  (name/created/total purchases/outstanding/loyalty points/last visit/
  birthday, asc+desc); columns (code, name+VIP, phone, city, tier, points,
  credit status+alert, outstanding, total purchases, last visit); bulk tag;
  CSV/Excel export; extended add/edit form (basic, VIP & loyalty, credit
  account). Click a row → profile.
- **Customer profile** (`/crm/[id]`) — tabbed: Overview, Credit (limit /
  outstanding / available / alerts at 80%/100%/over/blacklisted + payment
  history + record-payment), Loyalty (tier benefits, points, redeem, ledger),
  Purchase History (linked invoices + print receipt), Communication Log
  (call/email/WhatsApp/meeting/note + follow-up dates), Document Vault
  (quotations/invoices/contracts/ID proofs with file upload), Analytics
  (RFM score + segment, CLV, return rate, favorite category/products, total
  purchases/visits/avg order).
- **Engines** — `services/crm.ts` (search/filter/sort, RFM + CLV, groups &
  dynamic segments, tags, communication + document CRUD, validation incl.
  duplicate code/phone), `services/loyalty.ts` (points earn/redeem, 5 tiers
  Bronze→Diamond with auto-upgrade thresholds, tier benefits + POS discount
  %, birthday-month discount, auditable ledger), `services/credit.ts`
  (credit-status checks, limit alerts, payment recording, auto outstanding-
  balance update).

All new modules are offline (IndexedDB via Dexie, additive), reuse the
existing UI primitives + engines + DataTable, route through the same auth
middleware, and the existing `/customers`, POS, and orders logic are untouched.

### PIM — Product Information Management (`/products` + `/products/[id]`)

An enterprise-grade Product module delivered as **new routes** so the existing
`/inventory` page is 100% preserved. New types in `src/types/pim.ts` and new
Dexie v3 stores: `brands`, `units`, `variants`, `batches`, `productSuppliers`,
`warehouseStock`, `productImages`, `priceLevels`, `promotions`,
`relatedProducts`, `productHistory`, `shifts`, `cashDrawer`. The legacy
`products` table is reused (existing inventory/POS/orders keep working).

- **Products grid** (`/products`) — image, name, SKU, barcode, category, brand,
  supplier, selling/cost price, profit margin, stock, expiry status, status,
  created date. Quick filters: category, brand, low/out of stock, expiring,
  expired, active/inactive, taxable, has image. Sort by name/price/cost/margin/
  stock/category/created/updated. Bulk actions: activate, deactivate, archive,
  delete, update category (with confirmation). Barcode-label print dialog,
  favorites, duplicate, archive. CSV/Excel export. Bulk CSV import with
  per-row validation + preview + template download.
- **Product profile** (`/products/[id]`) — tabbed: Overview (basic info +
  stock-movement summary + valuation), Pricing (cost/selling/wholesale/dealer/
  special/discount + auto profit margin), Images (multi-upload gallery with
  auto-resize + main-image), Variants (per-axis barcode/SKU/price/stock),
  Batches (FIFO), Suppliers (preferred + last price + delivery + MOQ),
  Warehouses (stock/reserved/reorder/max), Price Levels (retail/wholesale/
  dealer/VIP/employee/special), Related Products (cross-sell), History
  (full timeline).
- **Brands** (`/brands`) — logo, name, description, status.
- **Units & Conversions** (`/units`) — preset units + custom + base/factor
  conversion (e.g. 1 Box = 24 Pieces).
- **Promotions** (`/promotions`) — Percent, Fixed, Buy X Get Y, Bundle, Happy
  Hour, Weekend, Festival, Loyalty with date windows.
- **Engine** — `services/pim.ts` is the single PIM engine: CRUD, validation
  (duplicate SKU/barcode, negative price/stock, empty name), pricing + margin,
  stock valuation, reorder recommendations, expiry tracking (30/15/7/1/expired),
  variant/batch (FIFO)/brand/unit/supplier/warehouse/price-level/related-product
  management, product history/timeline, bulk actions, favorites.

### POS Engine & Operations (additive — existing `/pos` untouched)

- **POS engine** (`services/pos-engine.ts`) — promotion application, price-level
  resolution by customer type, tax inclusive/exclusive breakdown, cart totals
  with item/order/promotion discounts, split bill (evenly / by items),
  multi-payment + change calculation, sale validation, sequential invoice
  numbering (`INV-YYYYMMDD-NNNNNN`).
- **Shifts & Cash Drawer** (`/shifts`) — start/close shift, opening/closing
  cash, expected vs counted difference, cash in/out, live drawer balance,
  per-shift activity log, shift history report.
- **Bill History** (`/invoices`) — searchable/sortable/filterable invoice list
  with view, print receipt, print invoice actions.
- **Barcode label printing** (`services/barcode-print.ts`) — 1/10/20/50/100/
  custom quantities, A4 / 58mm / 80mm paper, with price + SKU toggles.
- **Keyboard shortcuts hook** (`hooks/use-keyboard-shortcuts.ts`) — reusable,
  with the F1–F8 + ESC + Ctrl+S/P POS shortcut map ready to wire into the POS.
- **Bulk import** (`services/bulk-import.ts`) — CSV parse, per-row validation
  against existing SKUs/barcodes/categories/brands, preview, commit.

All new modules are offline (IndexedDB via Dexie v3, additive), reuse the
existing UI primitives + DataTable + engines, and route through the same
auth middleware. The existing `/inventory`, `/pos`, `services/orders.ts`,
and all v1/v2 data are untouched.

### Executive BI Dashboard (`/executive-dashboard`)

A modern executive business-intelligence dashboard delivered as a **new route**
so the original `/dashboard` is 100% preserved. A CTA on the original
dashboard links to it, and it has its own sidebar entry ("Exec BI Dashboard").

- **Auto-refresh** — every widget is backed by `useLiveQuery`, which re-runs
  on any IndexedDB change. The dashboard refreshes after every sale,
  purchase, return, stock adjustment, and expense with **no page reload**.
- **One analytics engine** — `services/dashboard-analytics.ts` is the single
  canonical computation (cached, TTL 15s) behind every KPI, chart, table, and
  panel — no widget computes separately.
- **12 KPI cards** — Today's Sales, Week Sales, Monthly Revenue, Today's
  Profit (+ margin), Today's Expenses (+ breakdown), Pending Credit, Low
  Stock, Out of Stock, Expiring Soon, Today's Purchases, Today's Customers,
  Cash in Hand. Each card: icon, value, % delta vs prior period, mini
  sparkline, color tone, last-updated timestamp, click-through.
- **Charts** — Sales Analytics (line/bar/area + hourly/daily/weekly/monthly/
  yearly toggles + revenue/profit/invoices metrics), Profit Trend (revenue /
  expenses / profit / net profit), Category Sales pie, Payment Methods pie,
  Best Selling Brands bar.
- **24-hour Sales Heatmap** (last 30 days, darker = busier).
- **Calendar widget** — month grid with per-day intensity; click a day for
  sales / purchases / expenses / profit / events.
- **Business Insights panel** — rule-based summaries generated from local
  data (no AI service), e.g. "Sales increased 18% vs yesterday".
- **Top 10 Products / Customers / Suppliers** with click-through.
- **Recent Sales / Purchases / Expenses / Stock Movements** tables.
- **Low Stock & Expiry alert panels** (red ≤7d, orange 8–15d, yellow 16–30d).
- **Cash Flow, Employee Performance, Warehouse Summary, Inventory Value,
  Expense Breakdown** panels.
- **Notifications, Backup Status, System Status** (storage used, counts,
  local DB health).
- **Export** the dashboard snapshot to PDF / Excel / CSV / Print.
- **Responsive** — 4 KPI cards/row (desktop) → 2 (tablet) → 1 (mobile);
  charts stack vertically on small screens.
- **Performance** — engine caching + capped/paginated lists keep it smooth;
  for 100k+ products / 500k+ invoices the heavy aggregation moves to indexed
  DB queries via the Repository seam (engine shape unchanged).
- **Header** — "Welcome back, {user}", company logo, live ticking clock,
  current date, warehouse, online/offline + business-status indicator, and
  quick-action buttons (New Sale, New Purchase, Stock In/Out, New Customer /
  Supplier, Expense, Reports, Backup, Restore, Settings).
