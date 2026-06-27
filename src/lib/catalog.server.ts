import "@tanstack/react-start/server-only"

import { asc, inArray } from "drizzle-orm"

import { lesson as lessonTable } from "@/db/schema"
import {
  getCourseCatalogFacets,
  getOpportunityCatalogFacets,
  getStudentDashboard,
  getCourseBySlug,
  getOpportunityBySlug,
  getUserTagPreferences,
  listCourses,
  listOpportunities,
  listTags,
} from "@/db/queries"
import type {
  CourseDetail,
  CourseDifficulty,
  CourseSummary,
  LessonWithProgress,
  OpportunityCategory,
  OpportunityFormat,
  OpportunityWithTags,
  Tag,
} from "@/db/queries"
import { getServerDb } from "@/lib/db.server"
import {
  formatCourseDuration,
  formatDate,
  formatDuration,
  formatGradeRange,
  formatShortDate,
} from "@/lib/catalog"
import type {
  CatalogCourse,
  CatalogCourseDetail,
  CourseCatalogData,
  CourseDetailData,
  CourseFilters,
  CatalogLesson,
  CatalogLessonPreview,
  CatalogOpportunity,
  CatalogTag,
  HomeCatalogData,
  OpportunityCatalogData,
  OpportunityDetailData,
  OpportunityFilters,
  StudentDashboardData,
} from "@/lib/catalog"
import {
  getViewerState,
  requireCompletedProfile,
} from "@/lib/user-context.server"

const CATALOG_LIMIT = 50

export async function getHomeCatalogData(): Promise<HomeCatalogData> {
  const db = getServerDb()
  const [opportunities, courses, fields] = await Promise.all([
    listOpportunities(db, {
      sort: "featured",
      limit: 4,
      publishedOnly: true,
    }),
    listCourses(db, {
      sort: "featured",
      limit: 3,
      publishedOnly: true,
    }),
    listTags(db, "field"),
  ])

  return {
    opportunities: opportunities.map(toCatalogOpportunity),
    courses: await attachCourseListData(courses),
    fields: fields.slice(0, 6).map(toCatalogTag),
  }
}

export async function getOpportunityCatalogData(
  filters: OpportunityFilters = {}
): Promise<OpportunityCatalogData> {
  const db = getServerDb()
  const viewer = await getViewerState()
  const deadlineHorizon = filters.deadline?.includes("90")
    ? "90"
    : filters.deadline?.includes("30")
      ? "30"
      : undefined
  const deadlineRange = resolveDeadlineRange(deadlineHorizon)
  const [opportunities, facets] = await Promise.all([
    listOpportunities(db, {
      sort: "featured",
      limit: CATALOG_LIMIT,
      publishedOnly: true,
      userId: viewer.userId,
      categories: filters.category as OpportunityCategory[] | undefined,
      formats: filters.format as OpportunityFormat[] | undefined,
      grades: filters.grade,
      tagSlugs: filters.tag,
      deadlineFrom: deadlineRange?.from,
      deadlineTo: deadlineRange?.to,
    }),
    getOpportunityCatalogFacets(db),
  ])

  return {
    viewer,
    opportunities: opportunities.map(toCatalogOpportunity),
    totalCount: facets.total,
    filterOptions: {
      fields: facets.tags.map(toCatalogTag),
      categories: facets.categories,
      formats: facets.formats,
    },
  }
}

export async function getOpportunityDetailData(
  slug: string
): Promise<OpportunityDetailData> {
  const viewer = await getViewerState()
  const opportunity = await getOpportunityBySlug(getServerDb(), slug, {
    publishedOnly: true,
    userId: viewer.userId,
  })

  return {
    viewer,
    opportunity: opportunity ? toCatalogOpportunity(opportunity) : null,
  }
}

export async function getCourseCatalogData(
  filters: CourseFilters = {}
): Promise<CourseCatalogData> {
  const db = getServerDb()
  const viewer = await getViewerState()
  const [courses, facets] = await Promise.all([
    listCourses(db, {
      sort: "featured",
      limit: CATALOG_LIMIT,
      publishedOnly: true,
      userId: viewer.userId,
      difficulties: filters.difficulty as CourseDifficulty[] | undefined,
      tagSlugs: filters.tag,
    }),
    getCourseCatalogFacets(db),
  ])

  return {
    viewer,
    courses: await attachCourseListData(courses),
    totalCount: facets.total,
    filterOptions: {
      subjects: facets.tags.map(toCatalogTag),
      difficulties: facets.difficulties,
    },
  }
}

