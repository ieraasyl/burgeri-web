import type {
  iikoSyncStatuses,
  userRoles,
  writeOffDeductionModes,
  writeOffStatuses,
} from "@/db/schema"
import {
  seedStoreIds,
  seedPointsOfSale as importedPointsOfSale,
} from "@/db/seed-stores"
import type { WriteOffMlClassification } from "@/lib/burger-ml"

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
  photoFileId: string
  photoUrl: string
  status: WriteOffStatus
  reviewerId: string | null
  reviewComment: string | null
  reviewedAt: Date | null
  iikoSyncStatus: IikoSyncStatus
  iikoDocumentId: string | null
  mlClassification: WriteOffMlClassification
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
  shakhterov,
  orbit,
  forum,
  khanShatyr,
  north,
  diamondPlaza,
  mart,
  akzhar,
} = seedStoreIds

export const seedProductCategories: SeedProductCategory[] = [
  { id: "cat-vegetables", name: "Овощи и зелень", position: 1 },
  { id: "cat-meat", name: "Мясо и полуфабрикаты", position: 2 },
  { id: "cat-bakery", name: "Выпечка", position: 3 },
  { id: "cat-sides", name: "Гарниры и добавки", position: 4 },
  { id: "cat-sauces", name: "Соусы и молочные смеси", position: 5 },
]

export const seedProducts: SeedProduct[] = [
  {
    id: "prod-tomato",
    categoryId: "cat-vegetables",
    name: "Помидор свежий",
    sku: "VEG-TOM-01",
    unit: "kg",
    unitCost: 820,
  },
  {
    id: "prod-lettuce",
    categoryId: "cat-vegetables",
    name: "Салат айсберг",
    sku: "VEG-LET-01",
    unit: "kg",
    unitCost: 1450,
  },
  {
    id: "prod-onion",
    categoryId: "cat-vegetables",
    name: "Лук репчатый очищенный",
    sku: "VEG-ONI-01",
    unit: "kg",
    unitCost: 390,
  },
  {
    id: "prod-pickle",
    categoryId: "cat-vegetables",
    name: "Огурцы маринованные слайс",
    sku: "VEG-PIC-01",
    unit: "kg",
    unitCost: 1180,
  },
  {
    id: "prod-patty",
    categoryId: "cat-meat",
    name: "Котлета говяжья",
    sku: "MEA-BEF-110",
    unit: "pcs",
    unitCost: 465,
  },
  {
    id: "prod-chicken-patty",
    categoryId: "cat-meat",
    name: "Котлета куриная",
    sku: "MEA-CHK-100",
    unit: "pcs",
    unitCost: 385,
  },
  {
    id: "prod-bun",
    categoryId: "cat-bakery",
    name: "Булочка классическая",
    sku: "BAK-BUN-01",
    unit: "pcs",
    unitCost: 95,
  },
  {
    id: "prod-brioche",
    categoryId: "cat-bakery",
    name: "Булочка бриошь",
    sku: "BAK-BRI-01",
    unit: "pcs",
    unitCost: 125,
  },
  {
    id: "prod-fries",
    categoryId: "cat-sides",
    name: "Картофель фри",
    sku: "SID-FRY-01",
    unit: "portion",
    unitCost: 210,
  },
  {
    id: "prod-cheddar",
    categoryId: "cat-sides",
    name: "Сыр чеддер слайс",
    sku: "SID-CHD-01",
    unit: "slice",
    unitCost: 70,
  },
  {
    id: "prod-sauce",
    categoryId: "cat-sauces",
    name: "Соус фирменный",
    sku: "SAU-HSE-01",
    unit: "l",
    unitCost: 1650,
  },
  {
    id: "prod-shake",
    categoryId: "cat-sauces",
    name: "Смесь для молочного коктейля",
    sku: "DRY-SHK-01",
    unit: "l",
    unitCost: 980,
  },
]

export const seedWriteOffCategories: SeedWriteOffCategory[] = [
  { id: "woc-expired", name: "Истёк срок годности", position: 1 },
  { id: "woc-hold-time", name: "Превышено время хранения", position: 2 },
  {
    id: "woc-damaged",
    name: "Повреждено при хранении или доставке",
    position: 3,
  },
  { id: "woc-dropped", name: "Упало / санитарное списание", position: 4 },
  { id: "woc-cooking-defect", name: "Ошибка приготовления", position: 5 },
  {
    id: "woc-extra-prep",
    name: "Лишняя заготовка / ошибка сборки",
    position: 6,
  },
  { id: "woc-other", name: "Другая операционная причина", position: 7 },
]

