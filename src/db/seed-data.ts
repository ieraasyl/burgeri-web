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
  {
    id: "pos-abai",
    name: "Burgeri · Абая",
    address: "пр. Абая, 10, Алматы",
  },
  {
    id: "pos-mega",
    name: "Burgeri · MEGA Алматы",
    address: "ул. Розыбакиева, 247, Алматы",
  },
  {
    id: "pos-dostyk",
    name: "Burgeri · Dostyk Plaza",
    address: "мкр. Самал-2, 16, Алматы",
  },
  {
    id: "pos-airport",
    name: "Burgeri · Аэропорт Алматы",
    address: "ул. Майлина, 2, Алматы",
  },
]

export const seedProductCategories: SeedProductCategory[] = [
  { id: "cat-vegetables", name: "Овощи", position: 1 },
  { id: "cat-meat", name: "Мясо", position: 2 },
  { id: "cat-bakery", name: "Выпечка", position: 3 },
  { id: "cat-sides", name: "Гарниры", position: 4 },
  { id: "cat-other", name: "Прочее", position: 5 },
]

export const seedProducts: SeedProduct[] = [
  {
    id: "prod-tomato",
    categoryId: "cat-vegetables",
    name: "Помидор",
    sku: "VEG-TOM",
    unit: "pcs",
  },
  {
    id: "prod-patty",
    categoryId: "cat-meat",
    name: "Говяжья котлета",
    sku: "MEA-PAT",
    unit: "pcs",
  },
  {
    id: "prod-bun",
    categoryId: "cat-bakery",
    name: "Булочка для бургера",
    sku: "BAK-BUN",
    unit: "pcs",
  },
  {
    id: "prod-fries",
    categoryId: "cat-sides",
    name: "Картофель фри",
    sku: "SID-FRY",
    unit: "portion",
  },
  {
    id: "prod-shake",
    categoryId: "cat-other",
    name: "Смесь для молочного коктейля",
    sku: "OTH-SHK",
    unit: "l",
  },
]

export const seedWriteOffCategories: SeedWriteOffCategory[] = [
  { id: "woc-spoiled", name: "Испорчено / переспелое", position: 1 },
  { id: "woc-damaged", name: "Повреждено на складе", position: 2 },
  { id: "woc-dropped", name: "Упало (санитарное)", position: 3 },
  { id: "woc-overcooked", name: "Пережарено", position: 4 },
  { id: "woc-expired", name: "Просрочено", position: 5 },
  { id: "woc-other", name: "Прочее", position: 6 },
]

