import { createFileRoute } from "@tanstack/react-router"

import {
  buildMobileSession,
  jsonResponse,
  mobileErrorResponse,
  requireMobileContext,
} from "@/lib/mobile.server"

export const Route = createFileRoute("/api/mobile/me")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const context = await requireMobileContext(request)
          return jsonResponse(buildMobileSession(context))
        } catch (error) {
          return mobileErrorResponse(error)
        }
      },
    },
  },
})
