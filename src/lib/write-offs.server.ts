import "@tanstack/react-start/server-only"

import { and, desc, eq, inArray } from "drizzle-orm"

import { account, user } from "@/db/auth-schema"
import { setStaffRole } from "@/db/queries"
import {
  pointOfSale,
  product,
  productCategory,
  staffProfile,
  writeOffCategory,
  writeOffRequest,
} from "@/db/schema"
import { actionError, actionOk } from "@/lib/action-result"
import type { ActionResult } from "@/lib/action-result"
import { getAuth } from "@/lib/auth.server"
import { getServerDb } from "@/lib/db.server"
import {
  createIikoWriteOffDocument,
  getIikoWriteOffPreview,
  IikoApiError,
} from "@/lib/iiko.server"
import { requireAdmin, requireReviewer } from "@/lib/user-context.server"
import type { IikoSyncStatus, WriteOffStatus } from "@/lib/write-offs"
import type {
  CreateEmployeeInput,
  ReviewWriteOffRequestInput,
  SetEmployeePasswordInput,
  SetStaffRoleInput,
  SyncWriteOffToIikoInput,
} from "@/lib/validation"

export async function getWriteOffReviewData() {
  await requireReviewer("/review/write-offs")
  const rows = await loadRequests()
  return { requests: rows }
}

export async function getWriteOffHistoryData() {
  await requireReviewer("/review/history")
  const rows = await loadRequests()
  return { requests: rows }
}

export async function getWriteOffDetailData(requestId: string) {
  await requireReviewer(`/review/write-offs/${requestId}`)
  const rows = await loadRequests(requestId)
  const request = rows.at(0) ?? null

  if (!request) {
    return { request: null, iikoActPreview: null }
  }

  const iikoActPreview =
    request.status === "approved"
      ? getIikoWriteOffPreview({
          requestId: request.id,
          requestNumber: request.requestNumber,
          storeId: request.pointOfSaleId,
          storeName: request.pointOfSaleName,
          productId: request.productId,
          productName: request.productName,
          productSku: request.productSku,
          quantity: request.quantity,
          unit: request.unit,
          comment: request.comment,
          reviewedAt: request.reviewedAt ? new Date(request.reviewedAt) : null,
        })
      : null

  return { request, iikoActPreview }
}

export async function getWriteOffAnalyticsData(days: 7 | 14 | 30 = 14) {
  await requireReviewer("/review/analytics")
  const rows = await loadRequests()
  const today = startOfUtcDay(new Date())
  const currentStart = addUtcDays(today, -(days - 1))
  const previousStart = addUtcDays(currentStart, -days)
  const currentRows = rows.filter(
    (row) => new Date(row.createdAt) >= currentStart
  )
  const previousRows = rows.filter((row) => {
    const created = new Date(row.createdAt)
    return created >= previousStart && created < currentStart
  })

  const byStatus = summarizeStatuses(currentRows)
  const previousByStatus = summarizeStatuses(previousRows)

  const byLocation = groupCount(
    currentRows,
    (row) => row.pointOfSaleId,
    (row) => row.pointOfSaleName
  )
  const byProduct = groupCount(
    currentRows,
    (row) => row.productId,
    (row) => row.productName
  )
  const byCategory = groupCount(
    currentRows,
    (row) => row.writeOffCategoryId,
    (row) => row.writeOffCategoryName
  )

  const byDeduction = {
    none: currentRows.filter((row) => row.deductionMode === "none").length,
    employee: currentRows.filter((row) => row.deductionMode === "employee")
      .length,
  }

  const iikoSync = {
    not_started: currentRows.filter(
      (row) => row.iikoSyncStatus === "not_started"
    ).length,
    queued: currentRows.filter((row) => row.iikoSyncStatus === "queued").length,
    syncing: currentRows.filter((row) => row.iikoSyncStatus === "syncing")
      .length,
    synced: currentRows.filter((row) => row.iikoSyncStatus === "synced").length,
    failed: currentRows.filter((row) => row.iikoSyncStatus === "failed").length,
  }

  const topChargedEmployees = [
    ...currentRows
      .filter((row) => row.deductionMode === "employee" && row.chargedEmployee)
      .reduce((map, row) => {
        const employee = row.chargedEmployee!
        const current = map.get(employee.id)
        map.set(employee.id, {
          id: employee.id,
          name: employee.name,
          total: (current?.total ?? 0) + 1,
        })
        return map
      }, new Map<string, { id: string; name: string; total: number }>())
      .values(),
  ]
    .sort((a, b) => b.total - a.total)
    .slice(0, 8)

  const trend = []
  for (let offset = 0; offset < days; offset += 1) {
    const day = addUtcDays(currentStart, offset)
    const next = addUtcDays(day, 1)
    const dayRows = currentRows.filter((row) => {
      const created = new Date(row.createdAt)
      return created >= day && created < next
    })
    trend.push({
      date: day.toISOString().slice(0, 10),
      ...summarizeStatuses(dayRows),
    })
  }

  return {
    period: {
      days,
      start: currentStart.toISOString(),
      end: addUtcDays(today, 1).toISOString(),
    },
    byStatus,
    previousByStatus,
    byLocation,
    byProduct,
    byCategory,
    byDeduction,
    iikoSync,
    topChargedEmployees,
    trend,
  }
}

