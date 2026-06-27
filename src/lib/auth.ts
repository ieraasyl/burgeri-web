import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { emailOTP } from "better-auth/plugins"

export const auth = betterAuth({
  // CLI-only config for schema generation; runtime uses auth.server.ts.
  database: drizzleAdapter(null as any, {
    provider: "sqlite",
    schema: {},
  }),
  secret: process.env.BETTER_AUTH_SECRET,
  appName: "Mentoria Hub",
  ...(process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET && {
      socialProviders: {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        },
      },
    }),
  plugins: [
    emailOTP({
      async sendVerificationOTP() {
        // no-op: CLI-only config for schema generation
      },
    }),
  ],
})
