import "@tanstack/react-start/server-only"

import { env } from "cloudflare:workers"
import { and, asc, desc, eq, inArray } from "drizzle-orm"

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
import { getAuth } from "@/lib/auth.server"
import {
  classifyAndPersistWriteOff,
  classifyPendingWriteOffs,
} from "@/lib/burger-ml.server"
import { getServerDb } from "@/lib/db.server"
import {
  buildIikoWriteOffAct,
  createIikoWriteOffDocument,
} from "@/lib/iiko.server"
import { requireAdmin, requireReviewer } from "@/lib/user-context.server"
import { computeLossAmount } from "@/lib/write-offs"
import type {
  CreateEmployeeInput,
  ReviewWriteOffRequestInput,
  SetEmployeePasswordInput,
  SetStaffRoleInput,
  SyncWriteOffToIikoInput,
  UpsertPointOfSaleInput,
  UpsertProductCategoryInput,
  UpsertProductInput,
} from "@/lib/validation"

export async function getWriteOffReviewData() {
  await requireReviewer("/review/write-offs")
  const db = getServerDb()
  const [initialRequests, pointsOfSale] = await Promise.all([
    loadRequests(),
    loadActivePosCatalog(db),
  ])

  const pendingIds = initialRequests
    .filter(
      (request) =>
        request.status === "pending" &&
        request.photoUrl &&
        (!request.mlClassification || request.mlClassification.error)
    )
    .map((request) => request.id)

  if (pendingIds.length > 0) {
    await classifyPendingWriteOffs(pendingIds)
  }

  const requests =
    pendingIds.length > 0 ? await loadRequests() : initialRequests

  return { requests, pointsOfSale }
}

export async function getWriteOffHistoryData() {
  await requireReviewer("/review/history")
  const db = getServerDb()
  const [requests, pointsOfSale] = await Promise.all([
    loadRequests(),
    loadActivePosCatalog(db),
  ])
  return { requests, pointsOfSale }
}