export async function getStaffDirectoryData() {
  await requireAdmin("/admin")
  const db = getServerDb()
  const [userRows, profileRows, credentialRows, posRows] = await Promise.all([
    db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
        displayUsername: user.displayUsername,
        createdAt: user.createdAt,
      })
      .from(user)
      .orderBy(user.name),
    db.select().from(staffProfile),
    db
      .select({ userId: account.userId })
      .from(account)
      .where(eq(account.providerId, "credential")),
    db
      .select({ id: pointOfSale.id, name: pointOfSale.name })
      .from(pointOfSale)
      .orderBy(pointOfSale.name),
  ])

  const roleByUserId = new Map(profileRows.map((row) => [row.userId, row.role]))
  const hasLogin = new Set(credentialRows.map((row) => row.userId))

  return {
    staff: userRows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      employeeId: row.displayUsername ?? row.username,
      role: roleByUserId.get(row.id) ?? "employee",
      hasLogin: hasLogin.has(row.id),
      createdAt: row.createdAt.toISOString(),
    })),
    pointsOfSale: posRows,
  }
}

export async function reviewWriteOffRequestAction(
  input: ReviewWriteOffRequestInput
): Promise<ActionResult<ReviewWriteOffResult>> {
  const context = await requireReviewer("/review/write-offs")
  const db = getServerDb()
  const now = new Date()
  const requestRows = await db
    .update(writeOffRequest)
    .set({
      status: input.status,
      reviewerId: context.user.id,
      reviewComment: input.reviewComment || null,
      reviewedAt: now,
      iikoSyncStatus: input.status === "approved" ? "queued" : "not_started",
      updatedAt: now,
    })
    .where(
      and(
        eq(writeOffRequest.id, input.requestId),
        eq(writeOffRequest.status, "pending")
      )
    )
    .returning({ id: writeOffRequest.id })

  if (requestRows.length === 0) {
    return actionError(
      "This request was already processed. Refresh the queue to see its current status."
    )
  }

  if (input.status === "approved") {
    const syncResult = await syncWriteOffToIiko(input.requestId)
    if (syncResult.ok) {
      return actionOk({
        ...requestRows[0],
        status: input.status,
        iikoSyncStatus: syncResult.data.iikoSyncStatus,
        iikoDocumentId: syncResult.data.iikoDocumentId,
      })
    }
    return actionOk({
      ...requestRows[0],
      status: input.status,
      iikoSyncStatus: "failed" as const,
      iikoDocumentId: null,
      iikoMessage: syncResult.message,
    })
  }

  return actionOk({
    ...requestRows[0],
    status: input.status,
    iikoSyncStatus: "not_started" as const,
    iikoDocumentId: null,
  })
}

interface ReviewWriteOffResult {
  id: string
  status: WriteOffStatus
  iikoSyncStatus: IikoSyncStatus
  iikoDocumentId: string | null
  iikoMessage?: string
}

export async function syncWriteOffToIikoAction(input: SyncWriteOffToIikoInput) {
  await requireReviewer("/review/write-offs")
  return syncWriteOffToIiko(input.requestId)
}

