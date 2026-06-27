import { createFileRoute } from "@tanstack/react-router"

import {
  MobileApiError,
  jsonResponse,
  mobileErrorResponse,
  requireMobileContext,
  submitWriteOff,
} from "@/lib/mobile.server"
import { submitWriteOffSchema } from "@/lib/validation"

export const Route = createFileRoute("/api/mobile/write-off-requests")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const context = await requireMobileContext(request)
          const body = await request.json().catch(() => null)
          const parsed = submitWriteOffSchema.safeParse(body)

          if (!parsed.success) {
            throw new MobileApiError(
              parsed.error.issues[0]?.message ?? "Заполните заявку.",
              400
            )
          }

          return jsonResponse(await submitWriteOff(context, parsed.data))
        } catch (error) {
          return mobileErrorResponse(error)
        }
      },
    },
  },
})
