import { spawnSync } from "node:child_process"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { hashPassword } from "better-auth/crypto"

import {
  seedPointsOfSale,
  seedProductCategories,
  seedProducts,
  seedUsers,
  seedWriteOffCategories,
  seedWriteOffs,
} from "@/db/seed-data"
import { legacyPlaceholderStoreIds } from "@/db/seed-stores"

const databaseName = process.env.D1_DATABASE_NAME ?? "bahandi-db"
const isRemote = process.argv.includes("--remote")
const mode = isRemote ? "--remote" : "--local"

const accountCreatedAt = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
const seedStaffPassword =
  process.env.SEED_STAFF_PASSWORD ??
  process.env.SEED_EMPLOYEE_PASSWORD ??
  "Burgeri123!"
const seedStaffPasswordHash = await hashPassword(seedStaffPassword)
const seedCredentialUsers = seedUsers
const legacySeedUserIds = [
  "usr_admin",
  "usr_reviewer_dana",
  "usr_reviewer_marat",
  "usr_reviewer_ainur",
  "usr_emp_aigerim",
  "usr_emp_daulet",
  "usr_emp_nurlan",
  "usr_emp_saule",
  "usr_emp_timur",
  "usr_emp_gulnara",
  "usr_emp_erlan",
  "usr_emp_anel",
]
const seedUserIds = [
  ...new Set([...seedUsers.map((row) => row.id), ...legacySeedUserIds]),
]
const seedEmails = seedUsers.map((row) => row.email)
const retiredSeedProductCategoryMoves = [
  { from: "cat-other", to: "cat-sauces" },
] as const
const retiredSeedWriteOffCategoryMoves = [
  { from: "woc-spoiled", to: "woc-expired" },
  { from: "woc-overcooked", to: "woc-cooking-defect" },
] as const

const statements = [
  deleteSeedRows(),
  insertRows(
    "point_of_sale",
    ["id", "name", "address", "city", "is_active", "created_at", "updated_at"],
    seedPointsOfSale,
    (row) => [
      row.id,
      row.name,
      row.address,
      row.city,
      true,
      accountCreatedAt,
      accountCreatedAt,
    ],
    ["id"],
    ["name", "address", "city", "is_active"]
  ),
  insertRows(
    "product_category",
    ["id", "name", "position", "created_at", "updated_at"],
    seedProductCategories,
    (row) => [
      row.id,
      row.name,
      row.position,
      accountCreatedAt,
      accountCreatedAt,
    ],
    ["id"],
    ["name", "position"]
  ),
  insertRows(
    "product",
    [
      "id",
      "category_id",
      "name",
      "sku",
      "unit",
      "unit_cost",
      "is_active",
      "created_at",
      "updated_at",
    ],
    seedProducts,
    (row) => [
      row.id,
      row.categoryId,
      row.name,
      row.sku,
      row.unit,
      row.unitCost,
      true,
      accountCreatedAt,
      accountCreatedAt,
    ],
    ["id"],
    ["category_id", "name", "sku", "unit", "unit_cost", "is_active"]
  ),
  insertRows(
    "write_off_category",
    ["id", "name", "position", "created_at", "updated_at"],
    seedWriteOffCategories,
    (row) => [
      row.id,
      row.name,
      row.position,
      accountCreatedAt,
      accountCreatedAt,
    ],
    ["id"],
    ["name", "position"]
  ),
  insertRows(
    "user",
    [
      "id",
      "name",
      "email",
      "email_verified",
      "username",
      "display_username",
      "created_at",
      "updated_at",
    ],
    seedUsers,
    (row) => [
      row.id,
      row.name,
      row.email,
      true,
      row.username,
      row.displayUsername,
      accountCreatedAt,
      accountCreatedAt,
    ],
    ["id"],
    ["name", "email", "email_verified", "username", "display_username"]
  ),
  insertRows(
    "account",
    [
      "id",
      "account_id",
      "provider_id",
      "user_id",
      "password",
      "created_at",
      "updated_at",
    ],
    seedCredentialUsers,
    (row) => [
      `acct_${row.id}_credential`,
      row.id,
      "credential",
      row.id,
      seedStaffPasswordHash,
      accountCreatedAt,
      accountCreatedAt,
    ],
    ["id"],
    ["account_id", "provider_id", "user_id", "password"]
  ),
  insertRows(
    "staff_profile",
    ["user_id", "role", "default_point_of_sale_id", "created_at", "updated_at"],
    seedUsers,
    (row) => [
      row.id,
      row.role,
      row.defaultPointOfSaleId,
      accountCreatedAt,
      accountCreatedAt,
    ],
    ["user_id"],
    ["role", "default_point_of_sale_id"]
  ),
  insertRows(
    "write_off_request",
    [
      "id",
      "request_number",
      "submitter_id",
      "point_of_sale_id",
      "product_id",
      "write_off_category_id",
      "quantity",
      "deduction_mode",
      "deduction_employee_id",
      "comment",
      "photo_file_id",
      "photo_url",
      "status",
      "reviewer_id",
      "review_comment",
      "reviewed_at",
      "iiko_sync_status",
      "iiko_document_id",
      "ml_classification",
      "created_at",
      "updated_at",
    ],
    seedWriteOffs,
    (row) => [
      row.id,
      row.requestNumber,
      row.submitterId,
      row.pointOfSaleId,
      row.productId,
      row.writeOffCategoryId,
      row.quantity,
      row.deductionMode,
      row.deductionEmployeeId,
      row.comment,
      row.photoFileId,
      row.photoUrl,
      row.status,
      row.reviewerId,
      row.reviewComment,
      row.reviewedAt,
      row.iikoSyncStatus,
      row.iikoDocumentId,
      row.mlClassification,
      row.createdAt,
      row.reviewedAt ?? row.createdAt,
    ],
    ["id"],
    [
      "request_number",
      "submitter_id",
      "point_of_sale_id",
      "product_id",
      "write_off_category_id",
      "quantity",
      "deduction_mode",
      "deduction_employee_id",
      "comment",
      "status",
      "reviewer_id",
      "review_comment",
      "reviewed_at",
      "iiko_sync_status",
      "iiko_document_id",
      "ml_classification",
    ]
  ),
  retireSeedCatalogRows(),
  deactivateLegacyStores(legacyPlaceholderStoreIds),
]

