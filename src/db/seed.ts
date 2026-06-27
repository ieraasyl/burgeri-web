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
  seedCourseTags,
  seedCourses,
  seedLessons,
  seedOpportunities,
  seedOpportunityTags,
  seedQuizOptions,
  seedQuizQuestions,
  seedTags,
} from "@/db/seed-data"
import type { AppDb } from "@/db"

export interface SeedResult {
  tags: number
  opportunities: number
  opportunityTags: number
  courses: number
  courseTags: number
  lessons: number
  quizQuestions: number
  quizOptions: number
}

export async function seedDatabase(db: AppDb): Promise<SeedResult> {
  await seedTagRows(db)
  await seedOpportunityRows(db)
  await seedOpportunityTagRows(db)
  await seedCourseRows(db)
  await seedCourseTagRows(db)
  await seedLessonRows(db)
  await seedQuizQuestionRows(db)
  await seedQuizOptionRows(db)

  return {
    tags: seedTags.length,
    opportunities: seedOpportunities.length,
    opportunityTags: seedOpportunityTags.length,
    courses: seedCourses.length,
    courseTags: seedCourseTags.length,
    lessons: seedLessons.length,
    quizQuestions: seedQuizQuestions.length,
    quizOptions: seedQuizOptions.length,
  }
}

async function seedTagRows(db: AppDb) {
  const now = new Date()

  for (const row of seedTags) {
    await db
      .insert(tag)
      .values(row)
      .onConflictDoUpdate({
        target: tag.slug,
        set: {
          name: row.name,
          kind: row.kind,
          color: row.color,
          updatedAt: now,
        },
      })
  }
}

async function seedOpportunityRows(db: AppDb) {
  const now = new Date()

  for (const row of seedOpportunities) {
    await db
      .insert(opportunity)
      .values(row)
      .onConflictDoUpdate({
        target: opportunity.slug,
        set: {
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
          minAge: null,
          maxAge: null,
          deadlineAt: row.deadlineAt,
          startsAt: row.startsAt,
          endsAt: row.endsAt,
          applyUrl: row.applyUrl,
          requirements: row.requirements,
          isFeatured: row.isFeatured,
          isPublished: row.isPublished,
          updatedAt: now,
        },
      })
  }
}

async function seedOpportunityTagRows(db: AppDb) {
  for (const [opportunityId, tagId] of seedOpportunityTags) {
    await db
      .insert(opportunityTag)
      .values({ opportunityId, tagId })
      .onConflictDoNothing()
  }
}

async function seedCourseRows(db: AppDb) {
  const now = new Date()

  for (const row of seedCourses) {
    await db
      .insert(course)
      .values(row)
      .onConflictDoUpdate({
        target: course.slug,
        set: {
          title: row.title,
          summary: row.summary,
          description: row.description,
          difficulty: row.difficulty,
          estimatedHours: row.estimatedHours,
          thumbnailUrl: row.thumbnailUrl,
          isFeatured: row.isFeatured,
          isPublished: row.isPublished,
          updatedAt: now,
        },
      })
  }
}

async function seedCourseTagRows(db: AppDb) {
  for (const [courseId, tagId] of seedCourseTags) {
    await db.insert(courseTag).values({ courseId, tagId }).onConflictDoNothing()
  }
}

async function seedLessonRows(db: AppDb) {
  const now = new Date()

  for (const row of seedLessons) {
    await db
      .insert(lesson)
      .values(row)
      .onConflictDoUpdate({
        target: [lesson.courseId, lesson.slug],
        set: {
          title: row.title,
          summary: row.summary,
          content: row.content,
          videoUrl: row.videoUrl,
          materials: row.materials,
          assignmentPrompt: row.assignmentPrompt,
          durationMinutes: row.durationMinutes,
          position: row.position,
          isPreview: row.isPreview ?? false,
          updatedAt: now,
        },
      })
  }
}

async function seedQuizQuestionRows(db: AppDb) {
  const now = new Date()

  for (const row of seedQuizQuestions) {
    await db
      .insert(quizQuestion)
      .values(row)
      .onConflictDoUpdate({
        target: [quizQuestion.lessonId, quizQuestion.position],
        set: {
          type: row.type,
          prompt: row.prompt,
          explanation: row.explanation,
          updatedAt: now,
        },
      })
  }
}

async function seedQuizOptionRows(db: AppDb) {
  const now = new Date()

  for (const row of seedQuizOptions) {
    await db
      .insert(quizOption)
      .values(row)
      .onConflictDoUpdate({
        target: [quizOption.questionId, quizOption.position],
        set: {
          label: row.label,
          isCorrect: row.isCorrect,
          updatedAt: now,
        },
      })
  }
}