export async function getWriteOffDetailData(requestId: string) {
  await requireReviewer(`/review/write-offs/${requestId}`)
  await classifyAndPersistWriteOff(requestId)
  const rows = await loadRequests(requestId)
  const request = rows.at(0) ?? null

  if (!request) {
    return { request: null, iikoActPreview: null }
  }

  const iikoActPreview =
    request.status === "approved"
      ? buildIikoWriteOffAct({
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

  const approvedLossRows = currentRows.filter(
    (row) => row.status === "approved" && row.lossAmount != null
  )
  const previousApprovedLossRows = previousRows.filter(
    (row) => row.status === "approved" && row.lossAmount != null
  )
  const totalLoss = approvedLossRows.reduce(
    (sum, row) => sum + row.lossAmount!,
    0
  )
  const previousTotalLoss = previousApprovedLossRows.reduce(
    (sum, row) => sum + row.lossAmount!,
    0
  )
  const lossByLocation = groupSum(
    approvedLossRows,
    (row) => row.pointOfSaleId,
    (row) => row.pointOfSaleName,
    (row) => row.lossAmount!
  )
  const lossByProduct = groupSum(
    approvedLossRows,
    (row) => row.productId,
    (row) => row.productName,
    (row) => row.lossAmount!
  )
  const lossByCategory = groupSum(
    approvedLossRows,
    (row) => row.writeOffCategoryId,
    (row) => row.writeOffCategoryName,
    (row) => row.lossAmount!
  )
  const lossTrend = []
  for (let offset = 0; offset < days; offset += 1) {
    const day = addUtcDays(currentStart, offset)
    const next = addUtcDays(day, 1)
    const loss = approvedLossRows
      .filter((row) => {
        const created = new Date(row.createdAt)
        return created >= day && created < next
      })
      .reduce((sum, row) => sum + row.lossAmount!, 0)
    lossTrend.push({ date: day.toISOString().slice(0, 10), loss })
  }
  const topChargedEmployeesByLoss = [
    ...approvedLossRows
      .filter((row) => row.deductionMode === "employee" && row.chargedEmployee)
      .reduce((map, row) => {
        const employee = row.chargedEmployee!
        const current = map.get(employee.id)
        map.set(employee.id, {
          id: employee.id,
          name: employee.name,
          loss: (current?.loss ?? 0) + row.lossAmount!,
        })
        return map
      }, new Map<string, { id: string; name: string; loss: number }>())
      .values(),
  ]
    .sort((a, b) => b.loss - a.loss)
    .slice(0, 8)

  const db = getServerDb()
  const activeBranches = await loadActivePosCatalog(db)
  const disproportionThreshold = getDisproportionThreshold()
  const disproportionFlags = detectBranchDisproportionFlags(
    currentRows,
    activeBranches,
    disproportionThreshold
  )

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
    totalLoss,
    previousTotalLoss,
    lossByLocation,
    lossByProduct,
    lossByCategory,
    lossTrend,
    topChargedEmployeesByLoss,
    disproportionFlags,
    disproportionThreshold,
  }
}

export async function getCatalogAdminData() {
  await requireAdmin("/admin/catalog")
  const db = getServerDb()
  const [posRows, categoryRows, productRows] = await Promise.all([
    db.select().from(pointOfSale).orderBy(asc(pointOfSale.name)),
    db
      .select()
      .from(productCategory)
      .orderBy(asc(productCategory.position), asc(productCategory.name)),
    db.select().from(product).orderBy(asc(product.name)),
  ])

  return {
    pointsOfSale: posRows.map((row) => ({
      id: row.id,
      name: row.name,
      address: row.address,
      city: row.city,
      isActive: row.isActive,
      updatedAt: row.updatedAt.toISOString(),
    })),
    categories: categoryRows.map((row) => ({
      id: row.id,
      name: row.name,
      position: row.position,
      updatedAt: row.updatedAt.toISOString(),
    })),
    products: productRows.map((row) => ({
      id: row.id,
      categoryId: row.categoryId,
      name: row.name,
      sku: row.sku,
      unit: row.unit,
      unitCost: row.unitCost,
      isActive: row.isActive,
      updatedAt: row.updatedAt.toISOString(),
    })),
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
    .returning({ id: writeOffRequest.id })

  if (requestRows.length === 0) {
    return actionError(
      "Заявка уже обработана. Обновите очередь, чтобы увидеть актуальный статус."
    )
  }

  if (input.status === "approved") {
    await syncWriteOffToIikoAction({ requestId: input.requestId })
  }

  return actionOk(requestRows[0])
}

export async function syncWriteOffToIikoAction(input: SyncWriteOffToIikoInput) {
  await requireReviewer("/review/write-offs")
  const db = getServerDb()
  const rows = await loadRequests(input.requestId)
  const request = rows.at(0)

  if (!request) {
    return actionError("Заявка больше не существует.")
  }
  if (request.status !== "approved") {
    return actionError("В iiko можно отправить только одобренные заявки.")
  }
  if (request.iikoSyncStatus === "synced") {
    return actionError("Заявка уже синхронизирована с iiko.")
  }

  try {
    const { documentId, payload } = await createIikoWriteOffDocument({
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

    await db
      .update(writeOffRequest)
      .set({
        iikoSyncStatus: "synced",
        iikoDocumentId: documentId,
        updatedAt: new Date(),
      })
      .where(eq(writeOffRequest.id, request.id))

    return actionOk({ documentId, payload })
  } catch (error) {
    console.error("Failed to sync write-off to iiko:", error)
    await db
      .update(writeOffRequest)
      .set({ iikoSyncStatus: "failed", updatedAt: new Date() })
      .where(eq(writeOffRequest.id, request.id))
    return actionError(
      "iiko отклонил акт. Попробуйте ещё раз через некоторое время."
    )
  }
}

export async function setStaffRoleAction(input: SetStaffRoleInput) {
  const context = await requireAdmin("/admin")
  const db = getServerDb()

  if (input.userId === context.user.id && input.role !== "admin") {
    return actionError("Нельзя снять с себя права администратора.")
  }

  const targetRows = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.id, input.userId))
    .limit(1)
  if (targetRows.length === 0) {
    return actionError("Этот сотрудник больше не существует.")
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
    return actionError("Этот табельный номер уже используется.")
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

export async function upsertPointOfSaleAction(input: UpsertPointOfSaleInput) {
  await requireAdmin("/admin/catalog")
  const db = getServerDb()
  const now = new Date()

  if (input.id) {
    const updated = await db
      .update(pointOfSale)
      .set({
        name: input.name,
        address: input.address,
        city: input.city,
        isActive: input.isActive,
        updatedAt: now,
      })
      .where(eq(pointOfSale.id, input.id))
      .returning({ id: pointOfSale.id })

    if (updated.length === 0) {
      return actionError("Точка продаж не найдена.")
    }

    return actionOk({ id: updated[0].id })
  }

  const inserted = await db
    .insert(pointOfSale)
    .values({
      name: input.name,
      address: input.address,
      city: input.city,
      isActive: input.isActive,
    })
    .returning({ id: pointOfSale.id })

  return actionOk({ id: inserted[0].id })
}

export async function upsertProductCategoryAction(
  input: UpsertProductCategoryInput
) {
  await requireAdmin("/admin/catalog")
  const db = getServerDb()
  const now = new Date()

  if (input.id) {
    const updated = await db
      .update(productCategory)
      .set({
        name: input.name,
        position: input.position,
        updatedAt: now,
      })
      .where(eq(productCategory.id, input.id))
      .returning({ id: productCategory.id })

    if (updated.length === 0) {
      return actionError("Категория продуктов не найдена.")
    }

    return actionOk({ id: updated[0].id })
  }

  const inserted = await db
    .insert(productCategory)
    .values({
      name: input.name,
      position: input.position,
    })
    .returning({ id: productCategory.id })

  return actionOk({ id: inserted[0].id })
}

export async function upsertProductAction(input: UpsertProductInput) {
  await requireAdmin("/admin/catalog")
  const db = getServerDb()
  const now = new Date()

  const categoryRows = await db
    .select({ id: productCategory.id })
    .from(productCategory)
    .where(eq(productCategory.id, input.categoryId))
    .limit(1)
  if (categoryRows.length === 0) {
    return actionError("Выберите существующую категорию.")
  }

  if (input.id) {
    const updated = await db
      .update(product)
      .set({
        categoryId: input.categoryId,
        name: input.name,
        sku: input.sku,
        unit: input.unit,
        unitCost: input.unitCost ?? null,
        isActive: input.isActive,
        updatedAt: now,
      })
      .where(eq(product.id, input.id))
      .returning({ id: product.id })

    if (updated.length === 0) {
      return actionError("Продукт не найден.")
    }

    return actionOk({ id: updated[0].id })
  }

  const inserted = await db
    .insert(product)
    .values({
      categoryId: input.categoryId,
      name: input.name,
      sku: input.sku,
      unit: input.unit,
      unitCost: input.unitCost ?? null,
      isActive: input.isActive,
    })
    .returning({ id: product.id })

  return actionOk({ id: inserted[0].id })
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
        unitCost: product.unitCost,
        categoryName: productCategory.name,
      })
      .from(product)
      .innerJoin(productCategory, eq(product.categoryId, productCategory.id))
      .where(inArray(product.id, productIds)),
    db
      .select({
        id: pointOfSale.id,
        name: pointOfSale.name,
        city: pointOfSale.city,
      })
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
      productName: productRow?.name ?? "Неизвестный продукт",
      productSku: productRow?.sku ?? "",
      unit: productRow?.unit ?? "pcs",
      categoryName: productRow?.categoryName ?? "",
      pointOfSaleId: row.pointOfSaleId,
      pointOfSaleName:
        posById.get(row.pointOfSaleId)?.name ?? row.pointOfSaleId,
      pointOfSaleCity: posById.get(row.pointOfSaleId)?.city ?? "",
      writeOffCategoryId: row.writeOffCategoryId,
      writeOffCategoryName:
        categoryById.get(row.writeOffCategoryId)?.name ?? "",
      quantity: row.quantity,
      unitCost: productRow?.unitCost ?? null,
      lossAmount: computeLossAmount(row.quantity, productRow?.unitCost),
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
      mlClassification: row.mlClassification,
      createdAt: row.createdAt.toISOString(),
      reviewedAt: row.reviewedAt?.toISOString() ?? null,
    }
  })
}

