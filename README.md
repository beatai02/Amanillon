# Amanillon

Amanillon is a private trading-journal web app. The name comes from a single constant in `lib/config.ts`.

Scope is Playbooks, Journaling, Trade Review and Insights. There is no community, mentor picks or radars, and the UI does not use Excellion or TTC branding.

## Stack

- Next.js App Router and TypeScript
- Tailwind CSS v4, Inter and Geist, Lucide icons
- Supabase Auth, Postgres and Storage
- Zod validation, Vitest, Recharts

## Local setup

1. Copy `.env.example` to `.env.local`.
2. Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Keep `SUPABASE_SERVICE_ROLE_KEY` server-only. The app path uses the anon key plus RLS and does not need the service role at runtime.
4. Apply the SQL in `supabase/migrations/` to your Supabase project (or `supabase start` and `supabase db reset` for a local stack). **This repository does not apply migrations to the hosted database.**
5. In the Supabase dashboard, enable email confirmations and set Auth redirect URLs to include `http://localhost:3000/auth/callback` (and your Vercel URL `/auth/callback` in production).
6. Install and run:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Demo mode

Demo mode is **off** unless `NEXT_PUBLIC_DEMO_MODE=true`. A leftover demo cookie does nothing when the flag is off. When the flag is on, the login page offers **Open demo journal**, which seeds `.demo-data/` so you can walk through playbooks, close/edit, reviews and insights without a live database.

## Vercel

The production build only needs these public env vars:

| Variable | Required | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Publishable / anon key |
| `NEXT_PUBLIC_DEMO_MODE` | No | Leave unset or `false` in production |
| `SUPABASE_SERVICE_ROLE_KEY` | No | Not used by the app runtime |

Do not put secrets in the client bundle. Apply both migration files in the Supabase SQL editor before using a live project.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Next.js dev server |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest (F1–F9, Insights formulas, playbook status, RLS SQL) |
| `npm run build` | Production build |

## Routes

- `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/auth/callback`
- `/app` dashboard home
- `/app/playbooks` and the 4-step builder
- `/app/journal` with Open / Closed / Missed / Cancelled tabs
- `/app/journal/new` and `/app/journal/[id]/edit` close/edit, notes, evidence
- `/app/journal/[id]` trade detail
- `/app/journal/[id]/review` playbook-adherence review
- `/app/reviews` unreviewed closed-trade queue
- `/app/insights` KPIs, equity curve, groupings and behaviour flags
- `/app/profile` trading-account CRUD

Playbook status is Draft → Active → Live. Only an Active playbook can go Live, and only Live playbooks can be picked for a new trade. Each trade stores a playbook snapshot that is not overwritten on edit.

## Defaults

These live in `lib/config.ts`:

- Win = actual R > `0` after the breakeven band
- Breakeven = `|actual R| < 0.1`
- Revenge = a trade opened within 15 minutes of a losing close
- Overtrading = more than 5 trades on one UTC day
- Drawdown is peak-to-trough on closed-trade equity in the account currency
- Drawdown warning line = `-2000` in account currency
- No FX conversion (`APPLY_FX_CONVERSION=false`, rate stored as `1`)
- Lot-size suggestion recalculates when entry or stop changes
- Sign-up is open email sign-up with email confirmation

## Formulas

`lib/calc.ts` is a pure module. Tests reproduce the documented examples: GBPAUD planned RR **2.59**, Silver actual **0.71R**, and the WTI contract-size P&L scale from 1,164 to 11,640. Suggested lot size rounds **down** to the lot step.

`lib/insights.ts` is the Insights formula module. Every KPI, grouping, drawdown and behaviour flag has a unit test.

## Security

- Every user-owned table has RLS (`own_select` / `own_insert` / `own_update` / `own_delete`).
- Storage buckets `playbook-evidence`, `trade-images` and `closing-evidence` are private. Object paths are `{user_id}/...`.
- No secrets are committed. `.env*` is gitignored except `.env.example`.

## CI

GitHub Actions runs lint, typecheck, test, build, and `npm audit --audit-level=high`.
