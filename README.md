# Burgeri write-off automation

Mobile-first web application for creating, reviewing, and tracking product
write-off requests at restaurant locations, based on
[`Кейс Mentoria Hackathon.md`](./Кейс%20Mentoria%20Hackathon.md).

## Imported foundation

This repository uses the reusable application foundation from `mentoria-hub`:

- React, TypeScript, TanStack Start, and Tailwind CSS
- Cloudflare Workers and D1 configuration
- Drizzle ORM schema and migration tooling
- Better Auth session and sign-in infrastructure
- responsive application shell, form controls, account, and admin patterns

The write-off vertical slice is available at:

- `/write-offs` — authenticated employee submission and personal history
- `/review/write-offs` — reviewer queue for `mentor` and `admin` profiles

The reviewer experience adapts the search, filter, sort, summary, grouped
check-in, and fast status-update patterns from the HackNU 2026 attendance
dashboard. Approved requests are marked `queued` for iiko; a live iiko API
adapter still requires restaurant credentials and endpoint details.

The original Mentoria catalog screens remain in the repository as foundation
references, but are no longer linked from the primary Burgeri navigation.

## Local setup

1. Install dependencies with `pnpm install`.
2. Copy `.env.example` to `.dev.vars` and provide a strong
   `BETTER_AUTH_SECRET`.
3. Replace the placeholder D1 database ID in `wrangler.jsonc` after creating
   the `burgeri-web-db` database.
4. Run `pnpm db:migrate:local`, then `pnpm db:seed:local`.
5. Start the app with `pnpm dev`.

No source credentials, local databases, Wrangler state, dependency folders, or
deployment-domain settings were copied from `mentoria-hub`.
