import "@tanstack/react-start/server-only"

import { and, asc, eq, inArray } from "drizzle-orm"

import {
  course,
  courseTag,
  lesson,
  opportunity,
  opportunityTag,
  quizOption,
  quizQuestion,
  tag,
} from "@/db/schema"
import {
  enrollInCourse,
  ensureEnrollment,
  getCourseEnrollment,
  getSavedOpportunity,
  listTags,
  recordQuizAttempt,
  removeSavedOpportunity,
  saveOpportunity,
  setUserTagPreferences,
  updateLessonProgress,
  upsertStudentProfile,
} from "@/db/queries"
import { actionError, actionOk } from "@/lib/action-result"
import { getServerDb } from "@/lib/db.server"
import {
  requireAdmin,
  requireCompletedProfile,
  requireUser,
} from "@/lib/user-context.server"
import type {
  AdminDeleteCourseInput,
  AdminDeleteLessonInput,
  AdminDeleteOpportunityInput,
  AdminUpsertCourseInput,
  AdminUpsertLessonInput,
  AdminUpsertOpportunityInput,
  CompleteOnboardingInput,
  EnrollCourseInput,
  MarkLessonCompleteInput,
  SubmitLessonQuizInput,
  ToggleSavedOpportunityInput,
} from "@/lib/validation"

export async function completeOnboardingAction(input: CompleteOnboardingInput) {
  const context = await requireUser("/onboarding")
  const db = getServerDb()
  const selectedSlugs = uniqueSlugs([
    ...input.interests,
    ...input.subjects,
    ...input.goals,
  ])
  const selectedTags = selectedSlugs.length
    ? await db.select().from(tag).where(inArray(tag.slug, selectedSlugs))
    : []
  const tagBySlug = new Map(selectedTags.map((row) => [row.slug, row]))

  if (selectedTags.length !== selectedSlugs.length) {
    return actionError("One of the selected tags is no longer available.")
  }

  await upsertStudentProfile(db, {
    userId: context.user.id,
    role: context.profile?.role,
    grade: input.grade,
    country: context.profile?.country ?? "Kazakhstan",
    city: context.profile?.city ?? null,
    locale: context.profile?.locale ?? "en",
    timezone: context.profile?.timezone ?? "Asia/Almaty",
    onboardingCompleted: true,
  })

  await setUserTagPreferences(db, {
    userId: context.user.id,
    preferences: [
      ...input.interests.flatMap((slug) => {
        const row = tagBySlug.get(slug)
        return row
          ? [{ tagId: row.id, preferenceType: "interest" as const }]
          : []
      }),
      ...input.subjects.flatMap((slug) => {
        const row = tagBySlug.get(slug)
        return row
          ? [{ tagId: row.id, preferenceType: "subject" as const }]
          : []
      }),
      ...input.goals.flatMap((slug) => {
        const row = tagBySlug.get(slug)
        return row ? [{ tagId: row.id, preferenceType: "goal" as const }] : []
      }),
    ],
  })

  return actionOk({ completed: true })
}

export async function toggleSavedOpportunityAction(
  input: ToggleSavedOpportunityInput
) {
  const context = await requireCompletedProfile()
  const db = getServerDb()
  const opportunityRows = await db
    .select({ id: opportunity.id })
    .from(opportunity)
    .where(
      and(
        eq(opportunity.id, input.opportunityId),
        eq(opportunity.isPublished, true)
      )
    )
    .limit(1)

  if (!opportunityRows.at(0)) {
    return actionError("This opportunity is not available.")
  }

  const existing = await getSavedOpportunity(
    db,
    context.user.id,
    input.opportunityId
  )

  if (existing) {
    await removeSavedOpportunity(db, {
      userId: context.user.id,
      opportunityId: input.opportunityId,
    })
    return actionOk({ saved: false })
  }

  await saveOpportunity(db, {
    userId: context.user.id,
    opportunityId: input.opportunityId,
  })

  return actionOk({ saved: true })
}

export async function enrollCourseAction(input: EnrollCourseInput) {
  const context = await requireCompletedProfile()
  const db = getServerDb()
  const courseRows = await db
    .select({ id: course.id })
    .from(course)
    .where(and(eq(course.id, input.courseId), eq(course.isPublished, true)))
    .limit(1)

  if (!courseRows.at(0)) {
    return actionError("This course is not available.")
  }

  const enrollment = await enrollInCourse(db, {
    userId: context.user.id,
    courseId: input.courseId,
  })

  return actionOk({ enrollment })
}

export async function markLessonCompleteAction(input: MarkLessonCompleteInput) {
  const context = await requireCompletedProfile()
  const db = getServerDb()
  const lessonRow = await getPublishedLesson(db, input.lessonId)

  if (!lessonRow) {
    return actionError("This lesson is not available.")
  }

  await ensureEnrollment(db, {
    userId: context.user.id,
    courseId: lessonRow.courseId,
  })

  const progress = await updateLessonProgress(db, {
    userId: context.user.id,
    lessonId: input.lessonId,
    status: "completed",
    progressPercent: 100,
  })
  const enrollment = await getCourseEnrollment(
    db,
    context.user.id,
    lessonRow.courseId
  )

  return actionOk({ progress, enrollment })
}

