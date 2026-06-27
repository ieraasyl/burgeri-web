import type {
  iikoSyncStatuses,
  userRoles,
  writeOffDeductionTypes,
  writeOffProductTypes,
  writeOffStatuses,
} from "@/db/schema"

type UserRole = (typeof userRoles)[number]
type ProductType = (typeof writeOffProductTypes)[number]
type DeductionType = (typeof writeOffDeductionTypes)[number]
type WriteOffStatus = (typeof writeOffStatuses)[number]
type IikoSyncStatus = (typeof iikoSyncStatuses)[number]

export interface SeedUser {
  id: string
  name: string
  email: string
  role: UserRole
  defaultLocationId: string | null
}

export interface SeedWriteOff {
  id: string
  submitterId: string
  locationId: string
  productType: ProductType
  quantity: number
  deductionType: DeductionType
  chargedEmployeeId: string | null
  comment: string
  photoDataUrl: string
  status: WriteOffStatus
  reviewerId: string | null
  reviewComment: string | null
  reviewedAt: Date | null
  iikoSyncStatus: IikoSyncStatus
  iikoDocumentId: string | null
  createdAt: Date
}

// 1x1 transparent PNG — a valid placeholder that passes the photo validator and
// renders as a tile in the reviewer queue until real device photos arrive.
const PHOTO =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII="

export const seedUsers: SeedUser[] = [
  {
    id: "usr_admin",
    name: "Aibek Admin",
    email: "admin@burgeri.kz",
    role: "admin",
    defaultLocationId: "mega-almaty",
  },
  {
    id: "usr_reviewer_dana",
    name: "Dana Reviewer",
    email: "reviewer@burgeri.kz",
    role: "reviewer",
    defaultLocationId: "mega-almaty",
  },
  {
    id: "usr_reviewer_marat",
    name: "Marat Manager",
    email: "manager@burgeri.kz",
    role: "reviewer",
    defaultLocationId: "dostyk-plaza",
  },
  {
    id: "usr_emp_aigerim",
    name: "Aigerim Satbek",
    email: "aigerim@burgeri.kz",
    role: "employee",
    defaultLocationId: "abai",
  },
  {
    id: "usr_emp_daulet",
    name: "Daulet Nurlan",
    email: "daulet@burgeri.kz",
    role: "employee",
    defaultLocationId: "mega-almaty",
  },
  {
    id: "usr_emp_nurlan",
    name: "Nurlan Asanov",
    email: "nurlan@burgeri.kz",
    role: "employee",
    defaultLocationId: "dostyk-plaza",
  },
  {
    id: "usr_emp_saule",
    name: "Saule Erbol",
    email: "saule@burgeri.kz",
    role: "employee",
    defaultLocationId: "airport",
  },
]

function daysAgo(days: number, hour = 12) {
  const date = new Date()
  date.setDate(date.getDate() - days)
  date.setHours(hour, 0, 0, 0)
  return date
}

