import "@tanstack/react-start/server-only"

import { eq } from "drizzle-orm"
import { env } from "cloudflare:workers"

import { writeOffRequest } from "@/db/schema"
import type {
  BurgerMlApiResponse,
  WriteOffMlClassification,
} from "@/lib/burger-ml"
import { productToMlFamily } from "@/lib/burger-ml"
import { getServerDb } from "@/lib/db.server"

const CLASSIFY_TIMEOUT_MS = 45_000
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"])

function getMlBaseUrl() {
  return env.BURGER_ML_URL.replace(/\/$/, "")
}

export function isBurgerMlConfigured() {
  return Boolean(getMlBaseUrl())
}

function mimeFromUrl(url: string) {
  const lower = url.toLocaleLowerCase()
  if (lower.includes(".png")) return "image/png"
  if (lower.includes(".webp")) return "image/webp"
  return "image/jpeg"
}

async function fetchPhotoBytes(photoUrl: string) {
  const response = await fetch(photoUrl, {
    signal: AbortSignal.timeout(20_000),
  })
  if (!response.ok) {
    throw new Error(`Photo fetch failed (HTTP ${response.status}).`)
  }
  const mimeType =
    response.headers.get("content-type")?.split(";")[0]?.trim() ??
    mimeFromUrl(photoUrl)
  if (!ALLOWED_MIME.has(mimeType)) {
    throw new Error(`Unsupported photo type: ${mimeType}.`)
  }
  const buffer = await response.arrayBuffer()
  if (!buffer.byteLength) {
    throw new Error("Photo is empty.")
  }
  if (buffer.byteLength > 10 * 1024 * 1024) {
    throw new Error("Photo exceeds the 10 MB ML limit.")
  }
  return { buffer, mimeType }
}

export async function classifyPhotoBuffer(input: {
  buffer: ArrayBuffer
  mimeType: string
}): Promise<BurgerMlApiResponse> {
  const baseUrl = getMlBaseUrl()
  if (!baseUrl) {
    throw new Error("BURGER_ML_URL is not configured.")
  }

  const form = new FormData()
  form.append(
    "image",
    new Blob([input.buffer], { type: input.mimeType }),
    "write-off.jpg"
  )

  const response = await fetch(`${baseUrl}/ai/classify`, {
    method: "POST",
    body: form,
    signal: AbortSignal.timeout(CLASSIFY_TIMEOUT_MS),
  })

  const text = await response.text()
  let payload: BurgerMlApiResponse | { detail?: string } = {}
  try {
    payload = JSON.parse(text) as BurgerMlApiResponse | { detail?: string }
  } catch {
    throw new Error(`ML service returned non-JSON (HTTP ${response.status}).`)
  }

  if (!response.ok) {
    const detail =
      "detail" in payload && payload.detail
        ? payload.detail
        : `ML classify failed (HTTP ${response.status}).`
    throw new Error(detail)
  }

  return payload as BurgerMlApiResponse
}

function toStoredClassification(
  result: BurgerMlApiResponse,
  productId: string
): WriteOffMlClassification {
  const expectedFamily = productToMlFamily[productId]
  const productMismatch = expectedFamily
    ? result.ingredient_family !== expectedFamily
    : false

  return {
    classifiedAt: new Date().toISOString(),
    category: result.category,
    ingredientFamily: result.ingredient_family,
    confidence: result.confidence,
    damageLevel: result.damage_level,
    needsManualCheck: result.needs_manual_check,
    suggestedComment: result.suggested_comment,
    viewAgreement: result.view_agreement,
    productMismatch,
    top3: result.top3,
  }
}

function toErrorClassification(message: string): WriteOffMlClassification {
  return {
    classifiedAt: new Date().toISOString(),
    category: "",
    ingredientFamily: "",
    confidence: 0,
    damageLevel: "unknown",
    needsManualCheck: true,
    suggestedComment: "",
    viewAgreement: 0,
    productMismatch: false,
    top3: [],
    error: message,
  }
}

export async function classifyAndPersistWriteOff(requestId: string) {
  if (!isBurgerMlConfigured()) {
    return null
  }

  const db = getServerDb()
  const rows = await db
    .select({
      id: writeOffRequest.id,
      productId: writeOffRequest.productId,
      photoUrl: writeOffRequest.photoUrl,
      mlClassification: writeOffRequest.mlClassification,
    })
    .from(writeOffRequest)
    .where(eq(writeOffRequest.id, requestId))
    .limit(1)

  const row = rows.at(0)
  if (!row?.photoUrl) {
    return null
  }
  if (row.mlClassification && !row.mlClassification.error) {
    return row.mlClassification
  }

  let stored: WriteOffMlClassification
  try {
    const photo = await fetchPhotoBytes(row.photoUrl)
    const result = await classifyPhotoBuffer(photo)
    stored = toStoredClassification(result, row.productId)
  } catch (error) {
    stored = toErrorClassification(
      error instanceof Error ? error.message : "Classification failed."
    )
  }

  await db
    .update(writeOffRequest)
    .set({ mlClassification: stored })
    .where(eq(writeOffRequest.id, requestId))

  return stored
}

export async function classifyPendingWriteOffs(requestIds: string[]) {
  if (!isBurgerMlConfigured() || requestIds.length === 0) {
    return
  }

  const concurrency = 2
  for (let index = 0; index < requestIds.length; index += concurrency) {
    const batch = requestIds.slice(index, index + concurrency)
    await Promise.all(batch.map((id) => classifyAndPersistWriteOff(id)))
  }
}
