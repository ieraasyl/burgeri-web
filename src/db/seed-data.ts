import type {
  iikoSyncStatuses,
  userRoles,
  writeOffDeductionModes,
  writeOffStatuses,
} from "@/db/schema"

type UserRole = (typeof userRoles)[number]
type DeductionMode = (typeof writeOffDeductionModes)[number]
type WriteOffStatus = (typeof writeOffStatuses)[number]
type IikoSyncStatus = (typeof iikoSyncStatuses)[number]

export interface SeedPointOfSale {
  id: string
  name: string
  address: string
}
export interface SeedProductCategory {
  id: string
  name: string
  position: number
}
export interface SeedProduct {
  id: string
  categoryId: string
  name: string
  sku: string
  unit: string
}
export interface SeedWriteOffCategory {
  id: string
  name: string
  position: number
}
export interface SeedUser {
  id: string
  name: string
  email: string
  role: UserRole
  username: string | null
  displayUsername: string | null
  defaultPointOfSaleId: string | null
}
export interface SeedWriteOff {
  id: string
  requestNumber: string
  submitterId: string
  pointOfSaleId: string
  productId: string
  writeOffCategoryId: string
  quantity: number
  deductionMode: DeductionMode
  deductionEmployeeId: string | null
  comment: string
  status: WriteOffStatus
  reviewerId: string | null
  reviewComment: string | null
  reviewedAt: Date | null
  iikoSyncStatus: IikoSyncStatus
  iikoDocumentId: string | null
  createdAt: Date
}

export const seedPointsOfSale: SeedPointOfSale[] = [
  { id: "pos-abai", name: "Burgeri · Abai", address: "Abai Ave 10, Almaty" },
  {
    id: "pos-mega",
    name: "Burgeri · MEGA Almaty",
    address: "Rozybakiev St 247, Almaty",
  },
  {
    id: "pos-dostyk",
    name: "Burgeri · Dostyk Plaza",
    address: "Samal-2 16, Almaty",
  },
  {
    id: "pos-airport",
    name: "Burgeri · Almaty Airport",
    address: "Mailin St 2, Almaty",
  },
]

export const seedProductCategories: SeedProductCategory[] = [
  { id: "cat-vegetables", name: "Vegetables", position: 1 },
  { id: "cat-meat", name: "Meat", position: 2 },
  { id: "cat-bakery", name: "Bakery", position: 3 },
  { id: "cat-sides", name: "Sides", position: 4 },
  { id: "cat-other", name: "Other", position: 5 },
]

export const seedProducts: SeedProduct[] = [
  {
    id: "prod-tomato",
    categoryId: "cat-vegetables",
    name: "Tomato",
    sku: "VEG-TOM",
    unit: "pcs",
  },
  {
    id: "prod-patty",
    categoryId: "cat-meat",
    name: "Beef patty",
    sku: "MEA-PAT",
    unit: "pcs",
  },
  {
    id: "prod-bun",
    categoryId: "cat-bakery",
    name: "Burger bun",
    sku: "BAK-BUN",
    unit: "pcs",
  },
  {
    id: "prod-fries",
    categoryId: "cat-sides",
    name: "French fries",
    sku: "SID-FRY",
    unit: "portion",
  },
  {
    id: "prod-shake",
    categoryId: "cat-other",
    name: "Milkshake mix",
    sku: "OTH-SHK",
    unit: "l",
  },
]

export const seedWriteOffCategories: SeedWriteOffCategory[] = [
  { id: "woc-spoiled", name: "Spoiled / overripe", position: 1 },
  { id: "woc-damaged", name: "Damaged in storage", position: 2 },
  { id: "woc-dropped", name: "Dropped (sanitary)", position: 3 },
  { id: "woc-overcooked", name: "Overcooked", position: 4 },
  { id: "woc-expired", name: "Expired", position: 5 },
  { id: "woc-other", name: "Other", position: 6 },
]

