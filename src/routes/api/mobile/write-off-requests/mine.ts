import { createFileRoute } from "@tanstack/react-router"

import {
  jsonResponse,
  listMyWriteOffs,
  mobileErrorResponse,
  requireMobileContext,
} from "@/lib/mobile.server"

export const Route = createFileRoute("/api/mobile/write-off-requests/mine")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const context = await requireMobileContext(request)
          return jsonResponse(await listMyWriteOffs(context))
        } catch (error) {
          return mobileErrorResponse(error)
        }
      },
    },
  },
})
