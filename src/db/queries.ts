import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNull,
  like,
  lte,
  or,
} from "drizzle-orm"
import type { SQL } from "drizzle-orm"

import type { AppDb } from "@/db"
import {
  course,
  courseEnrollment,
  courseTag,
  lesson,
  lessonProgress,
  opportunity,
  opportunityTag,
  quizAttempt,
  quizOption,
  quizQuestion,
  savedOpportunity,
  studentProfile,
  tag,
  userTagPreference,
} from "@/db/schema"
import type {
  courseDifficulties,
  enrollmentStatuses,
  lessonProgressStatuses,
  opportunityCategories,
  opportunityFormats,
  preferenceTypes,
  savedOpportunityStatuses,
  tagKinds,
} from "@/db/schema"

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 50

export type TagKind = (typeof tagKinds)[number]
export type PreferenceType = (typeof preferenceTypes)[number]
export type OpportunityCategory = (typeof opportunityCategories)[number]
export type OpportunityFormat = (typeof opportunityFormats)[number]
export type SavedOpportunityStatus = (typeof savedOpportunityStatuses)[number]
export type CourseDifficulty = (typeof courseDifficulties)[number]
export type EnrollmentStatus = (typeof enrollmentStatuses)[number]
export type LessonProgressStatus = (typeof lessonProgressStatuses)[number]

export type Tag = typeof tag.$inferSelect
export type Opportunity = typeof opportunity.$inferSelect
export type SavedOpportunity = typeof savedOpportunity.$inferSelect
export type Course = typeof course.$inferSelect
export type Lesson = typeof lesson.$inferSelect
export type CourseEnrollment = typeof courseEnrollment.$inferSelect
export type LessonProgress = typeof lessonProgress.$inferSelect
export type QuizQuestion = typeof quizQuestion.$inferSelect
export type QuizOption = typeof quizOption.$inferSelect

export interface OpportunityWithTags extends Opportunity {
  tags: Tag[]
  savedOpportunity: SavedOpportunity | null
}

export interface CourseSummary extends Course {
  tags: Tag[]
  enrollment: CourseEnrollment | null
}

export interface LessonWithProgress extends Lesson {
  progress: LessonProgress | null
  questions: Array<QuizQuestion & { options: QuizOption[] }>
}

export interface CourseDetail extends CourseSummary {
  lessons: LessonWithProgress[]
}

export interface ListOpportunitiesInput {
  categories?: OpportunityCategory[]
  formats?: OpportunityFormat[]
  grades?: number[]
  tagSlugs?: string[]
  search?: string
  deadlineFrom?: Date
  deadlineTo?: Date
  publishedOnly?: boolean
  userId?: string
  sort?: "deadline" | "featured" | "newest"
  limit?: number
  offset?: number
}

export interface ListCoursesInput {
  difficulties?: CourseDifficulty[]
  tagSlugs?: string[]
  search?: string
  publishedOnly?: boolean
  userId?: string
  sort?: "featured" | "newest" | "title"
  limit?: number
  offset?: number
}

export interface StudentDashboard {
  profile: typeof studentProfile.$inferSelect | null
  savedOpportunities: Array<{
    savedOpportunity: SavedOpportunity
    opportunity: OpportunityWithTags
  }>
  enrolledCourses: CourseSummary[]
  upcomingDeadlines: OpportunityWithTags[]
  recommendations: RecommendationResult
}

export interface RecommendationResult {
  opportunities: OpportunityWithTags[]
  courses: CourseSummary[]
}

type FacetTag = Pick<Tag, "id" | "slug" | "name" | "kind" | "color">

export interface OpportunityCatalogFacets {
  total: number
  tags: FacetTag[]
  categories: OpportunityCategory[]
  formats: OpportunityFormat[]
}

export interface CourseCatalogFacets {
  total: number
  tags: FacetTag[]
  difficulties: CourseDifficulty[]
}

export async function listTags(db: AppDb, kind?: TagKind): Promise<Tag[]> {
  const conditions = kind ? eq(tag.kind, kind) : undefined

  return db
    .select()
    .from(tag)
    .where(conditions)
    .orderBy(asc(tag.kind), asc(tag.name))
}

export async function upsertStudentProfile(
  db: AppDb,
  input: Omit<typeof studentProfile.$inferInsert, "createdAt" | "updatedAt">
) {
  const now = new Date()

  await db
    .insert(studentProfile)
    .values(input)
    .onConflictDoUpdate({
      target: studentProfile.userId,
      set: {
        ...(input.role && { role: input.role }),
        grade: input.grade,
        country: input.country ?? "Kazakhstan",
        city: input.city,
        locale: input.locale ?? "en",
        timezone: input.timezone ?? "Asia/Almaty",
        onboardingCompleted: input.onboardingCompleted ?? false,
        updatedAt: now,
      },
    })

  return getStudentProfile(db, input.userId)
}