export const seedUsers: SeedUser[] = [
  {
    id: "usr_admin",
    name: "Aibek Admin",
    email: "admin@burgeri.kz",
    role: "admin",
    username: null,
    displayUsername: null,
    defaultPointOfSaleId: "pos-mega",
  },
  {
    id: "usr_reviewer_dana",
    name: "Dana Reviewer",
    email: "reviewer@burgeri.kz",
    role: "reviewer",
    username: null,
    displayUsername: null,
    defaultPointOfSaleId: "pos-mega",
  },
  {
    id: "usr_reviewer_marat",
    name: "Marat Manager",
    email: "manager@burgeri.kz",
    role: "reviewer",
    username: null,
    displayUsername: null,
    defaultPointOfSaleId: "pos-dostyk",
  },
  {
    id: "usr_emp_aigerim",
    name: "Aigerim Satbek",
    email: "emp-1001@staff.burgeri.local",
    role: "employee",
    username: "emp-1001",
    displayUsername: "EMP-1001",
    defaultPointOfSaleId: "pos-abai",
  },
  {
    id: "usr_emp_daulet",
    name: "Daulet Nurlan",
    email: "emp-1002@staff.burgeri.local",
    role: "employee",
    username: "emp-1002",
    displayUsername: "EMP-1002",
    defaultPointOfSaleId: "pos-mega",
  },
  {
    id: "usr_emp_nurlan",
    name: "Nurlan Asanov",
    email: "emp-1003@staff.burgeri.local",
    role: "employee",
    username: "emp-1003",
    displayUsername: "EMP-1003",
    defaultPointOfSaleId: "pos-dostyk",
  },
  {
    id: "usr_emp_saule",
    name: "Saule Erbol",
    email: "emp-1004@staff.burgeri.local",
    role: "employee",
    username: "emp-1004",
    displayUsername: "EMP-1004",
    defaultPointOfSaleId: "pos-airport",
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
    requestNumber: "WO-0001",
    submitterId: "usr_emp_aigerim",
    pointOfSaleId: "pos-abai",
    productId: "prod-tomato",
    writeOffCategoryId: "woc-spoiled",
    quantity: 8,
    deductionMode: "none",
    deductionEmployeeId: null,
    comment: "Tomatoes arrived overripe in the morning delivery, not usable.",
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
    requestNumber: "WO-0002",
    submitterId: "usr_emp_daulet",
    pointOfSaleId: "pos-mega",
    productId: "prod-patty",
    writeOffCategoryId: "woc-overcooked",
    quantity: 3,
    deductionMode: "employee",
    deductionEmployeeId: "usr_emp_daulet",
    comment: "Patties overcooked on the grill during the lunch rush.",
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
    requestNumber: "WO-0003",
    submitterId: "usr_emp_nurlan",
    pointOfSaleId: "pos-dostyk",
    productId: "prod-bun",
    writeOffCategoryId: "woc-damaged",
    quantity: 5,
    deductionMode: "none",
    deductionEmployeeId: null,
    comment: "Buns crushed in storage when a box fell from the shelf.",
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
    requestNumber: "WO-0004",
    submitterId: "usr_emp_saule",
    pointOfSaleId: "pos-airport",
    productId: "prod-fries",
    writeOffCategoryId: "woc-dropped",
    quantity: 2,
    deductionMode: "employee",
    deductionEmployeeId: "usr_emp_saule",
    comment: "Fries portion dropped on the floor while plating an order.",
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
    requestNumber: "WO-0005",
    submitterId: "usr_emp_aigerim",
    pointOfSaleId: "pos-abai",
    productId: "prod-patty",
    writeOffCategoryId: "woc-dropped",
    quantity: 1,
    deductionMode: "none",
    deductionEmployeeId: null,
    comment: "Patty fell during assembly, cannot be used per sanitary rules.",
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
    requestNumber: "WO-0006",
    submitterId: "usr_emp_daulet",
    pointOfSaleId: "pos-mega",
    productId: "prod-tomato",
    writeOffCategoryId: "woc-spoiled",
    quantity: 6,
    deductionMode: "none",
    deductionEmployeeId: null,
    comment: "Sliced tomatoes left out too long, no longer meet standards.",
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
    requestNumber: "WO-0007",
    submitterId: "usr_emp_nurlan",
    pointOfSaleId: "pos-dostyk",
    productId: "prod-bun",
    writeOffCategoryId: "woc-expired",
    quantity: 4,
    deductionMode: "none",
    deductionEmployeeId: null,
    comment: "Buns went stale overnight, the bag was left open by mistake.",
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
    requestNumber: "WO-0008",
    submitterId: "usr_emp_saule",
    pointOfSaleId: "pos-airport",
    productId: "prod-shake",
    writeOffCategoryId: "woc-other",
    quantity: 1.5,
    deductionMode: "employee",
    deductionEmployeeId: "usr_emp_saule",
    comment: "Milkshake mix spilled when the lid was not secured properly.",
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
    requestNumber: "WO-0009",
    submitterId: "usr_emp_aigerim",
    pointOfSaleId: "pos-abai",
    productId: "prod-fries",
    writeOffCategoryId: "woc-overcooked",
    quantity: 3,
    deductionMode: "none",
    deductionEmployeeId: null,
    comment: "Fryer oil overheated and burnt a full basket of fries.",
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
    requestNumber: "WO-0010",
    submitterId: "usr_emp_daulet",
    pointOfSaleId: "pos-mega",
    productId: "prod-patty",
    writeOffCategoryId: "woc-overcooked",
    quantity: 2,
    deductionMode: "employee",
    deductionEmployeeId: "usr_emp_daulet",
    comment: "Two patties left on the grill too long and dried out completely.",
    status: "pending",
    reviewerId: null,
    reviewComment: null,
    reviewedAt: null,
    iikoSyncStatus: "not_started",
    iikoDocumentId: null,
    createdAt: daysAgo(0, 13),
  },
]
