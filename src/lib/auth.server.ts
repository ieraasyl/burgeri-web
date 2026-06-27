import { expo } from "@better-auth/expo"
import { env } from "cloudflare:workers"
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { emailOTP, username } from "better-auth/plugins"
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
  GAS_URL?: string
  GAS_SECRET?: string
  GOOGLE_CLIENT_ID?: string
  GOOGLE_CLIENT_SECRET?: string
}

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
  const gasUrl = authEnv.GAS_URL
  const gasSecret = authEnv.GAS_SECRET

  const googleClientId = authEnv.GOOGLE_CLIENT_ID
  const googleClientSecret = authEnv.GOOGLE_CLIENT_SECRET
  const socialProviders =
    googleClientId && googleClientSecret
      ? {
          google: {
            clientId: googleClientId,
            clientSecret: googleClientSecret,
          },
        }
      : undefined

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
    emailAndPassword: { enabled: true },
    // The mobile app (scheme `burgeri`) signs in with the better-auth expo
    // client and replays the session cookie; trust its custom-scheme origins.
    trustedOrigins: ["burgeri://", "burgeri://*"],
    ...(socialProviders && { socialProviders }),
    plugins: [
      expo(),
      username(),
      emailOTP({
        otpLength: 6,
        expiresIn: 300,
        async sendVerificationOTP({ email, otp, type }) {
          if (!gasUrl || !gasSecret) {
            console.log(
              `[OTP] GAS not configured; type=${type} email=${email} otp=${otp}`
            )
            return
          }

          try {
            const res = await fetch(gasUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                secret: gasSecret,
                action: "send-otp",
                email,
                otp,
                type,
              }),
            })

            if (!res.ok) {
              console.error(`[OTP] GAS returned HTTP ${res.status}`)
            }
          } catch (error) {
            console.error("[OTP] Failed to call GAS:", error)
          }
        },
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
