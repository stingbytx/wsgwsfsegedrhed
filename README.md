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
  components/     Reusable UI (ui/, layout/, ...)
  hooks/          useDb, useDashboardStats, ...
  lib/            supabase clients, dexie db, utils
  services/       orders.ts (sale/hold/refund logic), backup.ts
  stores/         zustand stores: auth, cart, ui
  types/          shared TypeScript types
```
