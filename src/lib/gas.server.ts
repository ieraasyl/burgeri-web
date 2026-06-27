import "@tanstack/react-start/server-only"

import { env } from "cloudflare:workers"

interface GasEnv {
  GAS_URL?: string
  GAS_SECRET?: string
}

export interface UploadedPhoto {
  fileId: string
  url: string
}

// A Drive file id renders in an <img> via the thumbnail endpoint when the file
// is shared "anyone with the link" (the GAS sets this on upload).
export function drivePhotoUrl(fileId: string) {
  return `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w2000`
}

function bufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ""
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

// Forwards the photo to the Google Apps Script Web App (gas.gs), which stores it
// on Google Drive and returns the file id.
export async function uploadPhotoToDrive(input: {
  buffer: ArrayBuffer
  filename: string
  mimeType: string
}): Promise<UploadedPhoto> {
  const { GAS_URL: gasUrl, GAS_SECRET: gasSecret } = env as unknown as GasEnv

  if (!gasUrl || !gasSecret) {
    throw new Error("GAS_URL / GAS_SECRET are not configured for photo upload.")
  }

  const response = await fetch(gasUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      secret: gasSecret,
      action: "upload-photo",
      filename: input.filename,
      mimeType: input.mimeType,
      dataBase64: bufferToBase64(input.buffer),
    }),
  })

  const text = await response.text()
  let payload: { fileId?: string; url?: string; error?: string } = {}
  try {
    payload = JSON.parse(text)
  } catch {
    throw new Error(
      `GAS returned a non-JSON response (HTTP ${response.status}).`
    )
  }

  if (!response.ok || !payload.fileId) {
    throw new Error(
      payload.error || `GAS upload failed (HTTP ${response.status}).`
    )
  }

  return {
    fileId: payload.fileId,
    url: payload.url || drivePhotoUrl(payload.fileId),
  }
}
