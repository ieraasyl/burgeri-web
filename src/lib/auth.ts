import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { username } from "better-auth/plugins"

export const auth = betterAuth({
  // CLI-only config for schema generation; runtime uses auth.server.ts.
  database: drizzleAdapter(null as any, {
    provider: "sqlite",
    schema: {},
  }),
  secret: process.env.BETTER_AUTH_SECRET,
  appName: "Burgeri Ops",
  emailAndPassword: { enabled: true, disableSignUp: true },
  plugins: [
    username({
      minUsernameLength: 2,
      maxUsernameLength: 40,
      usernameValidator: (value) => /^[A-Za-z0-9_-]+$/.test(value),
    }),
  ],
})