async function syncWriteOffToIiko(requestId: string) {
  const db = getServerDb()
  const rows = await loadRequests(requestId)
  const request = rows.at(0)

  if (!request) {
    return actionError("This request no longer exists.")
  }
  if (request.status !== "approved") {
    return actionError("Only approved requests can be sent to iiko.")
  }
  if (request.iikoSyncStatus === "synced") {
    return actionError("This request is already synced to iiko.")
  }
  if (request.iikoSyncStatus === "syncing") {
    return actionError("This request is already being sent to iiko.")
  }

  const claimed = await db
    .update(writeOffRequest)
    .set({ iikoSyncStatus: "syncing", updatedAt: new Date() })
    .where(
      and(
        eq(writeOffRequest.id, request.id),
        inArray(writeOffRequest.iikoSyncStatus, [
          "not_started",
          "queued",
          "failed",
        ])
      )
    )
    .returning({ id: writeOffRequest.id })

  if (claimed.length === 0) {
    return actionError("This request is already being sent to iiko.")
  }

  try {
    const { documentId, documentNumber, message, payload } =
      await createIikoWriteOffDocument(
        {
          requestId: request.id,
          requestNumber: request.requestNumber,
          storeId: request.pointOfSaleId,
          storeName: request.pointOfSaleName,
          productId: request.productId,
          productName: request.productName,
          productSku: request.productSku,
          quantity: request.quantity,
          unit: request.unit,
          comment: request.comment,
          reviewedAt: request.reviewedAt ? new Date(request.reviewedAt) : null,
        },
        request.iikoDocumentId
      )

    await db
      .update(writeOffRequest)
      .set({
        iikoSyncStatus: "synced",
        iikoDocumentId: documentId,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(writeOffRequest.id, request.id),
          eq(writeOffRequest.iikoSyncStatus, "syncing")
        )
      )

    return actionOk({
      iikoSyncStatus: "synced" as const,
      iikoDocumentId: documentId,
      documentId,
      documentNumber,
      message,
      payload,
    })
  } catch (error) {
    console.error("Failed to sync write-off to iiko:", error)
    const createdDocumentId =
      error instanceof IikoApiError
        ? (error.createdDocumentId ?? request.iikoDocumentId)
        : request.iikoDocumentId
    await db
      .update(writeOffRequest)
      .set({
        iikoSyncStatus: "failed",
        iikoDocumentId: createdDocumentId,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(writeOffRequest.id, request.id),
          eq(writeOffRequest.iikoSyncStatus, "syncing")
        )
      )
    return actionError(getIikoErrorMessage(error))
  }
}

export async function setStaffRoleAction(input: SetStaffRoleInput) {
  const context = await requireAdmin("/admin")
  const db = getServerDb()

  if (input.userId === context.user.id && input.role !== "admin") {
    return actionError("You cannot remove your own admin access.")
  }

  const targetRows = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.id, input.userId))
    .limit(1)
  if (targetRows.length === 0) {
    return actionError("That staff member no longer exists.")
  }

  const profile = await setStaffRole(db, input)
  return actionOk({ role: profile?.role ?? input.role })
}

export async function createEmployeeAction(input: CreateEmployeeInput) {
  await requireAdmin("/admin")
  const db = getServerDb()
  const username = input.employeeId.toLowerCase()
  const email = `${username}@staff.burgeri.local`

  const clash = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.username, username))
    .limit(1)
  if (clash.length > 0) {
    return actionError("That табельный номер is already in use.")
  }

  const hashed = await hashPassword(input.password)
  const userId = crypto.randomUUID()
  const now = new Date()

  await db.insert(user).values({
    id: userId,
    name: input.name,
    email,
    emailVerified: true,
    username,
    displayUsername: input.employeeId,
    createdAt: now,
    updatedAt: now,
  })
  await db.insert(account).values({
    id: crypto.randomUUID(),
    accountId: userId,
    providerId: "credential",
    userId,
    password: hashed,
    createdAt: now,
    updatedAt: now,
  })
  await db.insert(staffProfile).values({
    userId,
    role: "employee",
    defaultPointOfSaleId: input.defaultPointOfSaleId,
  })

  return actionOk({ userId })
}

export async function setEmployeePasswordAction(
  input: SetEmployeePasswordInput
) {
  await requireAdmin("/admin")
  const db = getServerDb()
  const hashed = await hashPassword(input.password)
  const now = new Date()

  const existing = await db
    .select({ id: account.id })
    .from(account)
    .where(
      and(
        eq(account.userId, input.userId),
        eq(account.providerId, "credential")
      )
    )
    .limit(1)

  if (existing.length > 0) {
    await db
      .update(account)
      .set({ password: hashed, updatedAt: now })
      .where(eq(account.id, existing[0].id))
  } else {
    await db.insert(account).values({
      id: crypto.randomUUID(),
      accountId: input.userId,
      providerId: "credential",
      userId: input.userId,
      password: hashed,
      createdAt: now,
      updatedAt: now,
    })
  }

  return actionOk({})
}

async function hashPassword(password: string) {
  const ctx = await getAuth().$context
  return ctx.password.hash(password)
}

