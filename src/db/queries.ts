import { eq } from "drizzle-orm"

import type { AppDb } from "@/db"
import { staffProfile } from "@/db/schema"
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
