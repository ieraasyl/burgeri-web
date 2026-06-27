import "@tanstack/react-start/server-only"

import { and, count, desc, eq } from "drizzle-orm"

import { user } from "@/db/auth-schema"
import {
  ensureStaffProfile,
  listEmployees,
  listPointsOfSale,
  listProductCategories,
  listProducts,
  listWriteOffCategories,
} from "@/db/queries"
import {
  pointOfSale,
  product,
  writeOffCategory,
  writeOffRequest,
} from "@/db/schema"
import { getSession } from "@/lib/auth.server"
import { getServerDb } from "@/lib/db.server"
import { drivePhotoUrl } from "@/lib/gas.server"
import { mobilePermissions } from "@/lib/write-offs"
import type { SubmitWriteOffInput } from "@/lib/validation"

export class MobileApiError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message)
    this.name = "MobileApiError"
  }
}

export function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

export function mobileErrorResponse(error: unknown) {
  if (error instanceof MobileApiError) {
    return jsonResponse({ message: error.message }, error.status)
  }
  console.error("Mobile API error:", error)
  return jsonResponse({ message: "Internal server error." }, 500)
}

export interface MobileContext {
  db: ReturnType<typeof getServerDb>
  userId: string
  employeeId: string
  name: string
  role: string
}

// Authenticate a mobile request from the session cookie replayed by the
// better-auth expo client. Throws 401 when there is no valid session.
export async function requireMobileContext(
  request: Request
): Promise<MobileContext> {
  const session = await getSession(request)

  if (!session) {
    throw new MobileApiError("Сессия истекла. Войдите снова.", 401)
  }

  const db = getServerDb()
  const profile = await ensureStaffProfile(db, session.user.id)
  const rows = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      username: user.username,
      displayUsername: user.displayUsername,
    })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1)
  const row = rows.at(0)

  if (!row) {
    throw new MobileApiError("Учетная запись не найдена.", 401)
  }

  return {
    db,
    userId: row.id,
    employeeId: row.displayUsername ?? row.username ?? row.email,
    name: row.name,
    role: profile?.role ?? "employee",
  }
}

export function buildMobileSession(context: MobileContext) {
  return {
    employee: {
      id: context.userId,
      employeeId: context.employeeId,
      name: context.name,
      role: context.role,
    },
    permissions: [...mobilePermissions],
    issuedAt: new Date().toISOString(),
  }
}

export async function getMobileProductCategories(context: MobileContext) {
  return (await listProductCategories(context.db)).map((row) => ({
    id: row.id,
    name: row.name,
  }))
}

export async function getMobileProducts(context: MobileContext) {
  return (await listProducts(context.db)).map((row) => ({
    id: row.id,
    categoryId: row.categoryId,
    name: row.name,
    sku: row.sku,
    unit: row.unit,
  }))
}

export async function getMobilePointsOfSale(context: MobileContext) {
  return (await listPointsOfSale(context.db)).map((row) => ({
    id: row.id,
    name: row.name,
    address: row.address,
  }))
}

export async function getMobileWriteOffCategories(context: MobileContext) {
  return (await listWriteOffCategories(context.db)).map((row) => ({
    id: row.id,
    name: row.name,
  }))
}

export async function getMobileEmployees(context: MobileContext) {
  return (await listEmployees(context.db)).map((row) => ({
    id: row.id,
    employeeId: row.employeeId ?? "",
    name: row.name,
    role: row.role,
  }))
}

function toMobileRequest(row: typeof writeOffRequest.$inferSelect) {
  const photoUrl =
    row.photoUrl ??
    (row.photoFileId ? drivePhotoUrl(row.photoFileId) : undefined)
  return {
    id: row.id,
    requestNumber: row.requestNumber,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    createdByEmployeeId: row.submitterId,
    productId: row.productId,
    quantity: row.quantity,
    pointOfSaleId: row.pointOfSaleId,
    deductionMode: row.deductionMode,
    deductionEmployeeId: row.deductionEmployeeId,
    writeOffCategoryId: row.writeOffCategoryId,
    comment: row.comment,
    photoFileId: row.photoFileId ?? undefined,
    photoUrl,
    photoUri: photoUrl,
  }
}

export async function listMyWriteOffs(context: MobileContext) {
  const rows = await context.db
    .select()
    .from(writeOffRequest)
    .where(eq(writeOffRequest.submitterId, context.userId))
    .orderBy(desc(writeOffRequest.createdAt))

  return rows.map(toMobileRequest)
}

export async function getMyWriteOff(context: MobileContext, id: string) {
  const rows = await context.db
    .select()
    .from(writeOffRequest)
    .where(
      and(
        eq(writeOffRequest.id, id),
        eq(writeOffRequest.submitterId, context.userId)
      )
    )
    .limit(1)
  const row = rows.at(0)

  if (!row) {
    throw new MobileApiError("Заявка не найдена.", 404)
  }

  return toMobileRequest(row)
}

async function generateRequestNumber(db: MobileContext["db"]) {
  const [{ value }] = await db.select({ value: count() }).from(writeOffRequest)
  return `WR-${String(value + 1).padStart(5, "0")}`
}

export async function submitWriteOff(
  context: MobileContext,
  input: SubmitWriteOffInput
) {
  const { db } = context

  const productRows = await db
    .select({ id: product.id })
    .from(product)
    .where(and(eq(product.id, input.productId), eq(product.isActive, true)))
    .limit(1)
  const productRow = productRows.at(0)
  if (!productRow) {
    throw new MobileApiError("Выбранный продукт недоступен.", 400)
  }

  const posRows = await db
    .select({ id: pointOfSale.id })
    .from(pointOfSale)
    .where(
      and(
        eq(pointOfSale.id, input.pointOfSaleId),
        eq(pointOfSale.isActive, true)
      )
    )
    .limit(1)
  const posRow = posRows.at(0)
  if (!posRow) {
    throw new MobileApiError("Выбранная точка продаж недоступна.", 400)
  }

  const categoryRows = await db
    .select({ id: writeOffCategory.id })
    .from(writeOffCategory)
    .where(eq(writeOffCategory.id, input.writeOffCategoryId))
    .limit(1)
  const categoryRow = categoryRows.at(0)
  if (!categoryRow) {
    throw new MobileApiError("Выбранная категория недоступна.", 400)
  }

  if (input.deductionMode === "employee" && input.deductionEmployeeId) {
    const employeeRows = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.id, input.deductionEmployeeId))
      .limit(1)
    const employeeRow = employeeRows.at(0)
    if (!employeeRow) {
      throw new MobileApiError("Выбранный сотрудник недоступен.", 400)
    }
  }

  const requestNumber = await generateRequestNumber(db)
  const photoUrl = drivePhotoUrl(input.photoFileId)

  const [inserted] = await db
    .insert(writeOffRequest)
    .values({
      requestNumber,
      submitterId: context.userId,
      pointOfSaleId: input.pointOfSaleId,
      productId: input.productId,
      writeOffCategoryId: input.writeOffCategoryId,
      quantity: input.quantity,
      deductionMode: input.deductionMode,
      deductionEmployeeId:
        input.deductionMode === "employee"
          ? (input.deductionEmployeeId ?? null)
          : null,
      comment: input.comment,
      photoFileId: input.photoFileId,
      photoUrl,
    })
    .returning()

  return toMobileRequest(inserted)
}