export async function getStudentProfile(db: AppDb, userId: string) {
  const profiles = await db
    .select()
    .from(studentProfile)
    .where(eq(studentProfile.userId, userId))
    .limit(1)

  return profiles.at(0) ?? null
}

export async function setUserTagPreferences(
  db: AppDb,
  input: {
    userId: string
    preferences: Array<{
      tagId: string
      preferenceType: PreferenceType
      weight?: number
    }>
  }
) {
  const preferenceKinds = [
    ...new Set(
      input.preferences.map((preference) => preference.preferenceType)
    ),
  ]

  const deleteStatement =
    preferenceKinds.length > 0
      ? db
          .delete(userTagPreference)
          .where(
            and(
              eq(userTagPreference.userId, input.userId),
              inArray(userTagPreference.preferenceType, preferenceKinds)
            )
          )
      : null

  const insertStatement =
    input.preferences.length > 0
      ? db.insert(userTagPreference).values(
          input.preferences.map((preference) => ({
            userId: input.userId,
            tagId: preference.tagId,
            preferenceType: preference.preferenceType,
            weight: preference.weight ?? 1,
          }))
        )
      : null

  // Replace the affected preference kinds atomically so a mid-write failure
  // can't leave the user with deleted-but-not-reinserted preferences.
  if (deleteStatement && insertStatement) {
    await db.batch([deleteStatement, insertStatement])
  } else if (deleteStatement) {
    await deleteStatement
  } else if (insertStatement) {
    await insertStatement
  }

  return getUserTagPreferences(db, input.userId)
}

export async function getUserTagPreferences(db: AppDb, userId: string) {
  return db
    .select({
      userId: userTagPreference.userId,
      preferenceType: userTagPreference.preferenceType,
      weight: userTagPreference.weight,
      tagId: tag.id,
      tagSlug: tag.slug,
      tagName: tag.name,
      tagKind: tag.kind,
      tagColor: tag.color,
    })
    .from(userTagPreference)
    .innerJoin(tag, eq(userTagPreference.tagId, tag.id))
    .where(eq(userTagPreference.userId, userId))
    .orderBy(asc(userTagPreference.preferenceType), asc(tag.name))
}

export async function listOpportunities(
  db: AppDb,
  input: ListOpportunitiesInput = {}
): Promise<OpportunityWithTags[]> {
  const tagFilteredIds = await findOpportunityIdsByTagSlugs(db, input.tagSlugs)

  if (input.tagSlugs?.length && tagFilteredIds.length === 0) {
    return []
  }

  const conditions: SQL[] = []

  if (input.publishedOnly ?? true) {
    conditions.push(eq(opportunity.isPublished, true))
  }

  if (input.categories?.length) {
    conditions.push(inArray(opportunity.category, input.categories))
  }

  if (input.formats?.length) {
    conditions.push(inArray(opportunity.format, input.formats))
  }

  if (input.grades?.length) {
    const gradeConditions = input.grades.map(
      (grade) =>
        and(
          or(isNull(opportunity.minGrade), lte(opportunity.minGrade, grade)),
          or(isNull(opportunity.maxGrade), gte(opportunity.maxGrade, grade))
        )!
    )
    conditions.push(or(...gradeConditions)!)
  }

  if (input.deadlineFrom) {
    conditions.push(gte(opportunity.deadlineAt, input.deadlineFrom))
  }

  if (input.deadlineTo) {
    conditions.push(lte(opportunity.deadlineAt, input.deadlineTo))
  }

  const searchCondition = buildOpportunitySearchCondition(input.search)
  if (searchCondition) {
    conditions.push(searchCondition)
  }

  if (tagFilteredIds.length > 0) {
    conditions.push(inArray(opportunity.id, tagFilteredIds))
  }

  const rows = await db
    .select()
    .from(opportunity)
    .where(and(...conditions))
    .orderBy(...getOpportunityOrdering(input.sort))
    .limit(clampLimit(input.limit))
    .offset(input.offset ?? 0)

  return attachOpportunityData(db, rows, input.userId)
}

export async function getOpportunityBySlug(
  db: AppDb,
  slug: string,
  input: { userId?: string; publishedOnly?: boolean } = {}
) {
  const conditions = [eq(opportunity.slug, slug)]

  if (input.publishedOnly ?? true) {
    conditions.push(eq(opportunity.isPublished, true))
  }

  const rows = await db
    .select()
    .from(opportunity)
    .where(and(...conditions))
    .limit(1)
  const row = rows.at(0)

  if (!row) {
    return null
  }

  const [withTags] = await attachOpportunityData(db, [row], input.userId)
  return withTags
}