const tempDir = mkdtempSync(join(tmpdir(), "burgeri-web-seed-"))
const seedFile = join(tempDir, "seed.sql")

try {
  writeFileSync(seedFile, statements.join("\n\n"))

  const result = spawnSync(
    "pnpm",
    ["wrangler", "d1", "execute", databaseName, mode, "--file", seedFile],
    // `shell: true` lets Windows resolve the `pnpm.cmd` shim; without it
    // spawnSync("pnpm", …) fails with ENOENT on Windows.
    { stdio: "inherit", shell: true }
  )

  process.exit(result.status ?? 1)
} finally {
  rmSync(tempDir, { recursive: true, force: true })
}

function deactivateLegacyStores(ids: readonly string[]) {
  if (ids.length === 0) return ""
  const idList = ids.map((id) => quoteString(id)).join(", ")
  return `UPDATE ${quoteIdentifier("point_of_sale")} SET ${quoteIdentifier("is_active")} = 0, ${quoteIdentifier("updated_at")} = cast(unixepoch('subsecond') * 1000 as integer) WHERE ${quoteIdentifier("id")} IN (${idList});`
}

function deleteSeedRows() {
  const userIdList = seedUserIds.map((id) => quoteString(id)).join(", ")
  const emailList = seedEmails.map((email) => quoteString(email)).join(", ")
  const requestNumberList = seedWriteOffs
    .map((row) => quoteString(row.requestNumber))
    .join(", ")

  return [
    `DELETE FROM ${quoteIdentifier("write_off_request")} WHERE ${quoteIdentifier("request_number")} IN (${requestNumberList}) OR ${quoteIdentifier("submitter_id")} IN (${userIdList}) OR ${quoteIdentifier("reviewer_id")} IN (${userIdList}) OR ${quoteIdentifier("deduction_employee_id")} IN (${userIdList}) OR ${quoteIdentifier("submitter_id")} IN (SELECT ${quoteIdentifier("id")} FROM ${quoteIdentifier("user")} WHERE ${quoteIdentifier("email")} IN (${emailList})) OR ${quoteIdentifier("reviewer_id")} IN (SELECT ${quoteIdentifier("id")} FROM ${quoteIdentifier("user")} WHERE ${quoteIdentifier("email")} IN (${emailList})) OR ${quoteIdentifier("deduction_employee_id")} IN (SELECT ${quoteIdentifier("id")} FROM ${quoteIdentifier("user")} WHERE ${quoteIdentifier("email")} IN (${emailList}));`,
    `DELETE FROM ${quoteIdentifier("account")} WHERE ${quoteIdentifier("user_id")} IN (${userIdList}) OR ${quoteIdentifier("user_id")} IN (SELECT ${quoteIdentifier("id")} FROM ${quoteIdentifier("user")} WHERE ${quoteIdentifier("email")} IN (${emailList}));`,
    `DELETE FROM ${quoteIdentifier("staff_profile")} WHERE ${quoteIdentifier("user_id")} IN (${userIdList}) OR ${quoteIdentifier("user_id")} IN (SELECT ${quoteIdentifier("id")} FROM ${quoteIdentifier("user")} WHERE ${quoteIdentifier("email")} IN (${emailList}));`,
    `DELETE FROM ${quoteIdentifier("user")} WHERE ${quoteIdentifier("id")} IN (${userIdList}) OR ${quoteIdentifier("email")} IN (${emailList});`,
  ].join("\n")
}

