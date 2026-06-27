import { spawnSync } from "node:child_process"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import {
  seedCourseTags,
  seedCourses,
  seedLessons,
  seedOpportunities,
  seedOpportunityTags,
  seedQuizOptions,
  seedQuizQuestions,
  seedTags,
} from "@/db/seed-data"

const databaseName = process.env.D1_DATABASE_NAME ?? "burgeri-web-db"
const isRemote = process.argv.includes("--remote")
const mode = isRemote ? "--remote" : "--local"

const statements = [
  insertRows(
    "tag",
    ["id", "slug", "name", "kind", "color"],
    seedTags,
    (row) => [row.id, row.slug, row.name, row.kind, row.color],
    ["slug"],
    ["name", "kind", "color"]
  ),
  insertRows(
    "opportunity",
    [
      "id",
      "slug",
      "title",
      "summary",
      "description",
      "category",
      "format",
      "provider_name",
      "location",
      "country",
      "city",
      "min_grade",
      "max_grade",
      "min_age",
      "max_age",
      "deadline_at",
      "starts_at",
      "ends_at",
      "apply_url",
      "requirements",
      "is_featured",
      "is_published",
    ],
    seedOpportunities,
    (row) => [
      row.id,
      row.slug,
      row.title,
      row.summary,
      row.description,
      row.category,
      row.format,
      row.providerName,
      row.location,
      row.country,
      row.city,
      row.minGrade,
      row.maxGrade,
      null,
      null,
      row.deadlineAt,
      row.startsAt,
      row.endsAt,
      row.applyUrl,
      row.requirements,
      row.isFeatured,
      row.isPublished,
    ],
    ["slug"],
    [
      "title",
      "summary",
      "description",
      "category",
      "format",
      "provider_name",
      "location",
      "country",
      "city",
      "min_grade",
      "max_grade",
      "min_age",
      "max_age",
      "deadline_at",
      "starts_at",
      "ends_at",
      "apply_url",
      "requirements",
      "is_featured",
      "is_published",
    ]
  ),
  insertPairs(
    "opportunity_tag",
    ["opportunity_id", "tag_id"],
    seedOpportunityTags
  ),
  insertRows(
    "course",
    [
      "id",
      "slug",
      "title",
      "summary",
      "description",
      "difficulty",
      "estimated_hours",
      "thumbnail_url",
      "is_featured",
      "is_published",
    ],
    seedCourses,
    (row) => [
      row.id,
      row.slug,
      row.title,
      row.summary,
      row.description,
      row.difficulty,
      row.estimatedHours,
      row.thumbnailUrl,
      row.isFeatured,
      row.isPublished,
    ],
    ["slug"],
    [
      "title",
      "summary",
      "description",
      "difficulty",
      "estimated_hours",
      "thumbnail_url",
      "is_featured",
      "is_published",
    ]
  ),
  insertPairs("course_tag", ["course_id", "tag_id"], seedCourseTags),
  insertRows(
    "lesson",
    [
      "id",
      "course_id",
      "slug",
      "title",
      "summary",
      "content",
      "video_url",
      "materials",
      "assignment_prompt",
      "duration_minutes",
      "position",
      "is_preview",
    ],
    seedLessons,
    (row) => [
      row.id,
      row.courseId,
      row.slug,
      row.title,
      row.summary,
      row.content,
      row.videoUrl,
      row.materials,
      row.assignmentPrompt,
      row.durationMinutes,
      row.position,
      row.isPreview ?? false,
    ],
    ["course_id", "slug"],
    [
      "title",
      "summary",
      "content",
      "video_url",
      "materials",
      "assignment_prompt",
      "duration_minutes",
      "position",
      "is_preview",
    ]
  ),
  insertRows(
    "quiz_question",
    ["id", "lesson_id", "type", "prompt", "explanation", "position"],
    seedQuizQuestions,
    (row) => [
      row.id,
      row.lessonId,
      row.type,
      row.prompt,
      row.explanation,
      row.position,
    ],
    ["lesson_id", "position"],
    ["type", "prompt", "explanation"]
  ),
  insertRows(
    "quiz_option",
    ["id", "question_id", "label", "is_correct", "position"],
    seedQuizOptions,
    (row) => [row.id, row.questionId, row.label, row.isCorrect, row.position],
    ["question_id", "position"],
    ["label", "is_correct"]
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

function insertPairs(
  table: string,
  columns: [string, string],
  rows: readonly (readonly [string, string])[]
) {
  const columnSql = columns.map(quoteIdentifier).join(", ")
  const valuesSql = rows
    .map(([first, second]) => `(${sqlValue(first)}, ${sqlValue(second)})`)
    .join(",\n")
  const conflictSql = columns.map(quoteIdentifier).join(", ")

  return `INSERT INTO ${quoteIdentifier(table)} (${columnSql}) VALUES\n${valuesSql}\nON CONFLICT (${conflictSql}) DO NOTHING;`
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
