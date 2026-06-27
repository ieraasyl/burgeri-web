import { drizzle } from "drizzle-orm/d1"
import type { AnyD1Database } from "drizzle-orm/d1"

import * as authSchema from "@/db/auth-schema"
import * as schema from "@/db/schema"

export const fullSchema = {
  ...schema,
  ...authSchema,
}

export function getDb(d1: AnyD1Database) {
  return drizzle(d1, { schema: fullSchema })
}

export type AppDb = ReturnType<typeof getDb>

export * from "@/db/auth-schema"
export * from "@/db/queries"
export * from "@/db/schema"