// Load reviewer-facing requests with catalog and user names joined in.
async function loadRequests(requestId?: string) {
  const db = getServerDb()
  const rows = await db
    .select()
    .from(writeOffRequest)
    .where(requestId ? eq(writeOffRequest.id, requestId) : undefined)
    .orderBy(desc(writeOffRequest.createdAt))

  if (rows.length === 0) {
    return []
  }

  const productIds = [...new Set(rows.map((row) => row.productId))]
  const posIds = [...new Set(rows.map((row) => row.pointOfSaleId))]
  const categoryIds = [...new Set(rows.map((row) => row.writeOffCategoryId))]
  const userIds = [
    ...new Set(
      rows.flatMap((row) =>
        [row.submitterId, row.deductionEmployeeId, row.reviewerId].filter(
          (id): id is string => Boolean(id)
        )
      )
    ),
  ]

  const [productRows, posRows, categoryRows, userRows] = await Promise.all([
    db
      .select({
        id: product.id,
        name: product.name,
        sku: product.sku,
        unit: product.unit,
        categoryName: productCategory.name,
      })
      .from(product)
      .innerJoin(productCategory, eq(product.categoryId, productCategory.id))
      .where(inArray(product.id, productIds)),
    db
      .select({ id: pointOfSale.id, name: pointOfSale.name })
      .from(pointOfSale)
      .where(inArray(pointOfSale.id, posIds)),
    db
      .select({ id: writeOffCategory.id, name: writeOffCategory.name })
      .from(writeOffCategory)
      .where(inArray(writeOffCategory.id, categoryIds)),
    userIds.length
      ? db
          .select({
            id: user.id,
            name: user.name,
            email: user.email,
            displayUsername: user.displayUsername,
            username: user.username,
          })
          .from(user)
          .where(inArray(user.id, userIds))
      : [],
  ])

  const productById = new Map(productRows.map((row) => [row.id, row]))
  const posById = new Map(posRows.map((row) => [row.id, row]))
  const categoryById = new Map(categoryRows.map((row) => [row.id, row]))
  const userById = new Map(userRows.map((row) => [row.id, row]))

  function mapUser(id: string | null) {
    if (!id) return null
    const found = userById.get(id)
    if (!found) return null
    return {
      id: found.id,
      name: found.name,
      email: found.email,
      employeeId: found.displayUsername ?? found.username,
    }
  }

  return rows.map((row) => {
    const productRow = productById.get(row.productId)
    return {
      id: row.id,
      requestNumber: row.requestNumber,
      status: row.status,
      productId: row.productId,
      productName: productRow?.name ?? "Unknown product",
      productSku: productRow?.sku ?? "",
      unit: productRow?.unit ?? "pcs",
      categoryName: productRow?.categoryName ?? "",
      pointOfSaleId: row.pointOfSaleId,
      pointOfSaleName:
        posById.get(row.pointOfSaleId)?.name ?? row.pointOfSaleId,
      writeOffCategoryId: row.writeOffCategoryId,
      writeOffCategoryName:
        categoryById.get(row.writeOffCategoryId)?.name ?? "",
      quantity: row.quantity,
      deductionMode: row.deductionMode,
      comment: row.comment,
      photoFileId: row.photoFileId,
      photoUrl: row.photoUrl,
      submitter: mapUser(row.submitterId),
      chargedEmployee: mapUser(row.deductionEmployeeId),
      reviewer: mapUser(row.reviewerId),
      reviewComment: row.reviewComment,
      iikoSyncStatus: row.iikoSyncStatus,
      iikoDocumentId: row.iikoDocumentId,
      createdAt: row.createdAt.toISOString(),
      reviewedAt: row.reviewedAt?.toISOString() ?? null,
    }
  })
}

function groupCount<T>(
  rows: T[],
  getId: (row: T) => string,
  getName: (row: T) => string
) {
  const map = new Map<string, { id: string; name: string; total: number }>()
  for (const row of rows) {
    const id = getId(row)
    const current = map.get(id)
    map.set(id, {
      id,
      name: getName(row),
      total: (current?.total ?? 0) + 1,
    })
  }
  return [...map.values()].sort((a, b) => b.total - a.total)
}

function summarizeStatuses<T extends { status: string }>(rows: T[]) {
  return {
    total: rows.length,
    pending: rows.filter((row) => row.status === "pending").length,
    approved: rows.filter((row) => row.status === "approved").length,
    rejected: rows.filter((row) => row.status === "rejected").length,
  }
}

function startOfUtcDay(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  )
}

function addUtcDays(date: Date, days: number) {
  const copy = new Date(date)
  copy.setUTCDate(copy.getUTCDate() + days)
  return copy
}

function getIikoErrorMessage(error: unknown) {
  if (error instanceof IikoApiError) {
    if (error.status === 401) return "iiko authentication failed."
    if (error.status === 403) return "iiko denied this inventory operation."
    if (error.status === 429)
      return "iiko is rate limiting requests. Try again shortly."
    if (error.status === 0)
      return "iiko could not be reached. Try again shortly."
    return "iiko rejected the write-off. Review the integration logs."
  }
  return "iiko is not configured for this point of sale or product."
}

export type WriteOffReviewData = Awaited<
  ReturnType<typeof getWriteOffReviewData>
>
export type WriteOffDetailData = Awaited<
  ReturnType<typeof getWriteOffDetailData>
>
export type WriteOffAnalyticsData = Awaited<
  ReturnType<typeof getWriteOffAnalyticsData>
>
export type StaffDirectoryData = Awaited<
  ReturnType<typeof getStaffDirectoryData>
>
