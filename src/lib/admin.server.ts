import "@tanstack/react-start/server-only"

import { asc, desc, eq } from "drizzle-orm"

import { user } from "@/db/auth-schema"
import { listCourses, listOpportunities, listTags } from "@/db/queries"
import { lesson, studentProfile } from "@/db/schema"
import { getServerDb } from "@/lib/db.server"
import { requireAdmin } from "@/lib/user-context.server"

export async function getAdminPageData() {
  await requireAdmin()

  const db = getServerDb()
  const [opportunities, courses, tags, lessonRows, users] = await Promise.all([
    listOpportunities(db, {
      publishedOnly: false,
      sort: "newest",
      limit: 50,
    }),
    listCourses(db, {
      publishedOnly: false,
      sort: "newest",
      limit: 50,
    }),
    listTags(db),
    db
      .select()
      .from(lesson)
      .orderBy(asc(lesson.courseId), asc(lesson.position)),
    db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
        role: studentProfile.role,
        grade: studentProfile.grade,
        onboardingCompleted: studentProfile.onboardingCompleted,
      })
      .from(user)
      .leftJoin(studentProfile, eq(user.id, studentProfile.userId))
      .orderBy(desc(user.createdAt)),
  ])

  const lessonsByCourseId = new Map<string, typeof lessonRows>()
  for (const lessonRow of lessonRows) {
    const rows = lessonsByCourseId.get(lessonRow.courseId) ?? []
    rows.push(lessonRow)
    lessonsByCourseId.set(lessonRow.courseId, rows)
  }

  return {
    stats: {
      opportunities: opportunities.length,
      publishedOpportunities: opportunities.filter((row) => row.isPublished)
        .length,
      courses: courses.length,
      publishedCourses: courses.filter((row) => row.isPublished).length,
      users: users.length,
      completedProfiles: users.filter((row) => row.onboardingCompleted).length,
    },
    tags: tags.map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      kind: row.kind,
    })),
    opportunities: opportunities.map((row) => ({
      id: row.id,
      slug: row.slug,
      title: row.title,
      summary: row.summary,
      description: row.description,
      category: row.category,
      format: row.format,
      providerName: row.providerName,
      location: row.location,
      country: row.country,
      city: row.city,
      minGrade: row.minGrade,
      maxGrade: row.maxGrade,
      deadlineAt: toDateInput(row.deadlineAt),
      startsAt: toDateInput(row.startsAt),
      endsAt: toDateInput(row.endsAt),
      applyUrl: row.applyUrl,
      requirementsText: row.requirements.join("\n"),
      isFeatured: row.isFeatured,
      isPublished: row.isPublished,
      tags: row.tags.map((tag) => tag.slug),
    })),
    courses: courses.map((row) => ({
      id: row.id,
      slug: row.slug,
      title: row.title,
      summary: row.summary,
      description: row.description,
      difficulty: row.difficulty,
      estimatedHours: row.estimatedHours,
      thumbnailUrl: row.thumbnailUrl,
      isFeatured: row.isFeatured,
      isPublished: row.isPublished,
      tags: row.tags.map((tag) => tag.slug),
      lessons: (lessonsByCourseId.get(row.id) ?? []).map((lessonRow) => ({
        id: lessonRow.id,
        courseId: lessonRow.courseId,
        slug: lessonRow.slug,
        title: lessonRow.title,
        summary: lessonRow.summary,
        content: lessonRow.content,
        videoUrl: lessonRow.videoUrl,
        materialsText: lessonRow.materials
          .map((material) => `${material.title} | ${material.url}`)
          .join("\n"),
        assignmentPrompt: lessonRow.assignmentPrompt,
        durationMinutes: lessonRow.durationMinutes,
        position: lessonRow.position,
        isPreview: lessonRow.isPreview,
      })),
    })),
    users: users.slice(0, 25).map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      createdAt: row.createdAt.toISOString(),
      role: row.role ?? "none",
      grade: row.grade,
      onboardingCompleted: Boolean(row.onboardingCompleted),
    })),
  }
}

function toDateInput(value?: Date | null) {
  return value ? value.toISOString().slice(0, 10) : ""
}

export type AdminPageData = Awaited<ReturnType<typeof getAdminPageData>>
