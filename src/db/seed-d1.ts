import { spawnSync } from "node:child_process"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import {
  seedPointsOfSale,
  seedProductCategories,
  seedProducts,
  seedUsers,
  seedWriteOffCategories,
  seedWriteOffs,
} from "@/db/seed-data"

const databaseName = process.env.D1_DATABASE_NAME ?? "burgeri-web-db"
const isRemote = process.argv.includes("--remote")
const mode = isRemote ? "--remote" : "--local"

const accountCreatedAt = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

const statements = [
  insertRows(
    "point_of_sale",
    ["id", "name", "address", "is_active", "created_at", "updated_at"],
    seedPointsOfSale,
    (row) => [row.id, row.name, row.address, true, accountCreatedAt, accountCreatedAt],
    ["id"],
    ["name", "address", "is_active"]
  ),
  insertRows(
    "product_category",
    ["id", "name", "position", "created_at", "updated_at"],
    seedProductCategories,
    (row) => [row.id, row.name, row.position, accountCreatedAt, accountCreatedAt],
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
      true,
      accountCreatedAt,
      accountCreatedAt,
    ],
    ["id"],
    ["category_id", "name", "sku", "unit", "is_active"]
  ),
  insertRows(
    "write_off_category",
    ["id", "name", "position", "created_at", "updated_at"],
    seedWriteOffCategories,
    (row) => [row.id, row.name, row.position, accountCreatedAt, accountCreatedAt],
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
      null,
      null,
      row.status,
      row.reviewerId,
      row.reviewComment,
      row.reviewedAt,
      row.iikoSyncStatus,
      row.iikoDocumentId,
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
    ]
  ),
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