export async function submitLessonQuizAction(input: SubmitLessonQuizInput) {
  const context = await requireCompletedProfile()
  const db = getServerDb()
  const lessonRow = await getPublishedLesson(db, input.lessonId)

  if (!lessonRow) {
    return actionError("This lesson is not available.")
  }

  const questions = await db
    .select()
    .from(quizQuestion)
    .where(eq(quizQuestion.lessonId, input.lessonId))
    .orderBy(asc(quizQuestion.position))

  if (questions.length === 0) {
    return actionError("This lesson does not have a quiz.")
  }

  const options = await db
    .select()
    .from(quizOption)
    .where(
      inArray(
        quizOption.questionId,
        questions.map((question) => question.id)
      )
    )
    .orderBy(asc(quizOption.position))

  const correctOptionsByQuestionId = new Map<string, string[]>()
  const validOptionsByQuestionId = new Map<string, Set<string>>()

  for (const option of options) {
    const validOptions =
      validOptionsByQuestionId.get(option.questionId) ?? new Set()
    validOptions.add(option.id)
    validOptionsByQuestionId.set(option.questionId, validOptions)

    if (option.isCorrect) {
      const correctOptions =
        correctOptionsByQuestionId.get(option.questionId) ?? []
      correctOptions.push(option.id)
      correctOptionsByQuestionId.set(option.questionId, correctOptions)
    }
  }

  let correctAnswers = 0
  const recordedAnswers = questions.map((questionRow) => {
    const selectedOptionIds = uniqueSlugs(input.answers[questionRow.id] ?? [])
      .filter((optionId) =>
        validOptionsByQuestionId.get(questionRow.id)?.has(optionId)
      )
      .sort()
    const correctOptionIds = [
      ...(correctOptionsByQuestionId.get(questionRow.id) ?? []),
    ].sort()
    // A question with no correct option (e.g. an unsupported short-answer
    // question, which has no options) can't be auto-graded — never count an
    // empty-vs-empty comparison as a correct answer.
    const isCorrect =
      correctOptionIds.length > 0 &&
      arraysEqual(selectedOptionIds, correctOptionIds)

    if (isCorrect) {
      correctAnswers += 1
    }

    return {
      questionId: questionRow.id,
      optionIds: selectedOptionIds,
      isCorrect,
    }
  })
  const scorePercent = Math.round((correctAnswers / questions.length) * 100)

  await ensureEnrollment(db, {
    userId: context.user.id,
    courseId: lessonRow.courseId,
  })

  const attempt = await recordQuizAttempt(db, {
    userId: context.user.id,
    lessonId: input.lessonId,
    scorePercent,
    correctAnswers,
    totalQuestions: questions.length,
    answers: recordedAnswers,
  })

  return actionOk({
    attempt,
    scorePercent,
    correctAnswers,
    totalQuestions: questions.length,
  })
}

export async function adminUpsertOpportunityAction(
  input: AdminUpsertOpportunityInput
) {
  const context = await requireAdmin()
  const db = getServerDb()
  const opportunityId = input.id?.trim() || crypto.randomUUID()
  const now = new Date()
  const values = {
    slug: input.slug,
    title: input.title,
    summary: input.summary,
    description: input.description,
    category: input.category,
    format: input.format,
    providerName: input.providerName,
    location: input.location,
    country: input.country,
    city: input.city,
    minGrade: input.minGrade,
    maxGrade: input.maxGrade,
    minAge: null,
    maxAge: null,
    deadlineAt: toDate(input.deadlineAt),
    startsAt: input.startsAt ? toDate(input.startsAt) : null,
    endsAt: input.endsAt ? toDate(input.endsAt) : null,
    applyUrl: input.applyUrl,
    requirements: splitLines(input.requirementsText),
    isFeatured: input.isFeatured,
    isPublished: input.isPublished,
    updatedById: context.user.id,
    updatedAt: now,
  }

  try {
    // Write the record and replace its tags in one atomic batch so a partial
    // failure can't leave the opportunity saved with its tags wiped.
    const tagIds = await resolveTagIds(db, input.tagSlugs)
    const writeOpportunity = input.id
      ? db
          .update(opportunity)
          .set(values)
          .where(eq(opportunity.id, opportunityId))
      : db.insert(opportunity).values({
          id: opportunityId,
          ...values,
          createdById: context.user.id,
        })
    const clearTags = db
      .delete(opportunityTag)
      .where(eq(opportunityTag.opportunityId, opportunityId))

    if (tagIds.length > 0) {
      await db.batch([
        writeOpportunity,
        clearTags,
        db
          .insert(opportunityTag)
          .values(tagIds.map((tagId) => ({ opportunityId, tagId })))
          .onConflictDoNothing(),
      ])
    } else {
      await db.batch([writeOpportunity, clearTags])
    }

    return actionOk({ opportunityId })
  } catch (error) {
    console.error("Failed to save opportunity:", error)
    return actionError(
      "Could not save the opportunity. Check the slug and dates."
    )
  }
}