export async function saveOpportunity(
  db: AppDb,
  input: {
    userId: string
    opportunityId: string
    status?: SavedOpportunityStatus
    reminderAt?: Date | null
    notes?: string | null
  }
) {
  const now = new Date()

  await db
    .insert(savedOpportunity)
    .values({
      userId: input.userId,
      opportunityId: input.opportunityId,
      status: input.status ?? "saved",
      reminderAt: input.reminderAt ?? null,
      notes: input.notes ?? null,
    })
    .onConflictDoUpdate({
      target: [savedOpportunity.userId, savedOpportunity.opportunityId],
      set: {
        status: input.status ?? "saved",
        reminderAt: input.reminderAt ?? null,
        notes: input.notes ?? null,
        updatedAt: now,
      },
    })

  return getSavedOpportunity(db, input.userId, input.opportunityId)
}

export async function getSavedOpportunity(
  db: AppDb,
  userId: string,
  opportunityId: string
) {
  const rows = await db
    .select()
    .from(savedOpportunity)
    .where(
      and(
        eq(savedOpportunity.userId, userId),
        eq(savedOpportunity.opportunityId, opportunityId)
      )
    )
    .limit(1)

  return rows.at(0) ?? null
}

export async function removeSavedOpportunity(
  db: AppDb,
  input: { userId: string; opportunityId: string }
) {
  await db
    .delete(savedOpportunity)
    .where(
      and(
        eq(savedOpportunity.userId, input.userId),
        eq(savedOpportunity.opportunityId, input.opportunityId)
      )
    )
}

export async function listSavedOpportunities(
  db: AppDb,
  userId: string,
  input: { limit?: number; offset?: number } = {}
) {
  const savedRows = await db
    .select()
    .from(savedOpportunity)
    .where(eq(savedOpportunity.userId, userId))
    .orderBy(desc(savedOpportunity.updatedAt))
    .limit(clampLimit(input.limit))
    .offset(input.offset ?? 0)

  if (savedRows.length === 0) {
    return []
  }

  const opportunityRows = await db
    .select()
    .from(opportunity)
    .where(
      and(
        inArray(
          opportunity.id,
          savedRows.map((saved) => saved.opportunityId)
        ),
        eq(opportunity.isPublished, true)
      )
    )

  const opportunities = await attachOpportunityData(db, opportunityRows, userId)
  const opportunityById = new Map(
    opportunities.map((opportunityRow) => [opportunityRow.id, opportunityRow])
  )

  return savedRows.flatMap((saved) => {
    const opportunityRow = opportunityById.get(saved.opportunityId)
    return opportunityRow
      ? [{ savedOpportunity: saved, opportunity: opportunityRow }]
      : []
  })
}

export async function listCourses(
  db: AppDb,
  input: ListCoursesInput = {}
): Promise<CourseSummary[]> {
  const tagFilteredIds = await findCourseIdsByTagSlugs(db, input.tagSlugs)

  if (input.tagSlugs?.length && tagFilteredIds.length === 0) {
    return []
  }

  const conditions: SQL[] = []

  if (input.publishedOnly ?? true) {
    conditions.push(eq(course.isPublished, true))
  }

  if (input.difficulties?.length) {
    conditions.push(inArray(course.difficulty, input.difficulties))
  }

  const searchCondition = buildCourseSearchCondition(input.search)
  if (searchCondition) {
    conditions.push(searchCondition)
  }

  if (tagFilteredIds.length > 0) {
    conditions.push(inArray(course.id, tagFilteredIds))
  }

  const rows = await db
    .select()
    .from(course)
    .where(and(...conditions))
    .orderBy(...getCourseOrdering(input.sort))
    .limit(clampLimit(input.limit))
    .offset(input.offset ?? 0)

  return attachCourseData(db, rows, input.userId)
}

export async function getCourseBySlug(
  db: AppDb,
  slug: string,
  input: { userId?: string; publishedOnly?: boolean } = {}
): Promise<CourseDetail | null> {
  const conditions = [eq(course.slug, slug)]

  if (input.publishedOnly ?? true) {
    conditions.push(eq(course.isPublished, true))
  }

  const rows = await db
    .select()
    .from(course)
    .where(and(...conditions))
    .limit(1)
  const row = rows.at(0)

  if (!row) {
    return null
  }

  const [summary] = await attachCourseData(db, [row], input.userId)

  return {
    ...summary,
    lessons: await listCourseLessons(db, row.id, input.userId),
  }
}

