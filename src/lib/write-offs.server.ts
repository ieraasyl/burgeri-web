import "@tanstack/react-start/server-only"

import { and, desc, eq, inArray } from "drizzle-orm"

import { user } from "@/db/auth-schema"
import { setStaffRole } from "@/db/queries"
import { staffProfile, writeOffRequest } from "@/db/schema"
import { actionError, actionOk } from "@/lib/action-result"
import { getServerDb } from "@/lib/db.server"
import {
  buildIikoWriteOffAct,
  createIikoWriteOffDocument,
} from "@/lib/iiko.server"
import {
  requireAdmin,
  requireReviewer,
  requireUser,
} from "@/lib/user-context.server"
import { getLocationName, restaurantLocations } from "@/lib/write-offs"
import type {
  CreateWriteOffRequestInput,
  ReviewWriteOffRequestInput,
  SetStaffRoleInput,
  SyncWriteOffToIikoInput,
} from "@/lib/validation"

function isReviewerRole(role: string | undefined) {
  return role === "reviewer" || role === "admin"
}

export async function getWriteOffPageData() {
  const context = await requireUser("/write-offs")
  const db = getServerDb()
  const [requestRows, employeeRows] = await Promise.all([
    db
      .select()
      .from(writeOffRequest)
      .where(eq(writeOffRequest.submitterId, context.user.id))
      .orderBy(desc(writeOffRequest.createdAt)),
    db
      .select({ id: user.id, name: user.name, email: user.email })
      .from(user)
      .orderBy(user.name),
  ])

  return {
    viewer: {
      id: context.user.id,
      name: context.user.name,
      isReviewer: isReviewerRole(context.profile.role),
    },
    employees: employeeRows,
    requests: await hydrateRequests(requestRows),
  }
}

export async function getWriteOffReviewData() {
  await requireReviewer("/review/write-offs")
  const db = getServerDb()
  const requestRows = await db
    .select()
    .from(writeOffRequest)
    .orderBy(desc(writeOffRequest.createdAt))

  return {
    requests: await hydrateRequests(requestRows),
  }
}

export async function getWriteOffDetailData(requestId: string) {
  await requireReviewer(`/review/write-offs/${requestId}`)
  const db = getServerDb()
  const rows = await db
    .select()
    .from(writeOffRequest)
    .where(eq(writeOffRequest.id, requestId))
    .limit(1)
  const row = rows.at(0)

  if (!row) {
    return { request: null, iikoActPreview: null }
  }

  const [request] = await hydrateRequests([row])
  const iikoActPreview =
    row.status === "approved"
      ? buildIikoWriteOffAct({
          requestId: row.id,
          locationId: row.locationId,
          productType: row.productType,
          quantity: row.quantity,
          comment: row.comment,
          reviewedAt: row.reviewedAt,
        })
      : null

  return { request, iikoActPreview }
}

export async function getWriteOffHistoryData() {
  await requireReviewer("/review/history")
  const db = getServerDb()
  const requestRows = await db
    .select()
    .from(writeOffRequest)
    .orderBy(desc(writeOffRequest.createdAt))

  return {
    requests: await hydrateRequests(requestRows),
  }
}

