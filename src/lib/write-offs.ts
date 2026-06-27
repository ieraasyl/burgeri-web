import type {
  iikoSyncStatuses,
  userRoles,
  writeOffDeductionTypes,
  writeOffProductTypes,
  writeOffStatuses,
} from "@/db/schema"

export type UserRole = (typeof userRoles)[number]

export const userRoleLabels: Record<UserRole, string> = {
  employee: "Employee",
  reviewer: "Reviewer",
  admin: "Admin",
}

export const restaurantLocations = [
  { id: "abai", name: "Burgeri · Abai" },
  { id: "mega-almaty", name: "Burgeri · MEGA Almaty" },
  { id: "dostyk-plaza", name: "Burgeri · Dostyk Plaza" },
  { id: "airport", name: "Burgeri · Almaty Airport" },
] as const
export const restaurantLocationIds = [
  "abai",
  "mega-almaty",
  "dostyk-plaza",
  "airport",
] as const

export type RestaurantLocationId = (typeof restaurantLocations)[number]["id"]
export type WriteOffProductType = (typeof writeOffProductTypes)[number]
export type WriteOffDeductionType = (typeof writeOffDeductionTypes)[number]
export type WriteOffStatus = (typeof writeOffStatuses)[number]
export type IikoSyncStatus = (typeof iikoSyncStatuses)[number]

export const productTypeLabels: Record<WriteOffProductType, string> = {
  tomatoes: "Tomatoes",
  patty: "Patty",
  bun: "Bun",
  fries: "Fries",
  other: "Other product",
}

export const deductionTypeLabels: Record<WriteOffDeductionType, string> = {
  company: "No employee deduction",
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
  synced: "Synced to iiko",
  failed: "iiko sync failed",
}

export function getLocationName(locationId: string) {
  return (
    restaurantLocations.find((location) => location.id === locationId)?.name ??
    locationId
  )
}