export async function getOpportunityCatalogFacets(
  db: AppDb
): Promise<OpportunityCatalogFacets> {
  // Facets describe the whole published catalog (not the current filter), so
  // the sidebar keeps offering every option a learner could switch to.
  const [totals, valueRows, tagRows] = await Promise.all([
    db
      .select({ value: count() })
      .from(opportunity)
      .where(eq(opportunity.isPublished, true)),
    db
      .selectDistinct({
        category: opportunity.category,
        format: opportunity.format,
      })
      .from(opportunity)
      .where(eq(opportunity.isPublished, true)),
    db
      .selectDistinct({
        id: tag.id,
        slug: tag.slug,
        name: tag.name,
        kind: tag.kind,
        color: tag.color,
      })
      .from(opportunityTag)
      .innerJoin(opportunity, eq(opportunityTag.opportunityId, opportunity.id))
      .innerJoin(tag, eq(opportunityTag.tagId, tag.id))
      .where(
        and(
          eq(opportunity.isPublished, true),
          inArray(tag.kind, ["field", "subject"])
        )
      )
      .orderBy(asc(tag.name)),
  ])

  return {
    total: totals.at(0)?.value ?? 0,
    tags: tagRows,
    categories: [...new Set(valueRows.map((row) => row.category))].sort(),
    formats: [...new Set(valueRows.map((row) => row.format))].sort(),
  }
}

export async function getCourseCatalogFacets(
  db: AppDb
): Promise<CourseCatalogFacets> {
  const [totals, valueRows, tagRows] = await Promise.all([
    db
      .select({ value: count() })
      .from(course)
      .where(eq(course.isPublished, true)),
    db
      .selectDistinct({ difficulty: course.difficulty })
      .from(course)
      .where(eq(course.isPublished, true)),
    db
      .selectDistinct({
        id: tag.id,
        slug: tag.slug,
        name: tag.name,
        kind: tag.kind,
        color: tag.color,
      })
      .from(courseTag)
      .innerJoin(course, eq(courseTag.courseId, course.id))
      .innerJoin(tag, eq(courseTag.tagId, tag.id))
      .where(
        and(
          eq(course.isPublished, true),
          inArray(tag.kind, ["subject", "goal"])
        )
      )
      .orderBy(asc(tag.name)),
  ])

  return {
    total: totals.at(0)?.value ?? 0,
    tags: tagRows,
    difficulties: [...new Set(valueRows.map((row) => row.difficulty))].sort(),
  }
}

export async function enrollInCourse(
  db: AppDb,
  input: { userId: string; courseId: string }
) {
  const firstLessons = await db
    .select()
    .from(lesson)
    .where(eq(lesson.courseId, input.courseId))
    .orderBy(asc(lesson.position))
    .limit(1)
  const firstLesson = firstLessons.at(0) ?? null

  const now = new Date()

  await db
    .insert(courseEnrollment)
    .values({
      userId: input.userId,
      courseId: input.courseId,
      currentLessonId: firstLesson?.id ?? null,
      status: "active",
      progressPercent: 0,
    })
    .onConflictDoUpdate({
      target: [courseEnrollment.userId, courseEnrollment.courseId],
      set: {
        // Reactivate without clobbering the learner's current lesson or
        // progress; refreshCourseEnrollmentProgress owns currentLessonId.
        status: "active",
        updatedAt: now,
      },
    })

  return getCourseEnrollment(db, input.userId, input.courseId)
}

export async function ensureEnrollment(
  db: AppDb,
  input: { userId: string; courseId: string }
) {
  const existing = await getCourseEnrollment(db, input.userId, input.courseId)

  if (existing) {
    return existing
  }

  return enrollInCourse(db, input)
}

export async function getCourseEnrollment(
  db: AppDb,
  userId: string,
  courseId: string
) {
  const rows = await db
    .select()
    .from(courseEnrollment)
    .where(
      and(
        eq(courseEnrollment.userId, userId),
        eq(courseEnrollment.courseId, courseId)
      )
    )
    .limit(1)

  return rows.at(0) ?? null
}

