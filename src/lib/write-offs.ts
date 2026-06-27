import type {
  iikoSyncStatuses,
  userRoles,
  writeOffDeductionModes,
  writeOffStatuses,
} from "@/db/schema"

export type UserRole = (typeof userRoles)[number]
export type WriteOffStatus = (typeof writeOffStatuses)[number]
export type WriteOffDeductionMode = (typeof writeOffDeductionModes)[number]
export type IikoSyncStatus = (typeof iikoSyncStatuses)[number]

export const userRoleLabels: Record<UserRole, string> = {
  employee: "Employee",
  reviewer: "Reviewer",
  admin: "Admin",
}

export const deductionModeLabels: Record<WriteOffDeductionMode, string> = {
  none: "No employee deduction",
  employee: "Deduct from employee",
}

export const writeOffStatusLabels: Record<WriteOffStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
}

export const iikoSyncStatusLabels: Record<IikoSyncStatus, string> = {
  not_started: "Not started",
  queued: "Queued for iiko",
  syncing: "Sending to iiko",
  synced: "Synced to iiko",
  failed: "iiko sync failed",
}

// Permissions advertised to the mobile app via /api/mobile/me.
export const mobilePermissions = [
  "writeoff.catalog.read",
  "writeoff.photo.upload",
  "writeoff.request.create",
  "writeoff.request.read.own",
] as const

export function formatQuantity(quantity: number, unit?: string | null) {
  const value = Number.isInteger(quantity)
    ? String(quantity)
    : quantity.toFixed(2).replace(/\.?0+$/, "")
  return unit ? `${value} ${unit}` : value
}
