import "@tanstack/react-start/server-only"

import { and, desc, eq, inArray } from "drizzle-orm"

import { user } from "@/db/auth-schema"
import { writeOffRequest } from "@/db/schema"
import { actionError, actionOk } from "@/lib/action-result"
import { getServerDb } from "@/lib/db.server"
import { requireReviewer, requireUser } from "@/lib/user-context.server"
import { getLocationName } from "@/lib/write-offs"
import type {
  CreateWriteOffRequestInput,
  ReviewWriteOffRequestInput,
} from "@/lib/validation"

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
      isReviewer:
        context.profile?.role === "mentor" || context.profile?.role === "admin",
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