export async function updateLessonProgress(
  db: AppDb,
  input: {
    userId: string
    lessonId: string
    status?: LessonProgressStatus
    progressPercent?: number
    assignmentAnswer?: string | null
    quizScorePercent?: number | null
  }
) {
  const lessonRows = await db
    .select()
    .from(lesson)
    .where(eq(lesson.id, input.lessonId))
    .limit(1)
  const lessonRow = lessonRows.at(0)

  if (!lessonRow) {
    throw new Error(`Lesson not found: ${input.lessonId}`)
  }

  const status =
    input.status ??
    (input.progressPercent === 100 ? "completed" : "in_progress")
  const progressPercent =
    input.progressPercent ?? (status === "completed" ? 100 : 50)
  const now = new Date()

  await db
    .insert(lessonProgress)
    .values({
      userId: input.userId,
      lessonId: input.lessonId,
      courseId: lessonRow.courseId,
      status,
      progressPercent,
      assignmentAnswer: input.assignmentAnswer ?? null,
      quizScorePercent: input.quizScorePercent ?? null,
      lastViewedAt: now,
      completedAt: status === "completed" ? now : null,
    })
    .onConflictDoUpdate({
      target: [lessonProgress.userId, lessonProgress.lessonId],
      set: {
        status,
        progressPercent,
        assignmentAnswer: input.assignmentAnswer ?? null,
        quizScorePercent: input.quizScorePercent ?? null,
        lastViewedAt: now,
        completedAt: status === "completed" ? now : null,
        updatedAt: now,
      },
    })

  await refreshCourseEnrollmentProgress(db, input.userId, lessonRow.courseId)

  const rows = await db
    .select()
    .from(lessonProgress)
    .where(
      and(
        eq(lessonProgress.userId, input.userId),
        eq(lessonProgress.lessonId, input.lessonId)
      )
    )
    .limit(1)

  return rows.at(0) ?? null
}

export async function recordQuizAttempt(
  db: AppDb,
  input: {
    userId: string
    lessonId: string
    scorePercent: number
    correctAnswers: number
    totalQuestions: number
    answers: typeof quizAttempt.$inferInsert.answers
  }
) {
  const attemptId = crypto.randomUUID()

  await db.insert(quizAttempt).values({
    id: attemptId,
    userId: input.userId,
    lessonId: input.lessonId,
    scorePercent: input.scorePercent,
    correctAnswers: input.correctAnswers,
    totalQuestions: input.totalQuestions,
    answers: input.answers,
  })

  await updateLessonProgress(db, {
    userId: input.userId,
    lessonId: input.lessonId,
    status: "completed",
    progressPercent: 100,
    quizScorePercent: input.scorePercent,
  })

  const rows = await db
    .select()
    .from(quizAttempt)
    .where(eq(quizAttempt.id, attemptId))
    .limit(1)

  return rows.at(0) ?? null
}

export async function getStudentDashboard(
  db: AppDb,
  userId: string
): Promise<StudentDashboard> {
  const [profile, savedOpportunities, enrolledCourses, recommendations] =
    await Promise.all([
      getStudentProfile(db, userId),
      listSavedOpportunities(db, userId, { limit: 8 }),
      listEnrolledCourses(db, userId),
      getRecommendations(db, userId, { limit: 6 }),
    ])

  return {
    profile,
    savedOpportunities,
    enrolledCourses,
    upcomingDeadlines: savedOpportunities
      .map((saved) => saved.opportunity)
      .filter((row) => row.deadlineAt.getTime() >= Date.now())
      .sort(
        (first, second) =>
          first.deadlineAt.getTime() - second.deadlineAt.getTime()
      )
      .slice(0, 5),
    recommendations,
  }
}

export async function listEnrolledCourses(db: AppDb, userId: string) {
  const enrollments = await db
    .select()
    .from(courseEnrollment)
    .where(eq(courseEnrollment.userId, userId))
    .orderBy(desc(courseEnrollment.updatedAt))

  if (enrollments.length === 0) {
    return []
  }

  const courses = await db
    .select()
    .from(course)
    .where(
      inArray(
        course.id,
        enrollments.map((enrollment) => enrollment.courseId)
      )
    )

  return attachCourseData(db, courses, userId)
}

export async function getRecommendations(
  db: AppDb,
  userId: string,
  input: { limit?: number } = {}
): Promise<RecommendationResult> {
  const limit = clampLimit(input.limit)
  const preferences = await db
    .select()
    .from(userTagPreference)
    .where(eq(userTagPreference.userId, userId))

  if (preferences.length === 0) {
    const [opportunities, courses] = await Promise.all([
      listOpportunities(db, { userId, sort: "featured", limit }),
      listCourses(db, { userId, sort: "featured", limit }),
    ])

    return { opportunities, courses }
  }

  const preferenceWeightByTagId = new Map(
    preferences.map((preference) => [preference.tagId, preference.weight])
  )
  const tagIds = [...preferenceWeightByTagId.keys()]
  const [opportunityIds, courseIds] = await Promise.all([
    rankOpportunityIdsByTags(db, tagIds, preferenceWeightByTagId, limit),
    rankCourseIdsByTags(db, tagIds, preferenceWeightByTagId, limit),
  ])

  const [opportunityRows, courseRows] = await Promise.all([
    opportunityIds.length
      ? db
          .select()
          .from(opportunity)
          .where(
            and(
              eq(opportunity.isPublished, true),
              inArray(opportunity.id, opportunityIds)
            )
          )
      : [],
    courseIds.length
      ? db
          .select()
          .from(course)
          .where(
            and(eq(course.isPublished, true), inArray(course.id, courseIds))
          )
      : [],
  ])

  const opportunityRank = new Map(
    opportunityIds.map((opportunityId, index) => [opportunityId, index])
  )
  const courseRank = new Map(
    courseIds.map((courseId, index) => [courseId, index])
  )

  opportunityRows.sort(
    (first, second) =>
      (opportunityRank.get(first.id) ?? 0) -
      (opportunityRank.get(second.id) ?? 0)
  )
  courseRows.sort(
    (first, second) =>
      (courseRank.get(first.id) ?? 0) - (courseRank.get(second.id) ?? 0)
  )

  return {
    opportunities: await attachOpportunityData(db, opportunityRows, userId),
    courses: await attachCourseData(db, courseRows, userId),
  }
}

