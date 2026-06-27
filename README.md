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

The existing Mentoria domain screens and data are retained as implementation
references and still need to be replaced with the write-off workflow described
in the case brief.

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