export const seedUsers: SeedUser[] = [
  {
    id: "usr_admin_ops",
    name: "Операционный администратор",
    email: "admin@burgeri.kz",
    role: "admin",
    username: null,
    displayUsername: null,
    defaultPointOfSaleId: mega,
  },
  {
    id: "usr_reviewer_almaty",
    name: "Ревьюер Алматы",
    email: "reviewer@burgeri.kz",
    role: "reviewer",
    username: null,
    displayUsername: null,
    defaultPointOfSaleId: mega,
  },
  {
    id: "usr_reviewer_regions",
    name: "Ревьюер регионы",
    email: "manager@burgeri.kz",
    role: "reviewer",
    username: null,
    displayUsername: null,
    defaultPointOfSaleId: cityMall,
  },
  {
    id: "usr_reviewer_astana",
    name: "Ревьюер Астана",
    email: "reviewer-astana@burgeri.kz",
    role: "reviewer",
    username: null,
    displayUsername: null,
    defaultPointOfSaleId: megaSilkWay,
  },
  seedEmployee("usr_emp_1001", "Сотрудник смены 1001", "emp-1001", kuueva),
  seedEmployee("usr_emp_1002", "Сотрудник смены 1002", "emp-1002", mega),
  seedEmployee("usr_emp_1003", "Сотрудник смены 1003", "emp-1003", ritzPalace),
  seedEmployee("usr_emp_1004", "Сотрудник смены 1004", "emp-1004", aport),
  seedEmployee("usr_emp_1005", "Сотрудник смены 1005", "emp-1005", megaSilkWay),
  seedEmployee("usr_emp_1006", "Сотрудник смены 1006", "emp-1006", cityMall),
  seedEmployee("usr_emp_1007", "Сотрудник смены 1007", "emp-1007", tsumKar),
  seedEmployee("usr_emp_1008", "Сотрудник смены 1008", "emp-1008", greenPlaza),
  seedEmployee("usr_emp_1009", "Сотрудник смены 1009", "emp-1009", shakhterov),
  seedEmployee("usr_emp_1010", "Сотрудник смены 1010", "emp-1010", orbit),
  seedEmployee("usr_emp_1011", "Сотрудник смены 1011", "emp-1011", forum),
  seedEmployee("usr_emp_1012", "Сотрудник смены 1012", "emp-1012", khanShatyr),
  seedEmployee("usr_emp_1013", "Сотрудник смены 1013", "emp-1013", north),
  seedEmployee(
    "usr_emp_1014",
    "Сотрудник смены 1014",
    "emp-1014",
    diamondPlaza
  ),
  seedEmployee("usr_emp_1015", "Сотрудник смены 1015", "emp-1015", mart),
  seedEmployee("usr_emp_1016", "Сотрудник смены 1016", "emp-1016", akzhar),
]

const photoUrls = {
  tomatoOverripe: "/seed/write-off-photos/tomato-overripe.png",
  tomatoPrepPan: "/seed/write-off-photos/tomato-prep-pan.png",
  pattyOvercooked: "/seed/write-off-photos/patty-overcooked.png",
  pattyDropped: "/seed/write-off-photos/patty-dropped.png",
  bunDamaged: "/seed/write-off-photos/bun-damaged.png",
  friesFloor: "/seed/write-off-photos/fries-floor.png",
  shakeSpill: "/seed/write-off-photos/shake-spill.png",
  sauceExpired: "/seed/write-off-photos/sauce-expired.png",
} as const