async function listCourseLessons(
  db: AppDb,
  courseId: string,
  userId?: string
): Promise<LessonWithProgress[]> {
  const lessonRows = await db
    .select()
    .from(lesson)
    .where(eq(lesson.courseId, courseId))
    .orderBy(asc(lesson.position))

  if (lessonRows.length === 0) {
    return []
  }

  const lessonIds = lessonRows.map((lessonRow) => lessonRow.id)
  const [progressRows, questionRows, optionRows] = await Promise.all([
    userId
      ? db
          .select()
          .from(lessonProgress)
          .where(
            and(
              eq(lessonProgress.userId, userId),
              inArray(lessonProgress.lessonId, lessonIds)
            )
          )
      : [],
    db
      .select()
      .from(quizQuestion)
      .where(inArray(quizQuestion.lessonId, lessonIds))
      .orderBy(asc(quizQuestion.position)),
    db
      .select()
      .from(quizOption)
      .innerJoin(quizQuestion, eq(quizOption.questionId, quizQuestion.id))
      .where(inArray(quizQuestion.lessonId, lessonIds))
      .orderBy(asc(quizOption.position)),
  ])

  const progressByLessonId = new Map(
    progressRows.map((progress) => [progress.lessonId, progress])
  )
  const optionsByQuestionId = new Map<string, QuizOption[]>()

  for (const optionRow of optionRows) {
    const options =
      optionsByQuestionId.get(optionRow.quiz_option.questionId) ?? []
    options.push(optionRow.quiz_option)
    optionsByQuestionId.set(optionRow.quiz_option.questionId, options)
  }

  const questionsByLessonId = new Map<
    string,
    Array<QuizQuestion & { options: QuizOption[] }>
  >()

  for (const questionRow of questionRows) {
    const questions = questionsByLessonId.get(questionRow.lessonId) ?? []
    questions.push({
      ...questionRow,
      options: optionsByQuestionId.get(questionRow.id) ?? [],
    })
    questionsByLessonId.set(questionRow.lessonId, questions)
  }

  return lessonRows.map((lessonRow) => ({
    ...lessonRow,
    progress: progressByLessonId.get(lessonRow.id) ?? null,
    questions: questionsByLessonId.get(lessonRow.id) ?? [],
  }))
}

async function attachOpportunityData(
  db: AppDb,
  rows: Opportunity[],
  userId?: string
): Promise<OpportunityWithTags[]> {
  if (rows.length === 0) {
    return []
  }

  const ids = rows.map((row) => row.id)
  const [tagRows, savedRows] = await Promise.all([
    db
      .select({
        entityId: opportunityTag.opportunityId,
        id: tag.id,
        slug: tag.slug,
        name: tag.name,
        kind: tag.kind,
        color: tag.color,
        createdAt: tag.createdAt,
        updatedAt: tag.updatedAt,
      })
      .from(opportunityTag)
      .innerJoin(tag, eq(opportunityTag.tagId, tag.id))
      .where(inArray(opportunityTag.opportunityId, ids))
      .orderBy(asc(tag.name)),
    userId
      ? db
          .select()
          .from(savedOpportunity)
          .where(
            and(
              eq(savedOpportunity.userId, userId),
              inArray(savedOpportunity.opportunityId, ids)
            )
          )
      : [],
  ])

  const tagsById = groupTagsByEntityId(tagRows)
  const savedByOpportunityId = new Map(
    savedRows.map((saved) => [saved.opportunityId, saved])
  )

  return rows.map((row) => ({
    ...row,
    tags: tagsById.get(row.id) ?? [],
    savedOpportunity: savedByOpportunityId.get(row.id) ?? null,
  }))
}