function retireSeedCatalogRows() {
  const productCategoryUpdates = retiredSeedProductCategoryMoves.map(
    ({ from, to }) =>
      `UPDATE ${quoteIdentifier("product")} SET ${quoteIdentifier("category_id")} = ${quoteString(to)} WHERE ${quoteIdentifier("category_id")} = ${quoteString(from)};`
  )
  const writeOffCategoryUpdates = retiredSeedWriteOffCategoryMoves.map(
    ({ from, to }) =>
      `UPDATE ${quoteIdentifier("write_off_request")} SET ${quoteIdentifier("write_off_category_id")} = ${quoteString(to)} WHERE ${quoteIdentifier("write_off_category_id")} = ${quoteString(from)};`
  )
  const retiredProductCategoryIds = retiredSeedProductCategoryMoves.map(
    ({ from }) => from
  )
  const retiredWriteOffCategoryIds = retiredSeedWriteOffCategoryMoves.map(
    ({ from }) => from
  )

  return [
    ...productCategoryUpdates,
    ...writeOffCategoryUpdates,
    deleteRowsByIds("product_category", retiredProductCategoryIds),
    deleteRowsByIds("write_off_category", retiredWriteOffCategoryIds),
  ].join("\n")
}

function deleteRowsByIds(table: string, ids: readonly string[]) {
  if (ids.length === 0) return ""
  const idList = ids.map((id) => quoteString(id)).join(", ")
  return `DELETE FROM ${quoteIdentifier(table)} WHERE ${quoteIdentifier("id")} IN (${idList});`
}

function insertRows<T>(
  table: string,
  columns: string[],
  rows: readonly T[],
  values: (row: T) => unknown[],
  conflictColumns: string[],
  updateColumns: string[]
) {
  const columnSql = columns.map(quoteIdentifier).join(", ")
  const valuesSql = rows
    .map((row) => `(${values(row).map(sqlValue).join(", ")})`)
    .join(",\n")
  const conflictSql = conflictColumns.map(quoteIdentifier).join(", ")
  const updateSql = [
    ...updateColumns.map(
      (column) =>
        `${quoteIdentifier(column)} = excluded.${quoteIdentifier(column)}`
    ),
    "updated_at = cast(unixepoch('subsecond') * 1000 as integer)",
  ].join(", ")

  return `INSERT INTO ${quoteIdentifier(table)} (${columnSql}) VALUES\n${valuesSql}\nON CONFLICT (${conflictSql}) DO UPDATE SET ${updateSql};`
}

function quoteIdentifier(value: string) {
  return `\`${value}\``
}

function sqlValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "null"
  }

  if (value instanceof Date) {
    return String(value.getTime())
  }

  if (typeof value === "boolean") {
    return value ? "1" : "0"
  }

  if (typeof value === "number") {
    return String(value)
  }

  if (typeof value === "string") {
    return quoteString(value)
  }

  return quoteString(JSON.stringify(value))
}

function quoteString(value: string) {
  return `'${value.replaceAll("'", "''")}'`
}
