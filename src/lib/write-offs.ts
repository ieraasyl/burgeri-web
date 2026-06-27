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
  employee: "Сотрудник",
  reviewer: "Ревьюер",
  admin: "Администратор",
}

export const deductionModeLabels: Record<WriteOffDeductionMode, string> = {
  none: "Без удержания с сотрудника",
  employee: "Удержать с сотрудника",
}

export const writeOffStatusLabels: Record<WriteOffStatus, string> = {
  pending: "На рассмотрении",
  approved: "Одобрено",
  rejected: "Отклонено",
}

export const iikoSyncStatusLabels: Record<IikoSyncStatus, string> = {
  not_started: "Не начато",
  queued: "В очереди на iiko",
  synced: "Отправлено в iiko",
  failed: "Ошибка синхронизации с iiko",
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

export function computeLossAmount(
  quantity: number,
  unitCost: number | null | undefined
): number | null {
  if (unitCost == null || unitCost <= 0) {
    return null
  }
  return quantity * unitCost
}

const moneyFormatter = new Intl.NumberFormat("kk-KZ", {
  style: "currency",
  currency: "KZT",
  maximumFractionDigits: 0,
})

export function formatMoney(amount: number | null | undefined) {
  if (amount == null) {
    return "—"
  }
  return moneyFormatter.format(amount)
}
