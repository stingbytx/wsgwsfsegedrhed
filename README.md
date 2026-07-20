# Universal POS

A production-ready, browser-based Point of Sale system. Business data (products,
orders, customers, inventory, etc.) is stored **entirely in the browser via
IndexedDB (Dexie.js)** — never on a server. Supabase is used **only for
authentication** (email/password, email verification, password reset, Google
sign-in). Subscription billing is handled through PayPal, with a small
serverless webhook that flips the user's plan flag.

## Tech Stack

- Next.js 15/16 (App Router) + React 19 + TypeScript
- Tailwind CSS, Framer Motion-ready UI primitives
- Zustand (app state), React Hook Form + Zod (forms/validation), TanStack Query
- Dexie.js (IndexedDB) for all business data
- Supabase Auth (email, Google OAuth, email verification, password reset)
- PayPal Subscriptions API + webhook (Next.js Route Handler)

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
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Project Settings → API (keep secret, server-only) |
| `NEXT_PUBLIC_APP_URL` | Your deployed URL, e.g. `https://your-app.vercel.app` |
| `PAYPAL_ENV` | `sandbox` while testing, `live` for production |
| `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` | PayPal Developer Dashboard → Apps & Credentials |
| `PAYPAL_WEBHOOK_ID` | Created in step 4 below |
| `PAYPAL_PLAN_ID` | Created in step 4 below (a Billing Plan for your subscription) |

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

**No Supabase database tables are created or needed.** Subscription plan is
stored in the user's `user_metadata` (`plan` field), updated server-side by
the PayPal webhook using the service role key.

## 4. PayPal setup (sandbox first)

1. Go to https://developer.paypal.com → Apps & Credentials → create a
   **Sandbox** app. Copy Client ID/Secret into `.env.local`.
2. Create a Product + Billing Plan (via PayPal API or dashboard) for your
   recurring Premium subscription. Copy the Plan ID into `PAYPAL_PLAN_ID`.
3. Go to your app → Webhooks → Add Webhook:
   - URL: `https://your-app.vercel.app/api/paypal/webhook`
   - Subscribe to events: `BILLING.SUBSCRIPTION.ACTIVATED`,
     `BILLING.SUBSCRIPTION.RE-ACTIVATED`, `BILLING.SUBSCRIPTION.CANCELLED`,
     `BILLING.SUBSCRIPTION.EXPIRED`, `BILLING.SUBSCRIPTION.SUSPENDED`,
     `BILLING.SUBSCRIPTION.PAYMENT.FAILED`, `PAYMENT.SALE.COMPLETED`
   - Copy the generated Webhook ID into `PAYPAL_WEBHOOK_ID`.
4. In sandbox, you can test the full flow: Upgrade button → PayPal Checkout
   (use a sandbox buyer account) → webhook fires → your plan flips to `ACTIVE`.

## 5. Run locally

```bash
npm run dev
```

Visit http://localhost:3000 — sign up, verify your email, log in, and you're
in the POS dashboard. All business data you create lives only in this
browser's IndexedDB.

## 6. Deploy to Vercel

1. Push this repo to GitHub.
2. Import it in Vercel.
3. Add all the environment variables from `.env.example` in
   Project Settings → Environment Variables (Production + Preview).
4. Redeploy after adding/changing env vars.
5. Update the Supabase Redirect URLs and PayPal webhook URL to your final
   Vercel domain.

## Subscription states

`FREE` → `TRIAL` → `ACTIVE` → `PAST_DUE` → `CANCELLED` → `EXPIRED`

Free plan limits (enforced client-side against IndexedDB counts):
100 products, 500 orders, 200 customers, 1 business profile.

Premium unlocks: unlimited products/orders/customers/categories, advanced
reports & profit analytics, barcode generation/printing, receipt/report
printing, JSON backup & restore, priority support. Locked features show a
🔒 icon and open an upgrade dialog linking to PayPal Checkout.

## Data & Backup

- All business data: IndexedDB (via Dexie), scoped per logged-in user id.
- Preferences only (theme, language, sidebar, currency, printer, last payment
  method): `localStorage`.
- Settings → Backup & Restore lets Premium users export/import the entire
  business as a single JSON file to move to another browser/device.

## Folder structure

```
src/
  app/            Next.js routes (auth pages, (app) authenticated group, API routes)
  components/     Reusable UI (ui/, layout/, billing/, ...)
  hooks/          useDb, useDashboardStats, ...
  lib/            supabase clients, dexie db, paypal helper, plan limits, utils
  services/       orders.ts (sale/hold/refund logic), backup.ts
  stores/         zustand stores: auth, cart, ui
  types/          shared TypeScript types
```
