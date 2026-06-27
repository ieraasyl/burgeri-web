import "@tanstack/react-start/server-only"

import { env } from "cloudflare:workers"

import { getDb } from "@/db"

// The D1 binding is stable for the lifetime of a worker isolate, so reuse a
// single Drizzle instance across requests instead of rebuilding it each call.
let db: ReturnType<typeof getDb> | undefined

export function getServerDb() {
  db ??= getDb(env.burgeri_db)
  return db
}