async function attachCourseData(
  db: AppDb,
  rows: Course[],
  userId?: string
): Promise<CourseSummary[]> {
  if (rows.length === 0) {
    return []
  }

  const ids = rows.map((row) => row.id)
  const [tagRows, enrollmentRows] = await Promise.all([
    db
      .select({
        entityId: courseTag.courseId,
        id: tag.id,
        slug: tag.slug,
        name: tag.name,
        kind: tag.kind,
        color: tag.color,
        createdAt: tag.createdAt,
        updatedAt: tag.updatedAt,
      })
      .from(courseTag)
      .innerJoin(tag, eq(courseTag.tagId, tag.id))
      .where(inArray(courseTag.courseId, ids))
      .orderBy(asc(tag.name)),
    userId
      ? db
          .select()
          .from(courseEnrollment)
          .where(
            and(
              eq(courseEnrollment.userId, userId),
              inArray(courseEnrollment.courseId, ids)
            )
          )
      : [],
  ])

  const tagsById = groupTagsByEntityId(tagRows)
  const enrollmentByCourseId = new Map(
    enrollmentRows.map((enrollment) => [enrollment.courseId, enrollment])
  )

  return rows.map((row) => ({
    ...row,
    tags: tagsById.get(row.id) ?? [],
    enrollment: enrollmentByCourseId.get(row.id) ?? null,
  }))
}

async function findOpportunityIdsByTagSlugs(db: AppDb, tagSlugs?: string[]) {
  const slugs = uniqueNonEmpty(tagSlugs)

  if (slugs.length === 0) {
    return []
  }

  const rows = await db
    .select({
      entityId: opportunityTag.opportunityId,
      tagSlug: tag.slug,
    })
    .from(opportunityTag)
    .innerJoin(tag, eq(opportunityTag.tagId, tag.id))
    .where(inArray(tag.slug, slugs))

  return idsMatchingAllSlugs(rows, slugs.length)
}

async function findCourseIdsByTagSlugs(db: AppDb, tagSlugs?: string[]) {
  const slugs = uniqueNonEmpty(tagSlugs)

  if (slugs.length === 0) {
    return []
  }

  const rows = await db
    .select({
      entityId: courseTag.courseId,
      tagSlug: tag.slug,
    })
    .from(courseTag)
    .innerJoin(tag, eq(courseTag.tagId, tag.id))
    .where(inArray(tag.slug, slugs))

  return idsMatchingAllSlugs(rows, slugs.length)
}

async function rankOpportunityIdsByTags(
  db: AppDb,
  tagIds: string[],
  weightByTagId: Map<string, number>,
  limit: number
) {
  const rows = await db
    .select({
      opportunityId: opportunityTag.opportunityId,
      tagId: opportunityTag.tagId,
      deadlineAt: opportunity.deadlineAt,
      isFeatured: opportunity.isFeatured,
    })
    .from(opportunityTag)
    .innerJoin(opportunity, eq(opportunityTag.opportunityId, opportunity.id))
    .where(
      and(
        eq(opportunity.isPublished, true),
        inArray(opportunityTag.tagId, tagIds)
      )
    )

  return rankIds(
    rows,
    (row) => row.opportunityId,
    (row) => weightByTagId.get(row.tagId) ?? 1,
    (first, second) =>
      Number(second.isFeatured) - Number(first.isFeatured) ||
      first.deadlineAt.getTime() - second.deadlineAt.getTime(),
    limit
  )
}

async function rankCourseIdsByTags(
  db: AppDb,
  tagIds: string[],
  weightByTagId: Map<string, number>,
  limit: number
) {
  const rows = await db
    .select({
      courseId: courseTag.courseId,
      tagId: courseTag.tagId,
      title: course.title,
      isFeatured: course.isFeatured,
    })
    .from(courseTag)
    .innerJoin(course, eq(courseTag.courseId, course.id))
    .where(and(eq(course.isPublished, true), inArray(courseTag.tagId, tagIds)))

  return rankIds(
    rows,
    (row) => row.courseId,
    (row) => weightByTagId.get(row.tagId) ?? 1,
    (first, second) =>
      Number(second.isFeatured) - Number(first.isFeatured) ||
      first.title.localeCompare(second.title),
    limit
  )
}

