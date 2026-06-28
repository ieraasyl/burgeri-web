# Burgeri write-off control

Web app for reviewing product write-off requests from Burgeri restaurants. Staff submit evidence via `burgeri-mobile`; reviewers approve or reject requests and sync approved acts to **iiko**. This repo also hosts the shared Better Auth, D1, and `/api/mobile/*` backend.

## Features

- **Write-off queue** — search, filters, approve/reject, per-restaurant check-in
- **Request detail** — evidence photo, audit trail, iiko act preview and sync
- **Analytics** — totals and 14-day trends by restaurant, product, and deduction type
- **History** — filterable log with CSV export
- **Admin** — staff and role management

## Roles

| Role | Access |
| --- | --- |
| `employee` | Mobile app only (submit write-offs) |
| `reviewer` | Reviewer workspace |
| `admin` | Reviewer workspace + `/admin` |

New sign-ins default to `employee`; admins promote reviewers from `/admin`.

## Stack

React 19, TypeScript, TanStack Start + Router, Tailwind CSS v4, Better Auth, Drizzle ORM, Cloudflare Workers + D1. iiko integration is a mock adapter in `src/lib/iiko.server.ts`.

## Local setup

Requires Node.js 22.13+ and `pnpm`.

```bash
pnpm install
cp .dev.vars.example .dev.vars   # set BETTER_AUTH_SECRET and BETTER_AUTH_URL
pnpm wrangler d1 create bahandi-db   # put the id in wrangler.jsonc
pnpm db:migrate:local
pnpm db:seed:local
pnpm dev
```

Open http://localhost:3000.

### Seeded accounts

| Email | Role | Password |
| --- | --- | --- |
| `admin@burgeri.kz` | admin | `Burgeri123!` |
| `reviewer@burgeri.kz` | reviewer | `Burgeri123!` |
| `manager@burgeri.kz` | reviewer | `Burgeri123!` |

Mobile employees use their id as username (e.g. `EMP-1001`). Override the seed password with `SEED_STAFF_PASSWORD`.

## Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Local dev server |
| `pnpm build` / `pnpm deploy` | Build and deploy to Cloudflare |
| `pnpm db:generate` | Generate migrations after schema changes |
| `pnpm db:migrate:local` / `:remote` | Apply D1 migrations |
| `pnpm db:seed:local` / `:remote` | Seed demo data |
| `pnpm typecheck` / `pnpm lint` | Type check and lint |

## Production

Set `BETTER_AUTH_URL` to your domain and store `BETTER_AUTH_SECRET` via `pnpm wrangler secret put BETTER_AUTH_SECRET`. Do not commit secrets.
