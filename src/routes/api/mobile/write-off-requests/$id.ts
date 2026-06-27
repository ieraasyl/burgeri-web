import { createFileRoute } from "@tanstack/react-router"

import {
  getMyWriteOff,
  jsonResponse,
  mobileErrorResponse,
  requireMobileContext,
} from "@/lib/mobile.server"

export const Route = createFileRoute("/api/mobile/write-off-requests/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        try {
          const context = await requireMobileContext(request)
          return jsonResponse(await getMyWriteOff(context, params.id))
        } catch (error) {
          return mobileErrorResponse(error)
        }
      },
    },
  },
})
