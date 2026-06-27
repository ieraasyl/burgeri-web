import { createFileRoute } from "@tanstack/react-router"

import {
  getMobileWriteOffCategories,
  jsonResponse,
  mobileErrorResponse,
  requireMobileContext,
} from "@/lib/mobile.server"

export const Route = createFileRoute(
  "/api/mobile/catalog/write-off-categories"
)({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const context = await requireMobileContext(request)
          return jsonResponse(await getMobileWriteOffCategories(context))
        } catch (error) {
          return mobileErrorResponse(error)
        }
      },
    },
  },
})
