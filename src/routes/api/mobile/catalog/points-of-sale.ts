import { createFileRoute } from "@tanstack/react-router"

import {
  getMobilePointsOfSale,
  jsonResponse,
  mobileErrorResponse,
  requireMobileContext,
} from "@/lib/mobile.server"

export const Route = createFileRoute("/api/mobile/catalog/points-of-sale")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const context = await requireMobileContext(request)
          return jsonResponse(await getMobilePointsOfSale(context))
        } catch (error) {
          return mobileErrorResponse(error)
        }
      },
    },
  },
})