export async function adminDeleteOpportunityAction(
  input: AdminDeleteOpportunityInput
) {
  await requireAdmin()
  const db = getServerDb()

  await db.delete(opportunity).where(eq(opportunity.id, input.opportunityId))

  return actionOk({ deleted: true })
}

export async function adminUpsertCourseAction(input: AdminUpsertCourseInput) {
  const context = await requireAdmin()
  const db = getServerDb()
  const courseId = input.id?.trim() || crypto.randomUUID()
  const now = new Date()
  const values = {
    slug: input.slug,
    title: input.title,
    summary: input.summary,
    description: input.description,
    difficulty: input.difficulty,
    estimatedHours: input.estimatedHours,
    thumbnailUrl: input.thumbnailUrl,
    isFeatured: input.isFeatured,
    isPublished: input.isPublished,
    updatedById: context.user.id,
    updatedAt: now,
  }

  try {
    // Write the record and replace its tags in one atomic batch so a partial
    // failure can't leave the course saved with its tags wiped.
    const tagIds = await resolveTagIds(db, input.tagSlugs)
    const writeCourse = input.id
      ? db.update(course).set(values).where(eq(course.id, courseId))
      : db.insert(course).values({
          id: courseId,
          ...values,
          createdById: context.user.id,
        })
    const clearTags = db
      .delete(courseTag)
      .where(eq(courseTag.courseId, courseId))

    if (tagIds.length > 0) {
      await db.batch([
        writeCourse,
        clearTags,
        db
          .insert(courseTag)
          .values(tagIds.map((tagId) => ({ courseId, tagId })))
          .onConflictDoNothing(),
      ])
    } else {
      await db.batch([writeCourse, clearTags])
    }

    return actionOk({ courseId })
  } catch (error) {
    console.error("Failed to save course:", error)
    return actionError("Could not save the course. Check the slug.")
  }
}

export async function adminDeleteCourseAction(input: AdminDeleteCourseInput) {
  await requireAdmin()
  const db = getServerDb()

  await db.delete(course).where(eq(course.id, input.courseId))

  return actionOk({ deleted: true })
}

export async function adminUpsertLessonAction(input: AdminUpsertLessonInput) {
  await requireAdmin()
  const db = getServerDb()
  const lessonId = input.id?.trim() || crypto.randomUUID()
  const now = new Date()
  const values = {
    courseId: input.courseId,
    slug: input.slug,
    title: input.title,
    summary: input.summary,
    content: input.content,
    videoUrl: input.videoUrl,
    materials: parseMaterialLines(input.materialsText),
    assignmentPrompt: input.assignmentPrompt,
    durationMinutes: input.durationMinutes,
    position: input.position,
    isPreview: input.isPreview,
    updatedAt: now,
  }

  try {
    if (input.id) {
      await db.update(lesson).set(values).where(eq(lesson.id, lessonId))
    } else {
      await db.insert(lesson).values({
        id: lessonId,
        ...values,
      })
    }

    return actionOk({ lessonId })
  } catch (error) {
    console.error("Failed to save lesson:", error)
    return actionError(
      "Could not save the lesson. Check the slug and position for duplicates."
    )
  }
}

export async function adminDeleteLessonAction(input: AdminDeleteLessonInput) {
  await requireAdmin()
  const db = getServerDb()

  await db.delete(lesson).where(eq(lesson.id, input.lessonId))

  return actionOk({ deleted: true })
}

async function getPublishedLesson(
  db: ReturnType<typeof getServerDb>,
  lessonId: string
) {
  const rows = await db
    .select({
      id: lesson.id,
      courseId: lesson.courseId,
    })
    .from(lesson)
    .innerJoin(course, eq(lesson.courseId, course.id))
    .where(and(eq(lesson.id, lessonId), eq(course.isPublished, true)))
    .limit(1)

  return rows.at(0) ?? null
}

async function resolveTagIds(
  db: ReturnType<typeof getServerDb>,
  tagSlugs: string[]
) {
  const slugs = uniqueSlugs(tagSlugs)

  if (slugs.length === 0) {
    return []
  }

  const rows = await listTags(db)
  const idBySlug = new Map(rows.map((row) => [row.slug, row.id]))

  return slugs.flatMap((slug) => {
    const tagId = idBySlug.get(slug)
    return tagId ? [tagId] : []
  })
}

function splitLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
}

function parseMaterialLines(value: string) {
  return splitLines(value).flatMap((line) => {
    const separator = line.includes("|") ? "|" : ","
    const [title, url] = line.split(separator).map((part) => part.trim())

    if (!title || !url) {
      return []
    }

    return [{ title, url }]
  })
}

function uniqueSlugs(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))]
}

function toDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`)
}

function arraysEqual(first: string[], second: string[]) {
  return (
    first.length === second.length &&
    first.every((value, index) => value === second[index])
  )
}
