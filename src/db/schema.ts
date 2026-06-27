import { relations, sql } from "drizzle-orm"
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core"

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
export const writeOffProductTypes = [
  "tomatoes",
  "patty",
  "bun",
  "fries",
  "other",
] as const
export const writeOffDeductionTypes = ["company", "employee"] as const
export const writeOffStatuses = ["pending", "approved", "rejected"] as const
export const iikoSyncStatuses = [
  "not_started",
  "queued",
  "synced",
  "failed",
] as const

// One profile row per authenticated staff member. The role drives access:
// `employee` can submit write-offs, `reviewer` can approve/reject and reach the
// reviewer workspace, `admin` can additionally manage staff roles.
export const staffProfile = sqliteTable(
  "staff_profile",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role", { enum: userRoles }).default("employee").notNull(),
    defaultLocationId: text("default_location_id"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index("staff_profile_role_idx").on(table.role)]
)

export const writeOffRequest = sqliteTable(
  "write_off_request",
  {
    id: id(),
    submitterId: text("submitter_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    locationId: text("location_id").notNull(),
    productType: text("product_type", {
      enum: writeOffProductTypes,
    }).notNull(),
    quantity: integer("quantity").default(1).notNull(),
    deductionType: text("deduction_type", {
      enum: writeOffDeductionTypes,
    }).notNull(),
    chargedEmployeeId: text("charged_employee_id").references(() => user.id, {
      onDelete: "set null",
    }),
    comment: text("comment").notNull(),
    photoDataUrl: text("photo_data_url").notNull(),
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
    index("write_off_request_submitter_idx").on(table.submitterId),
    index("write_off_request_location_idx").on(table.locationId),
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