export const seedWriteOffs: SeedWriteOff[] = [
  {
    id: "wo_0001",
    submitterId: "usr_emp_aigerim",
    locationId: "abai",
    productType: "tomatoes",
    quantity: 8,
    deductionType: "company",
    chargedEmployeeId: null,
    comment: "Tomatoes arrived overripe in the morning delivery, not usable.",
    photoDataUrl: PHOTO,
    status: "approved",
    reviewerId: "usr_reviewer_dana",
    reviewComment: "Confirmed with the morning shift lead.",
    reviewedAt: daysAgo(11, 14),
    iikoSyncStatus: "synced",
    iikoDocumentId: "iiko-wo_0001-demo01",
    createdAt: daysAgo(12, 9),
  },
  {
    id: "wo_0002",
    submitterId: "usr_emp_daulet",
    locationId: "mega-almaty",
    productType: "patty",
    quantity: 3,
    deductionType: "employee",
    chargedEmployeeId: "usr_emp_daulet",
    comment: "Patties overcooked on the grill during the lunch rush.",
    photoDataUrl: PHOTO,
    status: "approved",
    reviewerId: "usr_reviewer_dana",
    reviewComment: "Accepted, reminder sent about grill timing.",
    reviewedAt: daysAgo(10, 15),
    iikoSyncStatus: "synced",
    iikoDocumentId: "iiko-wo_0002-demo02",
    createdAt: daysAgo(10, 13),
  },
  {
    id: "wo_0003",
    submitterId: "usr_emp_nurlan",
    locationId: "dostyk-plaza",
    productType: "bun",
    quantity: 5,
    deductionType: "company",
    chargedEmployeeId: null,
    comment: "Buns crushed in storage when a box fell from the shelf.",
    photoDataUrl: PHOTO,
    status: "rejected",
    reviewerId: "usr_reviewer_marat",
    reviewComment: "Please attach a clearer photo of the damage next time.",
    reviewedAt: daysAgo(9, 11),
    iikoSyncStatus: "not_started",
    iikoDocumentId: null,
    createdAt: daysAgo(9, 10),
  },
  {
    id: "wo_0004",
    submitterId: "usr_emp_saule",
    locationId: "airport",
    productType: "fries",
    quantity: 2,
    deductionType: "employee",
    chargedEmployeeId: "usr_emp_saule",
    comment: "Fries portion dropped on the floor while plating an order.",
    photoDataUrl: PHOTO,
    status: "approved",
    reviewerId: "usr_reviewer_marat",
    reviewComment: "Confirmed, minor amount.",
    reviewedAt: daysAgo(8, 16),
    iikoSyncStatus: "queued",
    iikoDocumentId: null,
    createdAt: daysAgo(8, 14),
  },
  {
    id: "wo_0005",
    submitterId: "usr_emp_aigerim",
    locationId: "abai",
    productType: "patty",
    quantity: 1,
    deductionType: "company",
    chargedEmployeeId: null,
    comment: "Patty fell during assembly, cannot be used per sanitary rules.",
    photoDataUrl: PHOTO,
    status: "approved",
    reviewerId: "usr_reviewer_dana",
    reviewComment: "Sanitary write-off accepted.",
    reviewedAt: daysAgo(6, 12),
    iikoSyncStatus: "queued",
    iikoDocumentId: null,
    createdAt: daysAgo(6, 11),
  },
  {
    id: "wo_0006",
    submitterId: "usr_emp_daulet",
    locationId: "mega-almaty",
    productType: "tomatoes",
    quantity: 6,
    deductionType: "company",
    chargedEmployeeId: null,
    comment: "Sliced tomatoes left out too long, no longer meet standards.",
    photoDataUrl: PHOTO,
    status: "pending",
    reviewerId: null,
    reviewComment: null,
    reviewedAt: null,
    iikoSyncStatus: "not_started",
    iikoDocumentId: null,
    createdAt: daysAgo(3, 10),
  },
  {
    id: "wo_0007",
    submitterId: "usr_emp_nurlan",
    locationId: "dostyk-plaza",
    productType: "bun",
    quantity: 4,
    deductionType: "company",
    chargedEmployeeId: null,
    comment: "Buns went stale overnight, the bag was left open by mistake.",
    photoDataUrl: PHOTO,
    status: "pending",
    reviewerId: null,
    reviewComment: null,
    reviewedAt: null,
    iikoSyncStatus: "not_started",
    iikoDocumentId: null,
    createdAt: daysAgo(2, 9),
  },
  {
    id: "wo_0008",
    submitterId: "usr_emp_saule",
    locationId: "airport",
    productType: "other",
    quantity: 1,
    deductionType: "employee",
    chargedEmployeeId: "usr_emp_saule",
    comment: "Milkshake mix spilled when the lid was not secured properly.",
    photoDataUrl: PHOTO,
    status: "pending",
    reviewerId: null,
    reviewComment: null,
    reviewedAt: null,
    iikoSyncStatus: "not_started",
    iikoDocumentId: null,
    createdAt: daysAgo(1, 18),
  },
  {
    id: "wo_0009",
    submitterId: "usr_emp_aigerim",
    locationId: "abai",
    productType: "fries",
    quantity: 3,
    deductionType: "company",
    chargedEmployeeId: null,
    comment: "Fryer oil overheated and burnt a full basket of fries.",
    photoDataUrl: PHOTO,
    status: "pending",
    reviewerId: null,
    reviewComment: null,
    reviewedAt: null,
    iikoSyncStatus: "not_started",
    iikoDocumentId: null,
    createdAt: daysAgo(0, 11),
  },
  {
    id: "wo_0010",
    submitterId: "usr_emp_daulet",
    locationId: "mega-almaty",
    productType: "patty",
    quantity: 2,
    deductionType: "employee",
    chargedEmployeeId: "usr_emp_daulet",
    comment: "Two patties left on the grill too long and dried out completely.",
    photoDataUrl: PHOTO,
    status: "pending",
    reviewerId: null,
    reviewComment: null,
    reviewedAt: null,
    iikoSyncStatus: "not_started",
    iikoDocumentId: null,
    createdAt: daysAgo(0, 13),
  },
]
