import { createFileRoute } from "@tanstack/react-router"

import {
  getMobileProductCategories,
  jsonResponse,
  mobileErrorResponse,
  requireMobileContext,
} from "@/lib/mobile.server"

export const Route = createFileRoute("/api/mobile/catalog/product-categories")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const context = await requireMobileContext(request)
          return jsonResponse(await getMobileProductCategories(context))
        } catch (error) {
          return mobileErrorResponse(error)
        }
      },
    },
  },
})
