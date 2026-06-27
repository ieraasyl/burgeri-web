import { createFileRoute } from "@tanstack/react-router"

import {
  MobileApiError,
  jsonResponse,
  mobileErrorResponse,
  requireMobileContext,
} from "@/lib/mobile.server"

export const Route = createFileRoute("/api/mobile/files/write-off-photo")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          await requireMobileContext(request)
          const form = await request.formData()
          const file = form.get("file")

          if (!(file instanceof File)) {
            throw new MobileApiError("Файл не получен.", 400)
          }
          if (file.size > 8_000_000) {
            throw new MobileApiError("Фото должно быть меньше 8 МБ.", 400)
          }

          const { uploadPhotoToDrive } = await import("@/lib/gas.server")
          const uploaded = await uploadPhotoToDrive({
            buffer: await file.arrayBuffer(),
            filename: file.name || `write-off-${Date.now()}.jpg`,
            mimeType: file.type || "image/jpeg",
          })

          return jsonResponse({
            photoFileId: uploaded.fileId,
            photoUrl: uploaded.url,
            photoUri: uploaded.url,
          })
        } catch (error) {
          return mobileErrorResponse(error)
        }
      },
    },
  },
})