export async function getCourseDetailData(
  slug: string
): Promise<CourseDetailData> {
  const viewer = await getViewerState()
  const course = await getCourseBySlug(getServerDb(), slug, {
    publishedOnly: true,
    userId: viewer.userId,
  })

  return {
    viewer,
    course: course ? toCatalogCourseDetail(course) : null,
  }
}

export async function getStudentDashboardData(): Promise<StudentDashboardData> {
  const context = await requireCompletedProfile("/account")
  const db = getServerDb()
  const [dashboard, preferences] = await Promise.all([
    getStudentDashboard(db, context.user.id),
    getUserTagPreferences(db, context.user.id),
  ])

  return {
    user: {
      id: context.user.id,
      name: context.user.name,
      email: context.user.email,
    },
    profile: {
      grade: dashboard.profile?.grade ?? null,
      role: dashboard.profile?.role ?? "student",
      country: dashboard.profile?.country ?? "Kazakhstan",
      onboardingCompleted: Boolean(dashboard.profile?.onboardingCompleted),
    },
    preferences: preferences.map((preference) => ({
      tagSlug: preference.tagSlug,
      tagName: preference.tagName,
      tagKind: preference.tagKind,
      preferenceType: preference.preferenceType,
    })),
    savedOpportunities: dashboard.savedOpportunities.map((saved) =>
      toCatalogOpportunity(saved.opportunity)
    ),
    enrolledCourses: await attachCourseListData(dashboard.enrolledCourses),
    upcomingDeadlines: dashboard.upcomingDeadlines.map(toCatalogOpportunity),
    recommendedOpportunities:
      dashboard.recommendations.opportunities.map(toCatalogOpportunity),
    recommendedCourses: await attachCourseListData(
      dashboard.recommendations.courses
    ),
  }
}

async function attachCourseListData(
  courses: CourseSummary[]
): Promise<CatalogCourse[]> {
  if (courses.length === 0) {
    return []
  }

  const db = getServerDb()
  const courseIds = courses.map((course) => course.id)
  const lessonRows = await db
    .select()
    .from(lessonTable)
    .where(inArray(lessonTable.courseId, courseIds))
    .orderBy(asc(lessonTable.position))

  const lessonsByCourseId = new Map<string, typeof lessonRows>()

  for (const lesson of lessonRows) {
    const courseLessons = lessonsByCourseId.get(lesson.courseId) ?? []
    courseLessons.push(lesson)
    lessonsByCourseId.set(lesson.courseId, courseLessons)
  }

  return courses.map((course) => {
    const lessons = lessonsByCourseId.get(course.id) ?? []
    const totalMinutes = sumLessonMinutes(lessons)

    return {
      ...toBaseCatalogCourse(course),
      lessonCount: lessons.length,
      previewLesson: previewLessonForCourse(course.id, lessons),
      totalMinutes,
      durationLabel: formatCourseDuration(totalMinutes, course.estimatedHours),
    }
  })
}

function toCatalogCourseDetail(course: CourseDetail): CatalogCourseDetail {
  const lessons = course.lessons.map(toCatalogLesson)
  const totalMinutes = sumLessonMinutes(lessons)

  return {
    ...toBaseCatalogCourse(course),
    lessonCount: lessons.length,
    previewLesson: previewLessonForCourse(course.id, lessons),
    totalMinutes,
    durationLabel: formatCourseDuration(totalMinutes, course.estimatedHours),
    lessons,
  }
}

function toBaseCatalogCourse(
  course: CourseSummary
): Omit<
  CatalogCourse,
  "lessonCount" | "previewLesson" | "totalMinutes" | "durationLabel"
> {
  return {
    id: course.id,
    slug: course.slug,
    title: course.title,
    summary: course.summary,
    description: course.description,
    difficulty: course.difficulty,
    estimatedHours: course.estimatedHours,
    thumbnailUrl: course.thumbnailUrl,
    tags: course.tags.map(toCatalogTag),
    isEnrolled: Boolean(course.enrollment),
    enrollmentStatus: course.enrollment?.status ?? null,
    progressPercent: course.enrollment?.progressPercent ?? 0,
  }
}