async function refreshCourseEnrollmentProgress(
  db: AppDb,
  userId: string,
  courseId: string
) {
  const [lessons, completedRows] = await Promise.all([
    db
      .select({ id: lesson.id, position: lesson.position })
      .from(lesson)
      .where(eq(lesson.courseId, courseId))
      .orderBy(asc(lesson.position)),
    db
      .select({ lessonId: lessonProgress.lessonId })
      .from(lessonProgress)
      .where(
        and(
          eq(lessonProgress.userId, userId),
          eq(lessonProgress.courseId, courseId),
          eq(lessonProgress.status, "completed")
        )
      ),
  ])

  const completedLessonIds = new Set(completedRows.map((row) => row.lessonId))
  const progressPercent =
    lessons.length === 0
      ? 0
      : Math.round((completedLessonIds.size / lessons.length) * 100)
  const isComplete = lessons.length > 0 && progressPercent === 100
  // Advance the resume pointer to the first lesson still outstanding (null
  // once everything is done), so currentLessonId tracks real progress.
  const currentLessonId =
    lessons.find((lessonRow) => !completedLessonIds.has(lessonRow.id))?.id ??
    null
  const now = new Date()

  await db
    .insert(courseEnrollment)
    .values({
      userId,
      courseId,
      currentLessonId,
      status: isComplete ? "completed" : "active",
      progressPercent,
      completedAt: isComplete ? now : null,
    })
    .onConflictDoUpdate({
      target: [courseEnrollment.userId, courseEnrollment.courseId],
      set: {
        currentLessonId,
        status: isComplete ? "completed" : "active",
        progressPercent,
        completedAt: isComplete ? now : null,
        updatedAt: now,
      },
    })
}

function buildOpportunitySearchCondition(search?: string) {
  const pattern = buildSearchPattern(search)

  if (!pattern) {
    return undefined
  }

  return or(
    like(opportunity.title, pattern),
    like(opportunity.summary, pattern),
    like(opportunity.description, pattern),
    like(opportunity.providerName, pattern)
  )
}

function buildCourseSearchCondition(search?: string) {
  const pattern = buildSearchPattern(search)

  if (!pattern) {
    return undefined
  }

  return or(
    like(course.title, pattern),
    like(course.summary, pattern),
    like(course.description, pattern)
  )
}

function buildSearchPattern(search?: string) {
  const term = search?.trim()
  return term ? `%${term}%` : undefined
}

function getOpportunityOrdering(
  sort: ListOpportunitiesInput["sort"] = "deadline"
) {
  if (sort === "newest") {
    return [desc(opportunity.createdAt)]
  }

  if (sort === "featured") {
    return [desc(opportunity.isFeatured), asc(opportunity.deadlineAt)]
  }

  return [asc(opportunity.deadlineAt)]
}

function getCourseOrdering(sort: ListCoursesInput["sort"] = "featured") {
  if (sort === "newest") {
    return [desc(course.createdAt)]
  }

  if (sort === "title") {
    return [asc(course.title)]
  }

  return [desc(course.isFeatured), asc(course.title)]
}

function clampLimit(limit = DEFAULT_LIMIT) {
  return Math.min(Math.max(limit, 1), MAX_LIMIT)
}

function uniqueNonEmpty(values?: string[]) {
  return [
    ...new Set(values?.map((value) => value.trim()).filter(Boolean) ?? []),
  ]
}

function idsMatchingAllSlugs(
  rows: Array<{ entityId: string; tagSlug: string }>,
  expectedCount: number
) {
  const slugsByEntity = new Map<string, Set<string>>()

  for (const row of rows) {
    const slugs = slugsByEntity.get(row.entityId) ?? new Set<string>()
    slugs.add(row.tagSlug)
    slugsByEntity.set(row.entityId, slugs)
  }

  return [...slugsByEntity.entries()]
    .filter(([, slugs]) => slugs.size === expectedCount)
    .map(([entityId]) => entityId)
}

function groupTagsByEntityId(
  rows: Array<{ entityId: string } & Tag>
): Map<string, Tag[]> {
  const tagsById = new Map<string, Tag[]>()

  for (const { entityId, ...tagRow } of rows) {
    const entityTags = tagsById.get(entityId) ?? []
    entityTags.push(tagRow)
    tagsById.set(entityId, entityTags)
  }

  return tagsById
}

function rankIds<T>(
  rows: T[],
  getId: (row: T) => string,
  getWeight: (row: T) => number,
  tieBreaker: (first: T, second: T) => number,
  limit: number
) {
  const scoreById = new Map<string, number>()
  const firstRowById = new Map<string, T>()

  for (const row of rows) {
    const id = getId(row)
    scoreById.set(id, (scoreById.get(id) ?? 0) + getWeight(row))

    if (!firstRowById.has(id)) {
      firstRowById.set(id, row)
    }
  }

  return [...scoreById.entries()]
    .sort(([firstId, firstScore], [secondId, secondScore]) => {
      const scoreDifference = secondScore - firstScore

      if (scoreDifference !== 0) {
        return scoreDifference
      }

      const firstRow = firstRowById.get(firstId)
      const secondRow = firstRowById.get(secondId)

      if (!firstRow || !secondRow) {
        return 0
      }

      return tieBreaker(firstRow, secondRow)
    })
    .slice(0, limit)
    .map(([id]) => id)
}