export async function getWriteOffAnalyticsData() {
  await requireReviewer("/review/analytics")
  const db = getServerDb()
  const rows = await db
    .select()
    .from(writeOffRequest)
    .orderBy(desc(writeOffRequest.createdAt))

  const byStatus = {
    total: rows.length,
    pending: rows.filter((row) => row.status === "pending").length,
    approved: rows.filter((row) => row.status === "approved").length,
    rejected: rows.filter((row) => row.status === "rejected").length,
  }

  const byLocation = restaurantLocations
    .map((location) => {
      const locationRows = rows.filter((row) => row.locationId === location.id)
      return {
        id: location.id,
        name: location.name,
        total: locationRows.length,
        pending: locationRows.filter((row) => row.status === "pending").length,
        approved: locationRows.filter((row) => row.status === "approved")
          .length,
        rejected: locationRows.filter((row) => row.status === "rejected")
          .length,
      }
    })
    .sort((a, b) => b.total - a.total)

  const productTotals = new Map<string, number>()
  for (const row of rows) {
    productTotals.set(
      row.productType,
      (productTotals.get(row.productType) ?? 0) + 1
    )
  }
  const byProduct = [...productTotals.entries()]
    .map(([productType, total]) => ({ productType, total }))
    .sort((a, b) => b.total - a.total)

  const byDeduction = {
    company: rows.filter((row) => row.deductionType === "company").length,
    employee: rows.filter((row) => row.deductionType === "employee").length,
  }

  const iikoSync = {
    not_started: rows.filter((row) => row.iikoSyncStatus === "not_started")
      .length,
    queued: rows.filter((row) => row.iikoSyncStatus === "queued").length,
    synced: rows.filter((row) => row.iikoSyncStatus === "synced").length,
    failed: rows.filter((row) => row.iikoSyncStatus === "failed").length,
  }

  // Charged-employee leaderboard: only `employee` deductions carry a charge.
  const chargeCounts = new Map<string, number>()
  for (const row of rows) {
    if (row.deductionType === "employee" && row.chargedEmployeeId) {
      chargeCounts.set(
        row.chargedEmployeeId,
        (chargeCounts.get(row.chargedEmployeeId) ?? 0) + 1
      )
    }
  }
  const chargedUserIds = [...chargeCounts.keys()]
  const chargedUsers = chargedUserIds.length
    ? await db
        .select({ id: user.id, name: user.name, email: user.email })
        .from(user)
        .where(inArray(user.id, chargedUserIds))
    : []
  const chargedUsersById = new Map(chargedUsers.map((row) => [row.id, row]))
  const topChargedEmployees = [...chargeCounts.entries()]
    .map(([userId, total]) => ({
      userId,
      name: chargedUsersById.get(userId)?.name ?? "Unknown",
      email: chargedUsersById.get(userId)?.email ?? "",
      total,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8)

  // Daily submission counts for the trailing 14 days (oldest first).
  const days: Array<{ date: string; total: number }> = []
  const start = startOfDay(new Date())
  for (let offset = 13; offset >= 0; offset -= 1) {
    const day = new Date(start)
    day.setDate(day.getDate() - offset)
    const next = new Date(day)
    next.setDate(next.getDate() + 1)
    const total = rows.filter(
      (row) => row.createdAt >= day && row.createdAt < next
    ).length
    days.push({ date: day.toISOString().slice(0, 10), total })
  }

  return {
    byStatus,
    byLocation,
    byProduct,
    byDeduction,
    iikoSync,
    topChargedEmployees,
    trend: days,
  }
}

export async function getStaffDirectoryData() {
  await requireAdmin("/admin")
  const db = getServerDb()
  const [userRows, profileRows] = await Promise.all([
    db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      })
      .from(user)
      .orderBy(user.name),
    db.select().from(staffProfile),
  ])

  const roleByUserId = new Map(profileRows.map((row) => [row.userId, row.role]))

  return {
    staff: userRows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      role: roleByUserId.get(row.id) ?? "employee",
      createdAt: row.createdAt.toISOString(),
    })),
  }
}

export async function createWriteOffRequestAction(
  input: CreateWriteOffRequestInput
) {
  const context = await requireUser("/write-offs")
  const db = getServerDb()

  if (input.chargedEmployeeId) {
    const employeeRows = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.id, input.chargedEmployeeId))
      .limit(1)

    if (employeeRows.length === 0) {
      return actionError("The selected employee is no longer available.")
    }
  }

  const requestRows = await db
    .insert(writeOffRequest)
    .values({
      submitterId: context.user.id,
      locationId: input.locationId,
      productType: input.productType,
      quantity: input.quantity,
      deductionType: input.deductionType,
      chargedEmployeeId:
        input.deductionType === "employee" ? input.chargedEmployeeId : null,
      comment: input.comment,
      photoDataUrl: input.photoDataUrl,
    })
    .returning({ id: writeOffRequest.id })

  return actionOk({ requestId: requestRows[0].id })
}