export const seedWriteOffs: SeedWriteOff[] = [
  request(
    1,
    "usr_emp_1001",
    kuueva,
    "prod-tomato",
    "woc-expired",
    2.4,
    "none",
    null,
    "Помидоры из утренней поставки мягкие, есть тёмные пятна. На линию не выпускаем.",
    "approved",
    "usr_reviewer_almaty",
    "Фото подтверждает порчу, списание принято.",
    daysAgo(21, 9),
    daysAgo(21, 11),
    "synced",
    "IIKO-WO-20260607-0001",
    "tomatoOverripe"
  ),
  request(
    2,
    "usr_emp_1002",
    mega,
    "prod-patty",
    "woc-cooking-defect",
    5,
    "employee",
    "usr_emp_1002",
    "Партия котлет передержана на гриле во время обеденного пика, края пересушены.",
    "approved",
    "usr_reviewer_almaty",
    "Удержание согласовано со старшим смены.",
    daysAgo(20, 13),
    daysAgo(20, 15),
    "synced",
    "IIKO-WO-20260608-0002",
    "pattyOvercooked"
  ),
  request(
    3,
    "usr_emp_1003",
    ritzPalace,
    "prod-bun",
    "woc-damaged",
    18,
    "none",
    null,
    "Коробка с булочками пришла помятой, часть булочек деформирована и не проходит стандарт.",
    "rejected",
    "usr_reviewer_almaty",
    "На фото видно только открытую коробку, нужна фиксация упаковки поставщика.",
    daysAgo(19, 10),
    daysAgo(19, 12),
    "not_started",
    null,
    "bunDamaged"
  ),
  request(
    4,
    "usr_emp_1004",
    aport,
    "prod-fries",
    "woc-dropped",
    3,
    "employee",
    "usr_emp_1004",
    "Три порции картофеля упали на пол при передаче заказа на выдачу.",
    "approved",
    "usr_reviewer_almaty",
    "Санитарное списание подтверждено.",
    daysAgo(18, 16),
    daysAgo(18, 17),
    "synced",
    "IIKO-WO-20260610-0004",
    "friesFloor"
  ),
  request(
    5,
    "usr_emp_1005",
    megaSilkWay,
    "prod-shake",
    "woc-dropped",
    1.2,
    "none",
    null,
    "Смесь для коктейля пролилась при подготовке станции напитков.",
    "approved",
    "usr_reviewer_astana",
    "Количество соответствует остатку в мерном кувшине.",
    daysAgo(17, 8),
    daysAgo(17, 10),
    "synced",
    "IIKO-WO-20260611-0005",
    "shakeSpill"
  ),
  request(
    6,
    "usr_emp_1006",
    cityMall,
    "prod-sauce",
    "woc-expired",
    0.7,
    "none",
    null,
    "Контейнер фирменного соуса с расслоением, маркировка вчерашняя.",
    "approved",
    "usr_reviewer_regions",
    "Списать как просрочку соуса.",
    daysAgo(16, 11),
    daysAgo(16, 12),
    "synced",
    "IIKO-WO-20260612-0006",
    "sauceExpired"
  ),
  request(
    7,
    "usr_emp_1007",
    tsumKar,
    "prod-patty",
    "woc-dropped",
    2,
    "employee",
    "usr_emp_1007",
    "Две котлеты упали на пол при переносе гастроёмкости к грилю.",
    "rejected",
    "usr_reviewer_regions",
    "Не указано точное время инцидента, фото приложено без привязки к смене.",
    daysAgo(15, 14),
    daysAgo(15, 16),
    "not_started",
    null,
    "pattyDropped"
  ),
  request(
    8,
    "usr_emp_1008",
    greenPlaza,
    "prod-bun",
    "woc-hold-time",
    10,
    "none",
    null,
    "Открытый пакет булочек оставался на линии после вечернего закрытия, подсохли.",
    "approved",
    "usr_reviewer_regions",
    "Принято, проверьте чек-лист закрытия.",
    daysAgo(14, 9),
    daysAgo(14, 11),
    "queued",
    null,
    "bunDamaged"
  ),
  request(
    9,
    "usr_emp_1009",
    shakhterov,
    "prod-chicken-patty",
    "woc-cooking-defect",
    4,
    "employee",
    "usr_emp_1009",
    "Куриные котлеты приготовлены на неверном режиме, внутри сухие, наружный слой тёмный.",
    "approved",
    "usr_reviewer_regions",
    "Ошибка приготовления подтверждена.",
    daysAgo(13, 13),
    daysAgo(13, 15),
    "synced",
    "IIKO-WO-20260615-0009",
    "pattyOvercooked"
  ),
  request(
    10,
    "usr_emp_1010",
    orbit,
    "prod-lettuce",
    "woc-expired",
    1.1,
    "none",
    null,
    "Айсберг потемнел по краям, срок после вскрытия контейнера истёк.",
    "approved",
    "usr_reviewer_almaty",
    "Списать после проверки маркировки.",
    daysAgo(12, 10),
    daysAgo(12, 12),
    "synced",
    "IIKO-WO-20260616-0010",
    "tomatoOverripe"
  ),
  request(
    11,
    "usr_emp_1011",
    forum,
    "prod-tomato",
    "woc-hold-time",
    1.8,
    "none",
    null,
    "Нарезанные помидоры простояли на линии дольше допустимого времени.",
    "approved",
    "usr_reviewer_almaty",
    "Время хранения превышено, списание корректно.",
    daysAgo(11, 12),
    daysAgo(11, 13),
    "failed",
    null,
    "tomatoPrepPan"
  ),
  request(
    12,
    "usr_emp_1012",
    khanShatyr,
    "prod-cheddar",
    "woc-extra-prep",
    24,
    "employee",
    "usr_emp_1012",
    "Лишние слайсы сыра достали на сборку до отмены крупного заказа.",
    "rejected",
    "usr_reviewer_astana",
    "Нужно приложить фото фактического остатка и номер отменённого заказа.",
    daysAgo(10, 18),
    daysAgo(10, 19),
    "not_started",
    null,
    "tomatoPrepPan"
  ),
  request(
    13,
    "usr_emp_1013",
    north,
    "prod-fries",
    "woc-hold-time",
    5,
    "none",
    null,
    "Пять порций картофеля простояли после приготовления больше нормы.",
    "approved",
    "usr_reviewer_regions",
    "Принято, партия снята с реализации.",
    daysAgo(9, 15),
    daysAgo(9, 16),
    "synced",
    "IIKO-WO-20260619-0013",
    "friesFloor"
  ),
  request(
    14,
    "usr_emp_1014",
    diamondPlaza,
    "prod-pickle",
    "woc-damaged",
    0.6,
    "none",
    null,
    "Контейнер с огурцами упал в холодильнике, рассол вытек, продукт не используем.",
    "approved",
    "usr_reviewer_regions",
    "Списать повреждённый контейнер.",
    daysAgo(8, 10),
    daysAgo(8, 12),
    "queued",
    null,
    "sauceExpired"
  ),
  request(
    15,
    "usr_emp_1015",
    mart,
    "prod-brioche",
    "woc-damaged",
    12,
    "none",
    null,
    "Бриошь деформировалась при доставке между точками, часть упаковки прижата.",
    "rejected",
    "usr_reviewer_regions",
    "Фото не показывает количество, запросите пересъёмку всей партии.",
    daysAgo(8, 17),
    daysAgo(8, 18),
    "not_started",
    null,
    "bunDamaged"
  ),
  request(
    16,
    "usr_emp_1016",
    akzhar,
    "prod-onion",
    "woc-extra-prep",
    0.9,
    "none",
    null,
    "Лишний нарезанный лук остался после корректировки прогноза продаж.",
    "approved",
    "usr_reviewer_almaty",
    "Объём небольшой, списание принято.",
    daysAgo(7, 11),
    daysAgo(7, 12),
    "synced",
    "IIKO-WO-20260621-0016",
    "tomatoPrepPan"
  ),
  request(
    17,
    "usr_emp_1001",
    kuueva,
    "prod-patty",
    "woc-dropped",
    1,
    "employee",
    "usr_emp_1001",
    "Одна котлета упала с лопатки при сборке заказа.",
    "approved",
    "usr_reviewer_almaty",
    "Санитарное списание подтверждено по фото.",
    daysAgo(6, 13),
    daysAgo(6, 14),
    "synced",
    "IIKO-WO-20260622-0017",
    "pattyDropped"
  ),
  request(
    18,
    "usr_emp_1002",
    mega,
    "prod-sauce",
    "woc-expired",
    0.4,
    "none",
    null,
    "Фирменный соус с истёкшей маркировкой после утренней проверки холодильника.",
    "approved",
    "usr_reviewer_almaty",
    "Срок подтверждён, списать.",
    daysAgo(6, 9),
    daysAgo(6, 10),
    "failed",
    null,
    "sauceExpired"
  ),
  request(
    19,
    "usr_emp_1003",
    ritzPalace,
    "prod-tomato",
    "woc-expired",
    1.6,
    "none",
    null,
    "Помидоры размягчились после ночного хранения, часть уже дала сок.",
    "pending",
    null,
    null,
    daysAgo(5, 8),
    null,
    "not_started",
    null,
    "tomatoOverripe"
  ),
  request(
    20,
    "usr_emp_1004",
    aport,
    "prod-bun",
    "woc-damaged",
    8,
    "none",
    null,
    "Верхние булочки смяты в контейнере, использовать для бургеров нельзя.",
    "approved",
    "usr_reviewer_almaty",
    "Количество видно, списание принято.",
    daysAgo(5, 15),
    daysAgo(5, 16),
    "queued",
    null,
    "bunDamaged"
  ),
  request(
    21,
    "usr_emp_1005",
    megaSilkWay,
    "prod-fries",
    "woc-dropped",
    2,
    "employee",
    "usr_emp_1005",
    "Две порции картофеля упали на пол при передаче курьерского заказа.",
    "pending",
    null,
    null,
    daysAgo(4, 14),
    null,
    "not_started",
    null,
    "friesFloor"
  ),
  request(
    22,
    "usr_emp_1006",
    cityMall,
    "prod-chicken-patty",
    "woc-cooking-defect",
    3,
    "employee",
    "usr_emp_1006",
    "Куриные котлеты пересушены после сбоя таймера на гриле.",
    "rejected",
    "usr_reviewer_regions",
    "Недостаточно фото, не видно фактическое количество.",
    daysAgo(4, 18),
    daysAgo(4, 19),
    "not_started",
    null,
    "pattyOvercooked"
  ),
  request(
    23,
    "usr_emp_1007",
    tsumKar,
    "prod-shake",
    "woc-dropped",
    0.8,
    "none",
    null,
    "Коктейльная смесь пролилась при замене канистры.",
    "approved",
    "usr_reviewer_regions",
    "Принято по фото и комментарию.",
    daysAgo(4, 9),
    daysAgo(4, 10),
    "queued",
    null,
    "shakeSpill"
  ),
  request(
    24,
    "usr_emp_1008",
    greenPlaza,
    "prod-lettuce",
    "woc-hold-time",
    0.7,
    "none",
    null,
    "Листья салата после вскрытия контейнера хранились дольше нормы.",
    "pending",
    null,
    null,
    daysAgo(3, 11),
    null,
    "not_started",
    null,
    "tomatoPrepPan"
  ),
  request(
    25,
    "usr_emp_1009",
    shakhterov,
    "prod-patty",
    "woc-cooking-defect",
    4,
    "employee",
    "usr_emp_1009",
    "Котлеты пересушены на гриле, партия снята до выдачи гостям.",
    "pending",
    null,
    null,
    daysAgo(3, 16),
    null,
    "not_started",
    null,
    "pattyOvercooked"
  ),
  request(
    26,
    "usr_emp_1010",
    orbit,
    "prod-cheddar",
    "woc-hold-time",
    18,
    "none",
    null,
    "Сыр был достанут на линию до пика продаж, остаток пролежал без крышки.",
    "rejected",
    "usr_reviewer_almaty",
    "Нет фото продукта после смены, отклонено.",
    daysAgo(3, 20),
    daysAgo(3, 21),
    "not_started",
    null,
    "tomatoPrepPan"
  ),
  request(
    27,
    "usr_emp_1011",
    forum,
    "prod-tomato",
    "woc-hold-time",
    1.2,
    "none",
    null,
    "Нарезанные помидоры простояли на станции сборки после вечернего пика.",
    "pending",
    null,
    null,
    daysAgo(2, 12),
    null,
    "not_started",
    null,
    "tomatoPrepPan"
  ),
  request(
    28,
    "usr_emp_1012",
    khanShatyr,
    "prod-brioche",
    "woc-damaged",
    6,
    "none",
    null,
    "Булочки бриошь помяты при разгрузке, упаковка была под тяжёлым ящиком.",
    "pending",
    null,
    null,
    daysAgo(2, 10),
    null,
    "not_started",
    null,
    "bunDamaged"
  ),
  request(
    29,
    "usr_emp_1013",
    north,
    "prod-fries",
    "woc-cooking-defect",
    4,
    "employee",
    "usr_emp_1013",
    "Картофель пережарен после несвоевременной замены корзины во фритюре.",
    "pending",
    null,
    null,
    daysAgo(2, 17),
    null,
    "not_started",
    null,
    "friesFloor"
  ),
  request(
    30,
    "usr_emp_1014",
    diamondPlaza,
    "prod-onion",
    "woc-expired",
    0.5,
    "none",
    null,
    "Нарезанный лук с вчерашней маркировкой, запах изменился.",
    "rejected",
    "usr_reviewer_regions",
    "Фото маркировки отсутствует, отклонено.",
    daysAgo(2, 19),
    daysAgo(2, 20),
    "not_started",
    null,
    "tomatoOverripe"
  ),
  request(
    31,
    "usr_emp_1015",
    mart,
    "prod-sauce",
    "woc-expired",
    0.5,
    "none",
    null,
    "Соус начал расслаиваться, срок после вскрытия истёк утром.",
    "pending",
    null,
    null,
    daysAgo(1, 9),
    null,
    "not_started",
    null,
    "sauceExpired"
  ),
  request(
    32,
    "usr_emp_1016",
    akzhar,
    "prod-patty",
    "woc-dropped",
    2,
    "employee",
    "usr_emp_1016",
    "Две котлеты упали с подноса при переносе на станцию сборки.",
    "pending",
    null,
    null,
    daysAgo(1, 13),
    null,
    "not_started",
    null,
    "pattyDropped"
  ),
  request(
    33,
    "usr_emp_1001",
    kuueva,
    "prod-lettuce",
    "woc-damaged",
    0.8,
    "none",
    null,
    "Контейнер айсберга подмёрз у задней стенки холодильника, листья стали водянистыми.",
    "pending",
    null,
    null,
    daysAgo(1, 16),
    null,
    "not_started",
    null,
    "tomatoOverripe"
  ),
  request(
    34,
    "usr_emp_1002",
    mega,
    "prod-shake",
    "woc-dropped",
    1.4,
    "employee",
    "usr_emp_1002",
    "Часть смеси пролилась при установке канистры в аппарат.",
    "rejected",
    "usr_reviewer_almaty",
    "Фото не подтверждает объём 1.4 л, запросите корректировку.",
    daysAgo(1, 18),
    daysAgo(1, 19),
    "not_started",
    null,
    "shakeSpill"
  ),
  request(
    35,
    "usr_emp_1003",
    ritzPalace,
    "prod-bun",
    "woc-hold-time",
    7,
    "none",
    null,
    "Открытая кассета булочек осталась после закрытия линии, верхние булочки подсохли.",
    "pending",
    null,
    null,
    daysAgo(0, 9),
    null,
    "not_started",
    null,
    "bunDamaged"
  ),
  request(
    36,
    "usr_emp_1004",
    aport,
    "prod-tomato",
    "woc-expired",
    2.1,
    "none",
    null,
    "Помидоры из утренней нарезки стали водянистыми, на линии больше не используем.",
    "pending",
    null,
    null,
    daysAgo(0, 12),
    null,
    "not_started",
    null,
    "tomatoPrepPan"
  ),
]

