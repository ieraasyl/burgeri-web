import { readdirSync } from "node:fs"
import { resolve } from "node:path"

import { defineConfig } from "drizzle-kit"

const d1Dir = resolve(".wrangler/state/v3/d1/miniflare-D1DatabaseObject")
const sqliteFile = readdirSync(d1Dir).find((file) => file.endsWith(".sqlite"))

if (!sqliteFile) {
  throw new Error("No local D1 SQLite file found. Run the dev server first.")
}

export default defineConfig({
  dialect: "sqlite",
  schema: ["./src/db/schema.ts", "./src/db/auth-schema.ts"],
  out: "./drizzle",
  dbCredentials: {
    url: resolve(d1Dir, sqliteFile),
  },
})
