# Amanillon

Amanillon is a private trading-journal web app. Slice 1 covers email auth, trading accounts, the four-step playbook builder, a New Trade form that snapshots a Live playbook, and the 18-column journal.

The app name comes from a single constant in `lib/config.ts`.

## Stack

- Next.js App Router and TypeScript
- Tailwind CSS v4, Inter and Geist, Lucide icons
- Supabase Auth, Postgres and Storage
- Zod validation and Vitest for the formula module

## Local setup

1. Copy `.env.example` to `.env.local`.
2. Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Keep `SUPABASE_SERVICE_ROLE_KEY` server-only. The Slice 1 app path uses the anon key plus RLS and does not need the service role at runtime.
4. Apply the SQL in `supabase/migrations/` to your Supabase project (or `supabase start` and `supabase db reset` for a local stack). **This repository does not apply migrations to the hosted database.**
5. In the Supabase dashboard, set the Auth redirect URLs to include `http://localhost:3000/auth/callback`.
6. Install and run:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Demo mode

If you cannot run Supabase locally, set `NEXT_PUBLIC_DEMO_MODE=true` in `.env.local`. The login page then offers **Open demo journal**, which seeds a local store in `.demo-data/` so you can walk through playbooks, New Trade and the journal.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Next.js dev server |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest (formulas F1–F9, playbook status, RLS SQL) |
| `npm run build` | Production build |

## Slice 1 routes

- `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/auth/callback`
- `/app` dashboard
- `/app/playbooks` and the 4-step builder
- `/app/journal` with Open / Closed / Missed / Cancelled tabs
- `/app/journal/new` Live-playbook trade entry and position-size helper
- `/app/profile` trading-account CRUD

Playbook status is Draft → Active → Live. Only an Active playbook can go Live, and only Live playbooks can be picked for a new trade. Each trade stores a playbook snapshot.

## Formulas

`lib/calc.ts` is a pure module. Tests reproduce the documented examples: GBPAUD planned RR **2.59**, Silver actual **0.71R**, and the WTI contract-size P&L scale from 1,164 to 11,640. Suggested lot size rounds **down** to the lot step.

## Security

- Every user-owned table has RLS (`own_select` / `own_insert` / `own_update` / `own_delete`).
- The `playbook-evidence` bucket is private. Object paths are `{user_id}/{playbook_id}/{uuid}.ext`.
- No secrets are committed. `.env*` is gitignored except `.env.example`.

## CI

GitHub Actions runs lint, typecheck, test, build, and `npm audit --audit-level=high`.