export async function reviewWriteOffRequestAction(
  input: ReviewWriteOffRequestInput
) {
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
    .returning({
      id: writeOffRequest.id,
      status: writeOffRequest.status,
      iikoSyncStatus: writeOffRequest.iikoSyncStatus,
    })

  if (requestRows.length === 0) {
    return actionError(
      "This request was already processed. Refresh the queue to see its current status."
    )
  }

  return actionOk(requestRows[0])
}

export async function syncWriteOffToIikoAction(input: SyncWriteOffToIikoInput) {
  await requireReviewer("/review/write-offs")
  const db = getServerDb()
  const rows = await db
    .select()
    .from(writeOffRequest)
    .where(eq(writeOffRequest.id, input.requestId))
    .limit(1)
  const row = rows.at(0)

  if (!row) {
    return actionError("This request no longer exists.")
  }

  if (row.status !== "approved") {
    return actionError("Only approved requests can be sent to iiko.")
  }

  if (row.iikoSyncStatus === "synced") {
    return actionError("This request is already synced to iiko.")
  }

  try {
    const { documentId, payload } = await createIikoWriteOffDocument({
      requestId: row.id,
      locationId: row.locationId,
      productType: row.productType,
      quantity: row.quantity,
      comment: row.comment,
      reviewedAt: row.reviewedAt,
    })
    const now = new Date()

    await db
      .update(writeOffRequest)
      .set({
        iikoSyncStatus: "synced",
        iikoDocumentId: documentId,
        updatedAt: now,
      })
      .where(eq(writeOffRequest.id, row.id))

    return actionOk({ documentId, payload })
  } catch (error) {
    console.error("Failed to sync write-off to iiko:", error)
    await db
      .update(writeOffRequest)
      .set({ iikoSyncStatus: "failed", updatedAt: new Date() })
      .where(eq(writeOffRequest.id, row.id))

    return actionError("iiko rejected the act. Try again in a moment.")
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

async function hydrateRequests(
  rows: Array<typeof writeOffRequest.$inferSelect>
) {
  const userIds = [
    ...new Set(
      rows.flatMap((row) =>
        [row.submitterId, row.chargedEmployeeId, row.reviewerId].filter(
          (id): id is string => Boolean(id)
        )
      )
    ),
  ]
  const db = getServerDb()
  const userRows = userIds.length
    ? await db
        .select({ id: user.id, name: user.name, email: user.email })
        .from(user)
        .where(inArray(user.id, userIds))
    : []
  const usersById = new Map(userRows.map((row) => [row.id, row]))

  return rows.map((row) => ({
    id: row.id,
    locationId: row.locationId,
    locationName: getLocationName(row.locationId),
    productType: row.productType,
    quantity: row.quantity,
    deductionType: row.deductionType,
    comment: row.comment,
    photoDataUrl: row.photoDataUrl,
    status: row.status,
    iikoSyncStatus: row.iikoSyncStatus,
    iikoDocumentId: row.iikoDocumentId,
    submitter: usersById.get(row.submitterId) ?? null,
    chargedEmployee: row.chargedEmployeeId
      ? (usersById.get(row.chargedEmployeeId) ?? null)
      : null,
    reviewer: row.reviewerId ? (usersById.get(row.reviewerId) ?? null) : null,
    reviewComment: row.reviewComment,
    createdAt: row.createdAt.toISOString(),
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
  }))
}

export type WriteOffPageData = Awaited<ReturnType<typeof getWriteOffPageData>>
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

function startOfDay(date: Date) {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  return copy
}
