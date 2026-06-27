import type {
  iikoSyncStatuses,
  userRoles,
  writeOffDeductionModes,
  writeOffStatuses,
} from "@/db/schema"
import {
  demoStoreIds,
  seedPointsOfSale as importedPointsOfSale,
} from "@/db/seed-stores"

type UserRole = (typeof userRoles)[number]
type DeductionMode = (typeof writeOffDeductionModes)[number]
type WriteOffStatus = (typeof writeOffStatuses)[number]
type IikoSyncStatus = (typeof iikoSyncStatuses)[number]

export interface SeedPointOfSale {
  id: string
  name: string
  address: string
  city: string
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
  unitCost: number | null
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

export const seedPointsOfSale: SeedPointOfSale[] = [...importedPointsOfSale]

const {
  kuueva,
  mega,
  ritzPalace,
  aport,
  megaSilkWay,
  cityMall,
  tsumKar,
  greenPlaza,
} = demoStoreIds

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
    unitCost: 120,
  },
  {
    id: "prod-patty",
    categoryId: "cat-meat",
    name: "Говяжья котлета",
    sku: "MEA-PAT",
    unit: "pcs",
    unitCost: 450,
  },
  {
    id: "prod-bun",
    categoryId: "cat-bakery",
    name: "Булочка для бургера",
    sku: "BAK-BUN",
    unit: "pcs",
    unitCost: 85,
  },
  {
    id: "prod-fries",
    categoryId: "cat-sides",
    name: "Картофель фри",
    sku: "SID-FRY",
    unit: "portion",
    unitCost: 180,
  },
  {
    id: "prod-shake",
    categoryId: "cat-other",
    name: "Смесь для молочного коктейля",
    sku: "OTH-SHK",
    unit: "l",
    unitCost: 950,
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
    defaultPointOfSaleId: mega,
  },
  {
    id: "usr_reviewer_dana",
    name: "Дана",
    email: "reviewer@burgeri.kz",
    role: "reviewer",
    username: null,
    displayUsername: null,
    defaultPointOfSaleId: mega,
  },
  {
    id: "usr_reviewer_marat",
    name: "Марат",
    email: "manager@burgeri.kz",
    role: "reviewer",
    username: null,
    displayUsername: null,
    defaultPointOfSaleId: cityMall,
  },
  {
    id: "usr_reviewer_ainur",
    name: "Айнур",
    email: "reviewer-astana@burgeri.kz",
    role: "reviewer",
    username: null,
    displayUsername: null,
    defaultPointOfSaleId: megaSilkWay,
  },
  {
    id: "usr_emp_aigerim",
    name: "Айгерим Сатбек",
    email: "emp-1001@staff.burgeri.local",
    role: "employee",
    username: "emp-1001",
    displayUsername: "EMP-1001",
    defaultPointOfSaleId: kuueva,
  },
  {
    id: "usr_emp_daulet",
    name: "Даулет Нурлан",
    email: "emp-1002@staff.burgeri.local",
    role: "employee",
    username: "emp-1002",
    displayUsername: "EMP-1002",
    defaultPointOfSaleId: mega,
  },
  {
    id: "usr_emp_nurlan",
    name: "Нурлан Асанов",
    email: "emp-1003@staff.burgeri.local",
    role: "employee",
    username: "emp-1003",
    displayUsername: "EMP-1003",
    defaultPointOfSaleId: ritzPalace,
  },
  {
    id: "usr_emp_saule",
    name: "Сауле Ербол",
    email: "emp-1004@staff.burgeri.local",
    role: "employee",
    username: "emp-1004",
    displayUsername: "EMP-1004",
    defaultPointOfSaleId: aport,
  },
  {
    id: "usr_emp_timur",
    name: "Тимур Жаксылыков",
    email: "emp-1005@staff.burgeri.local",
    role: "employee",
    username: "emp-1005",
    displayUsername: "EMP-1005",
    defaultPointOfSaleId: megaSilkWay,
  },
  {
    id: "usr_emp_gulnara",
    name: "Гульнара Касымова",
    email: "emp-1006@staff.burgeri.local",
    role: "employee",
    username: "emp-1006",
    displayUsername: "EMP-1006",
    defaultPointOfSaleId: cityMall,
  },
  {
    id: "usr_emp_erlan",
    name: "Ерлан Бекенов",
    email: "emp-1007@staff.burgeri.local",
    role: "employee",
    username: "emp-1007",
    displayUsername: "EMP-1007",
    defaultPointOfSaleId: tsumKar,
  },
  {
    id: "usr_emp_anel",
    name: "Анель Тлеуберген",
    email: "emp-1008@staff.burgeri.local",
    role: "employee",
    username: "emp-1008",
    displayUsername: "EMP-1008",
    defaultPointOfSaleId: greenPlaza,
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
    pointOfSaleId: kuueva,
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
    pointOfSaleId: mega,
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
    pointOfSaleId: ritzPalace,
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
    pointOfSaleId: aport,
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
    pointOfSaleId: kuueva,
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
    pointOfSaleId: mega,
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
    pointOfSaleId: ritzPalace,
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
    pointOfSaleId: aport,
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
    pointOfSaleId: kuueva,
    productId: "prod-fries",
    writeOffCategoryId: "woc-overcooked",
    quantity: 3,
    deductionMode: "none",
    deductionEmployeeId: null,
    comment:
      "Масло во фритюре перегрелось и сожгло целую корзину картофеля фри.",
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
    pointOfSaleId: mega,
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
  {
    id: "wo_0011",
    requestNumber: "WR-00011",
    submitterId: "usr_emp_timur",
    pointOfSaleId: megaSilkWay,
    productId: "prod-bun",
    writeOffCategoryId: "woc-damaged",
    quantity: 6,
    deductionMode: "none",
    deductionEmployeeId: null,
    comment: "Коробка с булочками помялась при разгрузке утренней поставки.",
    status: "approved",
    reviewerId: "usr_reviewer_ainur",
    reviewComment: "Повреждение подтверждено, списание принято.",
    reviewedAt: daysAgo(7, 10),
    iikoSyncStatus: "synced",
    iikoDocumentId: "iiko-wo_0011-demo11",
    createdAt: daysAgo(7, 9),
  },
  {
    id: "wo_0012",
    requestNumber: "WR-00012",
    submitterId: "usr_emp_gulnara",
    pointOfSaleId: cityMall,
    productId: "prod-patty",
    writeOffCategoryId: "woc-overcooked",
    quantity: 4,
    deductionMode: "employee",
    deductionEmployeeId: "usr_emp_gulnara",
    comment: "Котлеты пересушили на гриле в вечерний час-пик.",
    status: "approved",
    reviewerId: "usr_reviewer_marat",
    reviewComment: "Принято, проведён инструктаж по таймеру жарки.",
    reviewedAt: daysAgo(5, 17),
    iikoSyncStatus: "synced",
    iikoDocumentId: "iiko-wo_0012-demo12",
    createdAt: daysAgo(5, 16),
  },
  {
    id: "wo_0013",
    requestNumber: "WR-00013",
    submitterId: "usr_emp_erlan",
    pointOfSaleId: tsumKar,
    productId: "prod-tomato",
    writeOffCategoryId: "woc-spoiled",
    quantity: 5,
    deductionMode: "none",
    deductionEmployeeId: null,
    comment: "Помидоры оказались мягкими и потемневшими после хранения.",
    status: "pending",
    reviewerId: null,
    reviewComment: null,
    reviewedAt: null,
    iikoSyncStatus: "not_started",
    iikoDocumentId: null,
    createdAt: daysAgo(2, 14),
  },
  {
    id: "wo_0014",
    requestNumber: "WR-00014",
    submitterId: "usr_emp_anel",
    pointOfSaleId: greenPlaza,
    productId: "prod-fries",
    writeOffCategoryId: "woc-dropped",
    quantity: 1,
    deductionMode: "employee",
    deductionEmployeeId: "usr_emp_anel",
    comment: "Порция картофеля фри упала при передаче заказа в зал.",
    status: "approved",
    reviewerId: "usr_reviewer_dana",
    reviewComment: "Санитарное списание подтверждено.",
    reviewedAt: daysAgo(4, 13),
    iikoSyncStatus: "queued",
    iikoDocumentId: null,
    createdAt: daysAgo(4, 12),
  },
  {
    id: "wo_0015",
    requestNumber: "WR-00015",
    submitterId: "usr_emp_timur",
    pointOfSaleId: megaSilkWay,
    productId: "prod-shake",
    writeOffCategoryId: "woc-expired",
    quantity: 0.8,
    deductionMode: "none",
    deductionEmployeeId: null,
    comment:
      "Смесь для коктейля просрочена — срок годности истёк вчера вечером.",
    status: "pending",
    reviewerId: null,
    reviewComment: null,
    reviewedAt: null,
    iikoSyncStatus: "not_started",
    iikoDocumentId: null,
    createdAt: daysAgo(1, 8),
  },
  {
    id: "wo_0016",
    requestNumber: "WR-00016",
    submitterId: "usr_emp_gulnara",
    pointOfSaleId: cityMall,
    productId: "prod-bun",
    writeOffCategoryId: "woc-other",
    quantity: 3,
    deductionMode: "none",
    deductionEmployeeId: null,
    comment: "Булочки испортились из-за сбоя холодильника ночью.",
    status: "pending",
    reviewerId: null,
    reviewComment: null,
    reviewedAt: null,
    iikoSyncStatus: "not_started",
    iikoDocumentId: null,
    createdAt: daysAgo(0, 9),
  },
  {
    id: "wo_0017",
    requestNumber: "WR-00017",
    submitterId: "usr_emp_erlan",
    pointOfSaleId: tsumKar,
    productId: "prod-patty",
    writeOffCategoryId: "woc-dropped",
    quantity: 2,
    deductionMode: "employee",
    deductionEmployeeId: "usr_emp_erlan",
    comment: "Две котлеты упали на пол при сборке комбо-набора.",
    status: "rejected",
    reviewerId: "usr_reviewer_marat",
    reviewComment:
      "Недостаточно данных — укажите точное время и приложите фото.",
    reviewedAt: daysAgo(3, 11),
    iikoSyncStatus: "not_started",
    iikoDocumentId: null,
    createdAt: daysAgo(3, 10),
  },
]
