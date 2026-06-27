import { spawnSync } from "node:child_process"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { seedUsers, seedWriteOffs } from "@/db/seed-data"

const databaseName = process.env.D1_DATABASE_NAME ?? "burgeri-web-db"
const isRemote = process.argv.includes("--remote")
const mode = isRemote ? "--remote" : "--local"

const accountCreatedAt = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

const statements = [
  insertRows(
    "user",
    ["id", "name", "email", "email_verified", "created_at", "updated_at"],
    seedUsers,
    (row) => [
      row.id,
      row.name,
      row.email,
      true,
      accountCreatedAt,
      accountCreatedAt,
    ],
    ["id"],
    ["name", "email", "email_verified"]
  ),
  insertRows(
    "staff_profile",
    ["user_id", "role", "default_location_id", "created_at", "updated_at"],
    seedUsers,
    (row) => [
      row.id,
      row.role,
      row.defaultLocationId,
      accountCreatedAt,
      accountCreatedAt,
    ],
    ["user_id"],
    ["role", "default_location_id"]
  ),
  insertRows(
    "write_off_request",
    [
      "id",
      "submitter_id",
      "location_id",
      "product_type",
      "quantity",
      "deduction_type",
      "charged_employee_id",
      "comment",
      "photo_data_url",
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
      row.submitterId,
      row.locationId,
      row.productType,
      row.quantity,
      row.deductionType,
      row.chargedEmployeeId,
      row.comment,
      row.photoDataUrl,
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
      "submitter_id",
      "location_id",
      "product_type",
      "quantity",
      "deduction_type",
      "charged_employee_id",
      "comment",
      "photo_data_url",
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
    { stdio: "inherit" }
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
