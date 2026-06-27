import { relations, sql } from "drizzle-orm"
import {
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core"

import { user } from "@/db/auth-schema"

const timestampMs = (name: string) => integer(name, { mode: "timestamp_ms" })

const createdAt = () =>
  timestampMs("created_at")
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull()

const updatedAt = () =>
  timestampMs("updated_at")
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .$onUpdate(() => new Date())
    .notNull()

const id = (name = "id") =>
  text(name)
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID())

export const userRoles = ["employee", "reviewer", "admin"] as const
export const writeOffDeductionModes = ["none", "employee"] as const
export const writeOffStatuses = ["pending", "approved", "rejected"] as const
export const iikoSyncStatuses = [
  "not_started",
  "queued",
  "syncing",
  "synced",
  "failed",
] as const

// One profile row per authenticated user. The role drives access: `employee`
// submits write-offs from the mobile app, `reviewer` reaches the reviewer web
// workspace, `admin` additionally manages staff and catalogs.
export const staffProfile = sqliteTable(
  "staff_profile",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role", { enum: userRoles }).default("employee").notNull(),
    defaultPointOfSaleId: text("default_point_of_sale_id"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index("staff_profile_role_idx").on(table.role)]
)

export const pointOfSale = sqliteTable("point_of_sale", {
  id: id(),
  name: text("name").notNull(),
  address: text("address").default("").notNull(),
  isActive: integer("is_active", { mode: "boolean" }).default(true).notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
})

export const productCategory = sqliteTable("product_category", {
  id: id(),
  name: text("name").notNull(),
  position: integer("position").default(0).notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
})

export const product = sqliteTable(
  "product",
  {
    id: id(),
    categoryId: text("category_id")
      .notNull()
      .references(() => productCategory.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    sku: text("sku").default("").notNull(),
    unit: text("unit").default("pcs").notNull(),
    isActive: integer("is_active", { mode: "boolean" }).default(true).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index("product_category_idx").on(table.categoryId)]
)

export const writeOffCategory = sqliteTable("write_off_category", {
  id: id(),
  name: text("name").notNull(),
  position: integer("position").default(0).notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
})

export const writeOffRequest = sqliteTable(
  "write_off_request",
  {
    id: id(),
    requestNumber: text("request_number").notNull(),
    submitterId: text("submitter_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    pointOfSaleId: text("point_of_sale_id")
      .notNull()
      .references(() => pointOfSale.id, { onDelete: "restrict" }),
    productId: text("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "restrict" }),
    writeOffCategoryId: text("write_off_category_id")
      .notNull()
      .references(() => writeOffCategory.id, { onDelete: "restrict" }),
    quantity: real("quantity").default(1).notNull(),
    deductionMode: text("deduction_mode", {
      enum: writeOffDeductionModes,
    }).notNull(),
    deductionEmployeeId: text("deduction_employee_id").references(
      () => user.id,
      { onDelete: "set null" }
    ),
    comment: text("comment").notNull(),
    photoFileId: text("photo_file_id"),
    photoUrl: text("photo_url"),
    status: text("status", { enum: writeOffStatuses })
      .default("pending")
      .notNull(),
    reviewerId: text("reviewer_id").references(() => user.id, {
      onDelete: "set null",
    }),
    reviewComment: text("review_comment"),
    reviewedAt: timestampMs("reviewed_at"),
    iikoSyncStatus: text("iiko_sync_status", { enum: iikoSyncStatuses })
      .default("not_started")
      .notNull(),
    iikoDocumentId: text("iiko_document_id"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("write_off_request_number_unique").on(table.requestNumber),
    index("write_off_request_submitter_idx").on(table.submitterId),
    index("write_off_request_pos_idx").on(table.pointOfSaleId),
    index("write_off_request_status_idx").on(table.status),
    index("write_off_request_created_at_idx").on(table.createdAt),
  ]
)

export const staffProfileRelations = relations(staffProfile, ({ one }) => ({
  user: one(user, {
    fields: [staffProfile.userId],
    references: [user.id],
  }),
}))

export const productCategoryRelations = relations(
  productCategory,
  ({ many }) => ({
    products: many(product),
  })
)

export const productRelations = relations(product, ({ one }) => ({
  category: one(productCategory, {
    fields: [product.categoryId],
    references: [productCategory.id],
  }),
}))