function seedEmployee(
  id: string,
  name: string,
  username: string,
  defaultPointOfSaleId: string
): SeedUser {
  const displayUsername = username.toUpperCase()
  return {
    id,
    name,
    email: `${username}@staff.burgeri.local`,
    role: "employee",
    username,
    displayUsername,
    defaultPointOfSaleId,
  }
}

function daysAgo(days: number, hour = 12) {
  const date = new Date()
  date.setDate(date.getDate() - days)
  date.setHours(hour, 0, 0, 0)
  return date
}

function request(
  index: number,
  submitterId: string,
  pointOfSaleId: string,
  productId: string,
  writeOffCategoryId: string,
  quantity: number,
  deductionMode: DeductionMode,
  deductionEmployeeId: string | null,
  comment: string,
  status: WriteOffStatus,
  reviewerId: string | null,
  reviewComment: string | null,
  createdAt: Date,
  reviewedAt: Date | null,
  iikoSyncStatus: IikoSyncStatus,
  iikoDocumentId: string | null,
  photoKey: keyof typeof photoUrls
): SeedWriteOff {
  const padded = String(index).padStart(5, "0")
  const photoUrl = photoUrls[photoKey]
  return {
    id: `wo_${padded}`,
    requestNumber: `WR-${padded}`,
    submitterId,
    pointOfSaleId,
    productId,
    writeOffCategoryId,
    quantity,
    deductionMode,
    deductionEmployeeId,
    comment,
    photoFileId: `seed-${photoKey}`,
    photoUrl,
    status,
    reviewerId,
    reviewComment,
    reviewedAt,
    iikoSyncStatus,
    iikoDocumentId,
    mlClassification: mlForPhoto(photoKey),
    createdAt,
  }
}

