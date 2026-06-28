import { expo } from "@better-auth/expo"
import { env } from "cloudflare:workers"
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { username } from "better-auth/plugins"
import type { AnyD1Database } from "drizzle-orm/d1"

import {
  account,
  session as authSessionTable,
  user,
  verification,
} from "@/db/auth-schema"
import { getDb } from "@/db"

interface AuthEnv {
  burgeri_db?: AnyD1Database
  BETTER_AUTH_SECRET?: string
  BETTER_AUTH_URL?: string
}

const mobileTrustedOrigins = [
  "burgeri://",
  "burgeri://*",
  // Expo Go uses exp:// origins when the app is opened from a QR code.
  "exp://",
]

// Building the Better Auth instance (and its Drizzle adapter) is relatively
// expensive; the env is constant per isolate, so memoize it across requests.
let authInstance: ReturnType<typeof createAuth> | undefined

export function getAuth() {
  authInstance ??= createAuth()
  return authInstance
}

function createAuth() {
  const authEnv = env as unknown as AuthEnv
  const d1Binding = authEnv.burgeri_db
  const secret = authEnv.BETTER_AUTH_SECRET
  const url = authEnv.BETTER_AUTH_URL

  if (!secret) {
    throw new Error("BETTER_AUTH_SECRET is not set")
  }

  if (!url) {
    throw new Error("BETTER_AUTH_URL is not set")
  }

  if (!d1Binding) {
    throw new Error("D1 binding (burgeri_db) is not configured")
  }

  const db = getDb(d1Binding)

  return betterAuth({
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema: {
        user,
        session: authSessionTable,
        account,
        verification,
      },
    }),
    secret,
    appName: "Burgeri Ops",
    baseURL: url,
    // Required by the username plugin (employee табельный + password) and used
    // when an admin provisions employee logins server-side.
    emailAndPassword: { enabled: true, disableSignUp: true },
    // The mobile app signs in with the better-auth expo client and replays the
    // session cookie; trust standalone (`burgeri://`) and Expo Go (`exp://`)
    // custom-scheme origins.
    trustedOrigins: mobileTrustedOrigins,
    plugins: [
      expo(),
      username({
        minUsernameLength: 2,
        maxUsernameLength: 40,
        usernameValidator: (value) => /^[A-Za-z0-9_-]+$/.test(value),
      }),
    ],
  })
}

export async function getSession(request: Request) {
  const auth = getAuth()

  try {
    return await auth.api.getSession({
      headers: request.headers,
    })
  } catch (error) {
    console.error("Failed to get session:", error)
    return null
  }
}

export async function ensureSession(request: Request) {
  const currentSession = await getSession(request)

  if (!currentSession) {
    throw new Error("Unauthorized")
  }

  return currentSession
}