function toCatalogOpportunity(
  opportunity: OpportunityWithTags
): CatalogOpportunity {
  const deadlineAt = opportunity.deadlineAt.toISOString()
  const startsAt = opportunity.startsAt?.toISOString() ?? null
  const endsAt = opportunity.endsAt?.toISOString() ?? null

  return {
    id: opportunity.id,
    slug: opportunity.slug,
    title: opportunity.title,
    summary: opportunity.summary,
    description: opportunity.description,
    category: opportunity.category,
    format: opportunity.format,
    providerName: opportunity.providerName,
    location: opportunity.location,
    country: opportunity.country,
    city: opportunity.city,
    minGrade: opportunity.minGrade,
    maxGrade: opportunity.maxGrade,
    deadlineAt,
    startsAt,
    endsAt,
    applyUrl: opportunity.applyUrl,
    requirements: opportunity.requirements,
    tags: opportunity.tags.map(toCatalogTag),
    isSaved: Boolean(opportunity.savedOpportunity),
    savedStatus: opportunity.savedOpportunity?.status ?? null,
    deadlineLabel: formatDate(deadlineAt),
    deadlineShortLabel: formatShortDate(deadlineAt),
    gradeLabel: formatGradeRange(opportunity.minGrade, opportunity.maxGrade),
    durationLabel: formatDuration(startsAt, endsAt),
  }
}

function toCatalogLesson(lesson: LessonWithProgress): CatalogLesson {
  return {
    id: lesson.id,
    slug: lesson.slug,
    title: lesson.title,
    summary: lesson.summary,
    content: lesson.content,
    videoUrl: lesson.videoUrl,
    materials: lesson.materials,
    assignmentPrompt: lesson.assignmentPrompt,
    durationMinutes: lesson.durationMinutes,
    position: lesson.position,
    isPreview: lesson.isPreview,
    quizCount: lesson.questions.length,
    progressStatus: lesson.progress?.status ?? null,
    progressPercent: lesson.progress?.progressPercent ?? 0,
    quizScorePercent: lesson.progress?.quizScorePercent ?? null,
    quizQuestions: lesson.questions.map((question) => ({
      id: question.id,
      type: question.type,
      prompt: question.prompt,
      options: question.options.map((option) => ({
        id: option.id,
        label: option.label,
      })),
    })),
  }
}

function toCatalogTag(
  tag: Pick<Tag, "id" | "slug" | "name" | "kind" | "color">
): CatalogTag {
  return {
    id: tag.id,
    slug: tag.slug,
    name: tag.name,
    kind: tag.kind,
    color: tag.color,
  }
}

function resolveDeadlineRange(deadline: "30" | "90" | undefined) {
  if (!deadline) {
    return null
  }

  const from = new Date()
  const to = new Date(from.getTime() + Number(deadline) * 86_400_000)

  return { from, to }
}

function toLessonPreview(
  lesson: Pick<CatalogLesson, "id" | "title" | "durationMinutes">
): CatalogLessonPreview {
  return {
    id: lesson.id,
    title: lesson.title,
    durationMinutes: lesson.durationMinutes,
  }
}

function emptyLessonPreview(courseId: string): CatalogLessonPreview {
  return {
    id: `${courseId}:empty-preview`,
    title: "Lessons coming soon",
    durationMinutes: 0,
  }
}

function previewLessonForCourse(
  courseId: string,
  lessons: Array<
    Pick<CatalogLesson, "id" | "title" | "durationMinutes" | "isPreview">
  >
): CatalogLessonPreview {
  if (lessons.length === 0) {
    return emptyLessonPreview(courseId)
  }

  return toLessonPreview(
    lessons.find((lesson) => lesson.isPreview) ?? lessons[0]
  )
}

function sumLessonMinutes(
  lessons: Array<Pick<typeof lessonTable.$inferSelect, "durationMinutes">>
) {
  return lessons.reduce((sum, lesson) => sum + (lesson.durationMinutes ?? 0), 0)
}