const DISPROPORTION_MIN_TOTAL = 3

function getDisproportionThreshold() {
  const raw = env.WRITE_OFF_DISPROPORTION_THRESHOLD
  const parsed = raw ? Number(raw) : 50
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 50
}

type WriteOffRequestRow = Awaited<ReturnType<typeof loadRequests>>[number]

export type BranchDisproportionFlag = {
  pointOfSaleId: string
  pointOfSaleName: string
  productId: string
  productName: string
  writeOffCategoryId: string
  writeOffCategoryName: string
  label: string
  count: number
  averageCount: number
  percentAboveAverage: number
}

function detectBranchDisproportionFlags(
  rows: WriteOffRequestRow[],
  activeBranches: Array<{ id: string; name: string }>,
  thresholdPercent: number
): BranchDisproportionFlag[] {
  if (activeBranches.length < 2) return []

  const comboMap = new Map<
    string,
    {
      productId: string
      productName: string
      writeOffCategoryId: string
      writeOffCategoryName: string
      branchCounts: Map<string, number>
    }
  >()

  for (const row of rows) {
    const key = `${row.productId}:${row.writeOffCategoryId}`
    const current = comboMap.get(key)
    if (current) {
      current.branchCounts.set(
        row.pointOfSaleId,
        (current.branchCounts.get(row.pointOfSaleId) ?? 0) + 1
      )
    } else {
      comboMap.set(key, {
        productId: row.productId,
        productName: row.productName,
        writeOffCategoryId: row.writeOffCategoryId,
        writeOffCategoryName: row.writeOffCategoryName,
        branchCounts: new Map([[row.pointOfSaleId, 1]]),
      })
    }
  }

  const flags: BranchDisproportionFlag[] = []
  const branchCount = activeBranches.length

  for (const combo of comboMap.values()) {
    const totalCount = [...combo.branchCounts.values()].reduce(
      (sum, count) => sum + count,
      0
    )
    if (totalCount < DISPROPORTION_MIN_TOTAL) continue

    const averageCount = totalCount / branchCount
    if (averageCount === 0) continue

    const threshold = averageCount * (1 + thresholdPercent / 100)
    const label = `${combo.productName} – ${combo.writeOffCategoryName}`

    for (const branch of activeBranches) {
      const count = combo.branchCounts.get(branch.id) ?? 0
      if (count <= threshold) continue

      flags.push({
        pointOfSaleId: branch.id,
        pointOfSaleName: branch.name,
        productId: combo.productId,
        productName: combo.productName,
        writeOffCategoryId: combo.writeOffCategoryId,
        writeOffCategoryName: combo.writeOffCategoryName,
        label,
        count,
        averageCount: Math.round(averageCount * 10) / 10,
        percentAboveAverage: Math.round(
          ((count - averageCount) / averageCount) * 100
        ),
      })
    }
  }

  return flags.sort((a, b) => b.percentAboveAverage - a.percentAboveAverage)
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

function groupSum<T>(
  rows: T[],
  getId: (row: T) => string,
  getName: (row: T) => string,
  getValue: (row: T) => number
) {
  const map = new Map<string, { id: string; name: string; loss: number }>()
  for (const row of rows) {
    const id = getId(row)
    const current = map.get(id)
    map.set(id, {
      id,
      name: getName(row),
      loss: (current?.loss ?? 0) + getValue(row),
    })
  }
  return [...map.values()].sort((a, b) => b.loss - a.loss)
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

async function loadActivePosCatalog(db: ReturnType<typeof getServerDb>) {
  return db
    .select({
      id: pointOfSale.id,
      name: pointOfSale.name,
      city: pointOfSale.city,
    })
    .from(pointOfSale)
    .where(eq(pointOfSale.isActive, true))
    .orderBy(asc(pointOfSale.city), asc(pointOfSale.name))
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
export type CatalogAdminData = Awaited<ReturnType<typeof getCatalogAdminData>>
