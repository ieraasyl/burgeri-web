import { asc, eq } from "drizzle-orm"

import type { AppDb } from "@/db"
import { user } from "@/db/auth-schema"
import {
  pointOfSale,
  product,
  productCategory,
  staffProfile,
  writeOffCategory,
} from "@/db/schema"
import type { userRoles } from "@/db/schema"

export type UserRole = (typeof userRoles)[number]
export type StaffProfile = typeof staffProfile.$inferSelect

export async function getStaffProfile(db: AppDb, userId: string) {
  const profiles = await db
    .select()
    .from(staffProfile)
    .where(eq(staffProfile.userId, userId))
    .limit(1)

  return profiles.at(0) ?? null
}

// Guarantee a profile row exists for an authenticated user, defaulting new
// sign-ins to the `employee` role so role checks have something to read.
export async function ensureStaffProfile(db: AppDb, userId: string) {
  const existing = await getStaffProfile(db, userId)

  if (existing) {
    return existing
  }

  await db.insert(staffProfile).values({ userId }).onConflictDoNothing()

  return getStaffProfile(db, userId)
}

export async function setStaffRole(
  db: AppDb,
  input: { userId: string; role: UserRole }
) {
  const now = new Date()

  await db
    .insert(staffProfile)
    .values({ userId: input.userId, role: input.role })
    .onConflictDoUpdate({
      target: staffProfile.userId,
      set: { role: input.role, updatedAt: now },
    })

  return getStaffProfile(db, input.userId)
}

export async function listProductCategories(db: AppDb) {
  return db
    .select()
    .from(productCategory)
    .orderBy(asc(productCategory.position), asc(productCategory.name))
}

export async function listProducts(db: AppDb) {
  return db
    .select()
    .from(product)
    .where(eq(product.isActive, true))
    .orderBy(asc(product.name))
}

export async function listPointsOfSale(db: AppDb) {
  return db
    .select()
    .from(pointOfSale)
    .where(eq(pointOfSale.isActive, true))
    .orderBy(asc(pointOfSale.city), asc(pointOfSale.name))
}

export async function listWriteOffCategories(db: AppDb) {
  return db
    .select()
    .from(writeOffCategory)
    .orderBy(asc(writeOffCategory.position), asc(writeOffCategory.name))
}

export async function listEmployees(db: AppDb) {
  return db
    .select({
      id: user.id,
      employeeId: user.username,
      name: user.name,
      role: staffProfile.role,
    })
    .from(user)
    .innerJoin(staffProfile, eq(staffProfile.userId, user.id))
    .where(eq(staffProfile.role, "employee"))
    .orderBy(asc(user.name))
}