function mlForPhoto(
  photoKey: keyof typeof photoUrls
): WriteOffMlClassification {
  const classifiedAt = "2026-06-27T06:50:00.000Z"
  const base = {
    classifiedAt,
    viewAgreement: 0.91,
    productMismatch: false,
  }

  if (photoKey === "tomatoOverripe" || photoKey === "tomatoPrepPan") {
    return {
      ...base,
      category: "bad_tomato",
      ingredientFamily: "tomato",
      confidence: 0.92,
      damageLevel: "high",
      needsManualCheck: false,
      suggestedComment: "Помидоры не соответствуют стандарту свежести.",
      top3: [
        { category: "bad_tomato", confidence: 0.92, cosine_similarity: 0.88 },
        {
          category: "damaged_tomato",
          confidence: 0.05,
          cosine_similarity: 0.71,
        },
        { category: "fresh_tomato", confidence: 0.03, cosine_similarity: 0.42 },
      ],
    }
  }

  if (photoKey === "pattyOvercooked" || photoKey === "pattyDropped") {
    return {
      ...base,
      category: photoKey === "pattyOvercooked" ? "bad_patty" : "damaged_patty",
      ingredientFamily: "patty",
      confidence: 0.89,
      damageLevel: photoKey === "pattyOvercooked" ? "high" : "none",
      needsManualCheck: photoKey === "pattyDropped",
      suggestedComment:
        photoKey === "pattyOvercooked"
          ? "Котлета выглядит пережаренной."
          : "Котлета требует санитарного списания после падения.",
      top3: [
        { category: "bad_patty", confidence: 0.89, cosine_similarity: 0.84 },
        { category: "fresh_patty", confidence: 0.07, cosine_similarity: 0.55 },
        { category: "unclear_food", confidence: 0.04, cosine_similarity: 0.33 },
      ],
    }
  }

  if (photoKey === "bunDamaged") {
    return {
      ...base,
      category: "damaged_bun",
      ingredientFamily: "bun",
      confidence: 0.86,
      damageLevel: "high",
      needsManualCheck: false,
      suggestedComment: "Булочки деформированы и не подходят для сборки.",
      top3: [
        { category: "damaged_bun", confidence: 0.86, cosine_similarity: 0.82 },
        { category: "fresh_bun", confidence: 0.09, cosine_similarity: 0.48 },
        { category: "unclear_food", confidence: 0.05, cosine_similarity: 0.31 },
      ],
    }
  }

  const fallbackLabels: Record<
    "friesFloor" | "shakeSpill" | "sauceExpired",
    { category: string; family: string; comment: string }
  > = {
    friesFloor: {
      category: "damaged_fries",
      family: "fries",
      comment: "Картофель требует санитарного списания после падения.",
    },
    shakeSpill: {
      category: "spilled_shake_mix",
      family: "shake_mix",
      comment: "Смесь пролита и не подлежит использованию.",
    },
    sauceExpired: {
      category: "bad_sauce",
      family: "sauce",
      comment: "Соус выглядит расслоившимся.",
    },
  }
  const fallback = fallbackLabels[photoKey]

  return {
    ...base,
    category: fallback.category,
    ingredientFamily: fallback.family,
    confidence: 0.78,
    damageLevel: "unknown",
    needsManualCheck: true,
    suggestedComment: fallback.comment,
    top3: [
      {
        category: fallback.category,
        confidence: 0.78,
        cosine_similarity: 0.69,
      },
      { category: "unclear_food", confidence: 0.14, cosine_similarity: 0.41 },
      { category: "fresh_food", confidence: 0.08, cosine_similarity: 0.28 },
    ],
  }
}