export const seedUsers: SeedUser[] = [
  {
    id: "usr_admin",
    name: "Айбек",
    email: "admin@burgeri.kz",
    role: "admin",
    username: null,
    displayUsername: null,
    defaultPointOfSaleId: "pos-mega",
  },
  {
    id: "usr_reviewer_dana",
    name: "Дана",
    email: "reviewer@burgeri.kz",
    role: "reviewer",
    username: null,
    displayUsername: null,
    defaultPointOfSaleId: "pos-mega",
  },
  {
    id: "usr_reviewer_marat",
    name: "Марат",
    email: "manager@burgeri.kz",
    role: "reviewer",
    username: null,
    displayUsername: null,
    defaultPointOfSaleId: "pos-dostyk",
  },
  {
    id: "usr_emp_aigerim",
    name: "Айгерим Сатбек",
    email: "emp-1001@staff.burgeri.local",
    role: "employee",
    username: "emp-1001",
    displayUsername: "EMP-1001",
    defaultPointOfSaleId: "pos-abai",
  },
  {
    id: "usr_emp_daulet",
    name: "Даулет Нурлан",
    email: "emp-1002@staff.burgeri.local",
    role: "employee",
    username: "emp-1002",
    displayUsername: "EMP-1002",
    defaultPointOfSaleId: "pos-mega",
  },
  {
    id: "usr_emp_nurlan",
    name: "Нурлан Асанов",
    email: "emp-1003@staff.burgeri.local",
    role: "employee",
    username: "emp-1003",
    displayUsername: "EMP-1003",
    defaultPointOfSaleId: "pos-dostyk",
  },
  {
    id: "usr_emp_saule",
    name: "Сауле Ербол",
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
    requestNumber: "WR-00001",
    submitterId: "usr_emp_aigerim",
    pointOfSaleId: "pos-abai",
    productId: "prod-tomato",
    writeOffCategoryId: "woc-spoiled",
    quantity: 8,
    deductionMode: "none",
    deductionEmployeeId: null,
    comment:
      "Помидоры пришли переспелыми в утренней поставке, непригодны к использованию.",
    status: "approved",
    reviewerId: "usr_reviewer_dana",
    reviewComment: "Подтверждено со старшим утренней смены.",
    reviewedAt: daysAgo(11, 14),
    iikoSyncStatus: "synced",
    iikoDocumentId: "iiko-wo_0001-demo01",
    createdAt: daysAgo(12, 9),
  },
  {
    id: "wo_0002",
    requestNumber: "WR-00002",
    submitterId: "usr_emp_daulet",
    pointOfSaleId: "pos-mega",
    productId: "prod-patty",
    writeOffCategoryId: "woc-overcooked",
    quantity: 3,
    deductionMode: "employee",
    deductionEmployeeId: "usr_emp_daulet",
    comment: "Котлеты пережарили на гриле в обеденный час-пик.",
    status: "approved",
    reviewerId: "usr_reviewer_dana",
    reviewComment: "Принято, напоминание о времени жарки отправлено.",
    reviewedAt: daysAgo(10, 15),
    iikoSyncStatus: "synced",
    iikoDocumentId: "iiko-wo_0002-demo02",
    createdAt: daysAgo(10, 13),
  },
  {
    id: "wo_0003",
    requestNumber: "WR-00003",
    submitterId: "usr_emp_nurlan",
    pointOfSaleId: "pos-dostyk",
    productId: "prod-bun",
    writeOffCategoryId: "woc-damaged",
    quantity: 5,
    deductionMode: "none",
    deductionEmployeeId: null,
    comment: "Булочки помялись на складе, когда коробка упала с полки.",
    status: "rejected",
    reviewerId: "usr_reviewer_marat",
    reviewComment: "В следующий раз приложите более чёткое фото повреждения.",
    reviewedAt: daysAgo(9, 11),
    iikoSyncStatus: "not_started",
    iikoDocumentId: null,
    createdAt: daysAgo(9, 10),
  },
  {
    id: "wo_0004",
    requestNumber: "WR-00004",
    submitterId: "usr_emp_saule",
    pointOfSaleId: "pos-airport",
    productId: "prod-fries",
    writeOffCategoryId: "woc-dropped",
    quantity: 2,
    deductionMode: "employee",
    deductionEmployeeId: "usr_emp_saule",
    comment: "Порция картофеля фри упала на пол при сборке заказа.",
    status: "approved",
    reviewerId: "usr_reviewer_marat",
    reviewComment: "Подтверждено, небольшое количество.",
    reviewedAt: daysAgo(8, 16),
    iikoSyncStatus: "queued",
    iikoDocumentId: null,
    createdAt: daysAgo(8, 14),
  },
  {
    id: "wo_0005",
    requestNumber: "WR-00005",
    submitterId: "usr_emp_aigerim",
    pointOfSaleId: "pos-abai",
    productId: "prod-patty",
    writeOffCategoryId: "woc-dropped",
    quantity: 1,
    deductionMode: "none",
    deductionEmployeeId: null,
    comment:
      "Котлета упала при сборке, по санитарным правилам использовать нельзя.",
    status: "approved",
    reviewerId: "usr_reviewer_dana",
    reviewComment: "Санитарное списание принято.",
    reviewedAt: daysAgo(6, 12),
    iikoSyncStatus: "queued",
    iikoDocumentId: null,
    createdAt: daysAgo(6, 11),
  },
  {
    id: "wo_0006",
    requestNumber: "WR-00006",
    submitterId: "usr_emp_daulet",
    pointOfSaleId: "pos-mega",
    productId: "prod-tomato",
    writeOffCategoryId: "woc-spoiled",
    quantity: 6,
    deductionMode: "none",
    deductionEmployeeId: null,
    comment:
      "Нарезанные помидоры слишком долго лежали, больше не соответствуют стандартам.",
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
    requestNumber: "WR-00007",
    submitterId: "usr_emp_nurlan",
    pointOfSaleId: "pos-dostyk",
    productId: "prod-bun",
    writeOffCategoryId: "woc-expired",
    quantity: 4,
    deductionMode: "none",
    deductionEmployeeId: null,
    comment: "Булочки за ночь заветрелись, пакет по ошибке оставили открытым.",
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
    requestNumber: "WR-00008",
    submitterId: "usr_emp_saule",
    pointOfSaleId: "pos-airport",
    productId: "prod-shake",
    writeOffCategoryId: "woc-other",
    quantity: 1.5,
    deductionMode: "employee",
    deductionEmployeeId: "usr_emp_saule",
    comment:
      "Смесь для молочного коктейля пролилась — крышка была плохо закреплена.",
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
    requestNumber: "WR-00009",
    submitterId: "usr_emp_aigerim",
    pointOfSaleId: "pos-abai",
    productId: "prod-fries",
    writeOffCategoryId: "woc-overcooked",
    quantity: 3,
    deductionMode: "none",
    deductionEmployeeId: null,
    comment: "Масло во фритюре перегрелось и сожгло целую корзину картофеля фри.",
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
    requestNumber: "WR-00010",
    submitterId: "usr_emp_daulet",
    pointOfSaleId: "pos-mega",
    productId: "prod-patty",
    writeOffCategoryId: "woc-overcooked",
    quantity: 2,
    deductionMode: "employee",
    deductionEmployeeId: "usr_emp_daulet",
    comment: "Две котлеты слишком долго оставили на гриле и полностью высохли.",
    status: "pending",
    reviewerId: null,
    reviewComment: null,
    reviewedAt: null,
    iikoSyncStatus: "not_started",
    iikoDocumentId: null,
    createdAt: daysAgo(0, 13),
  },
]
