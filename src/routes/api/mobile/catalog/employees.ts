import { createFileRoute } from "@tanstack/react-router"

import {
  getMobileEmployees,
  jsonResponse,
  mobileErrorResponse,
  requireMobileContext,
} from "@/lib/mobile.server"

export const Route = createFileRoute("/api/mobile/catalog/employees")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const context = await requireMobileContext(request)
          return jsonResponse(await getMobileEmployees(context))
        } catch (error) {
          return mobileErrorResponse(error)
        }
      },
    },
  },
})
