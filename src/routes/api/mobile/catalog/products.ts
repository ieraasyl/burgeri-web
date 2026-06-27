import { createFileRoute } from "@tanstack/react-router"

import {
  getMobileProducts,
  jsonResponse,
  mobileErrorResponse,
  requireMobileContext,
} from "@/lib/mobile.server"

export const Route = createFileRoute("/api/mobile/catalog/products")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const context = await requireMobileContext(request)
          return jsonResponse(await getMobileProducts(context))
        } catch (error) {
          return mobileErrorResponse(error)
        }
      },
    },
  },
})
