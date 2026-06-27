import { relations, sql } from "drizzle-orm"
import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core"

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

export const userRoles = ["student", "mentor", "admin"] as const
export const locales = ["en", "ru", "kk"] as const
export const tagKinds = ["field", "subject", "goal", "category"] as const
export const preferenceTypes = ["interest", "subject", "goal"] as const
export const opportunityCategories = [
  "competition",
  "olympiad",
  "hackathon",
  "summer_school",
  "internship",
  "research",
  "scholarship",
  "volunteering",
  "program",
] as const
export const opportunityFormats = ["online", "offline", "hybrid"] as const
export const savedOpportunityStatuses = [
  "saved",
  "applying",
  "applied",
  "archived",
] as const
export const courseDifficulties = [
  "beginner",
  "intermediate",
  "advanced",
] as const
export const enrollmentStatuses = [
  "active",
  "completed",
  "paused",
  "dropped",
] as const
export const lessonProgressStatuses = [
  "not_started",
  "in_progress",
  "completed",
] as const
export const quizQuestionTypes = [
  "single_choice",
  "multiple_choice",
  "short_answer",
] as const
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

export const studentProfile = sqliteTable(
  "student_profile",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role", { enum: userRoles }).default("student").notNull(),
    grade: integer("grade"),
    country: text("country").default("Kazakhstan").notNull(),
    city: text("city"),
    locale: text("locale", { enum: locales }).default("en").notNull(),
    timezone: text("timezone").default("Asia/Almaty").notNull(),
    onboardingCompleted: integer("onboarding_completed", {
      mode: "boolean",
    })
      .default(false)
      .notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("student_profile_role_idx").on(table.role),
    index("student_profile_grade_idx").on(table.grade),
  ]
)

export const tag = sqliteTable(
  "tag",
  {
    id: id(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    kind: text("kind", { enum: tagKinds }).notNull(),
    color: text("color"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("tag_slug_unique").on(table.slug),
    index("tag_kind_idx").on(table.kind),
  ]
)

export const userTagPreference = sqliteTable(
  "user_tag_preference",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    tagId: text("tag_id")
      .notNull()
      .references(() => tag.id, { onDelete: "cascade" }),
    preferenceType: text("preference_type", {
      enum: preferenceTypes,
    }).notNull(),
    weight: integer("weight").default(1).notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    primaryKey({
      columns: [table.userId, table.tagId, table.preferenceType],
    }),
    index("user_tag_preference_tag_idx").on(table.tagId),
  ]
)

export const opportunity = sqliteTable(
  "opportunity",
  {
    id: id(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    description: text("description").notNull(),
    category: text("category", { enum: opportunityCategories }).notNull(),
    format: text("format", { enum: opportunityFormats }).notNull(),
    providerName: text("provider_name").notNull(),
    location: text("location"),
    country: text("country"),
    city: text("city"),
    minGrade: integer("min_grade"),
    maxGrade: integer("max_grade"),
    minAge: integer("min_age"),
    maxAge: integer("max_age"),
    deadlineAt: timestampMs("deadline_at").notNull(),
    startsAt: timestampMs("starts_at"),
    endsAt: timestampMs("ends_at"),
    applyUrl: text("apply_url").notNull(),
    requirements: text("requirements", { mode: "json" })
      .$type<string[]>()
      .default(sql`'[]'`)
      .notNull(),
    isFeatured: integer("is_featured", { mode: "boolean" })
      .default(false)
      .notNull(),
    isPublished: integer("is_published", { mode: "boolean" })
      .default(false)
      .notNull(),
    createdById: text("created_by_id").references(() => user.id, {
      onDelete: "set null",
    }),
    updatedById: text("updated_by_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("opportunity_slug_unique").on(table.slug),
    index("opportunity_category_idx").on(table.category),
    index("opportunity_format_idx").on(table.format),
    index("opportunity_deadline_idx").on(table.deadlineAt),
    index("opportunity_grade_range_idx").on(table.minGrade, table.maxGrade),
    index("opportunity_published_idx").on(table.isPublished),
  ]
)

export const opportunityTag = sqliteTable(
  "opportunity_tag",
  {
    opportunityId: text("opportunity_id")
      .notNull()
      .references(() => opportunity.id, { onDelete: "cascade" }),
    tagId: text("tag_id")
      .notNull()
      .references(() => tag.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.opportunityId, table.tagId] }),
    index("opportunity_tag_tag_idx").on(table.tagId),
  ]
)

export const savedOpportunity = sqliteTable(
  "saved_opportunity",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    opportunityId: text("opportunity_id")
      .notNull()
      .references(() => opportunity.id, { onDelete: "cascade" }),
    status: text("status", { enum: savedOpportunityStatuses })
      .default("saved")
      .notNull(),
    reminderAt: timestampMs("reminder_at"),
    notes: text("notes"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.opportunityId] }),
    index("saved_opportunity_opportunity_idx").on(table.opportunityId),
    index("saved_opportunity_status_idx").on(table.status),
    index("saved_opportunity_reminder_idx").on(table.reminderAt),
  ]
)

export const course = sqliteTable(
  "course",
  {
    id: id(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    description: text("description").notNull(),
    difficulty: text("difficulty", { enum: courseDifficulties }).notNull(),
    estimatedHours: integer("estimated_hours"),
    thumbnailUrl: text("thumbnail_url"),
    isFeatured: integer("is_featured", { mode: "boolean" })
      .default(false)
      .notNull(),
    isPublished: integer("is_published", { mode: "boolean" })
      .default(false)
      .notNull(),
    createdById: text("created_by_id").references(() => user.id, {
      onDelete: "set null",
    }),
    updatedById: text("updated_by_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("course_slug_unique").on(table.slug),
    index("course_difficulty_idx").on(table.difficulty),
    index("course_published_idx").on(table.isPublished),
  ]
)

export const courseTag = sqliteTable(
  "course_tag",
  {
    courseId: text("course_id")
      .notNull()
      .references(() => course.id, { onDelete: "cascade" }),
    tagId: text("tag_id")
      .notNull()
      .references(() => tag.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.courseId, table.tagId] }),
    index("course_tag_tag_idx").on(table.tagId),
  ]
)

export const lesson = sqliteTable(
  "lesson",
  {
    id: id(),
    courseId: text("course_id")
      .notNull()
      .references(() => course.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    summary: text("summary"),
    content: text("content"),
    videoUrl: text("video_url"),
    materials: text("materials", { mode: "json" })
      .$type<Array<{ title: string; url: string }>>()
      .default(sql`'[]'`)
      .notNull(),
    assignmentPrompt: text("assignment_prompt"),
    durationMinutes: integer("duration_minutes"),
    position: integer("position").notNull(),
    isPreview: integer("is_preview", { mode: "boolean" })
      .default(false)
      .notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("lesson_course_slug_unique").on(table.courseId, table.slug),
    uniqueIndex("lesson_course_position_unique").on(
      table.courseId,
      table.position
    ),
    index("lesson_course_idx").on(table.courseId),
  ]
)

export const courseEnrollment = sqliteTable(
  "course_enrollment",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    courseId: text("course_id")
      .notNull()
      .references(() => course.id, { onDelete: "cascade" }),
    currentLessonId: text("current_lesson_id").references(() => lesson.id, {
      onDelete: "set null",
    }),
    status: text("status", { enum: enrollmentStatuses })
      .default("active")
      .notNull(),
    progressPercent: integer("progress_percent").default(0).notNull(),
    startedAt: timestampMs("started_at")
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    completedAt: timestampMs("completed_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.courseId] }),
    index("course_enrollment_course_idx").on(table.courseId),
    index("course_enrollment_status_idx").on(table.status),
    index("course_enrollment_current_lesson_idx").on(table.currentLessonId),
  ]
)

export const lessonProgress = sqliteTable(
  "lesson_progress",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    lessonId: text("lesson_id")
      .notNull()
      .references(() => lesson.id, { onDelete: "cascade" }),
    courseId: text("course_id")
      .notNull()
      .references(() => course.id, { onDelete: "cascade" }),
    status: text("status", { enum: lessonProgressStatuses })
      .default("not_started")
      .notNull(),
    progressPercent: integer("progress_percent").default(0).notNull(),
    assignmentAnswer: text("assignment_answer"),
    quizScorePercent: integer("quiz_score_percent"),
    lastViewedAt: timestampMs("last_viewed_at"),
    completedAt: timestampMs("completed_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.lessonId] }),
    index("lesson_progress_course_idx").on(table.courseId),
    index("lesson_progress_status_idx").on(table.status),
  ]
)

export const quizQuestion = sqliteTable(
  "quiz_question",
  {
    id: id(),
    lessonId: text("lesson_id")
      .notNull()
      .references(() => lesson.id, { onDelete: "cascade" }),
    type: text("type", { enum: quizQuestionTypes }).notNull(),
    prompt: text("prompt").notNull(),
    explanation: text("explanation"),
    position: integer("position").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("quiz_question_lesson_position_unique").on(
      table.lessonId,
      table.position
    ),
    index("quiz_question_lesson_idx").on(table.lessonId),
  ]
)

export const quizOption = sqliteTable(
  "quiz_option",
  {
    id: id(),
    questionId: text("question_id")
      .notNull()
      .references(() => quizQuestion.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    isCorrect: integer("is_correct", { mode: "boolean" })
      .default(false)
      .notNull(),
    position: integer("position").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("quiz_option_question_position_unique").on(
      table.questionId,
      table.position
    ),
    index("quiz_option_question_idx").on(table.questionId),
  ]
)

export const quizAttempt = sqliteTable(
  "quiz_attempt",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    lessonId: text("lesson_id")
      .notNull()
      .references(() => lesson.id, { onDelete: "cascade" }),
    scorePercent: integer("score_percent").notNull(),
    correctAnswers: integer("correct_answers").notNull(),
    totalQuestions: integer("total_questions").notNull(),
    answers: text("answers", { mode: "json" })
      .$type<
        Array<{
          questionId: string
          optionIds?: string[]
          textAnswer?: string
          isCorrect?: boolean
        }>
      >()
      .default(sql`'[]'`)
      .notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    index("quiz_attempt_user_idx").on(table.userId),
    index("quiz_attempt_lesson_idx").on(table.lessonId),
  ]
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

export const studentProfileRelations = relations(
  studentProfile,
  ({ one, many }) => ({
    user: one(user, {
      fields: [studentProfile.userId],
      references: [user.id],
    }),
    preferences: many(userTagPreference),
  })
)

export const tagRelations = relations(tag, ({ many }) => ({
  userPreferences: many(userTagPreference),
  opportunities: many(opportunityTag),
  courses: many(courseTag),
}))

export const userTagPreferenceRelations = relations(
  userTagPreference,
  ({ one }) => ({
    user: one(user, {
      fields: [userTagPreference.userId],
      references: [user.id],
    }),
    tag: one(tag, {
      fields: [userTagPreference.tagId],
      references: [tag.id],
    }),
  })
)

export const opportunityRelations = relations(opportunity, ({ one, many }) => ({
  createdBy: one(user, {
    fields: [opportunity.createdById],
    references: [user.id],
    relationName: "opportunityCreatedBy",
  }),
  updatedBy: one(user, {
    fields: [opportunity.updatedById],
    references: [user.id],
    relationName: "opportunityUpdatedBy",
  }),
  tags: many(opportunityTag),
  savedBy: many(savedOpportunity),
}))

export const opportunityTagRelations = relations(opportunityTag, ({ one }) => ({
  opportunity: one(opportunity, {
    fields: [opportunityTag.opportunityId],
    references: [opportunity.id],
  }),
  tag: one(tag, {
    fields: [opportunityTag.tagId],
    references: [tag.id],
  }),
}))

export const savedOpportunityRelations = relations(
  savedOpportunity,
  ({ one }) => ({
    user: one(user, {
      fields: [savedOpportunity.userId],
      references: [user.id],
    }),
    opportunity: one(opportunity, {
      fields: [savedOpportunity.opportunityId],
      references: [opportunity.id],
    }),
  })
)

export const courseRelations = relations(course, ({ one, many }) => ({
  createdBy: one(user, {
    fields: [course.createdById],
    references: [user.id],
    relationName: "courseCreatedBy",
  }),
  updatedBy: one(user, {
    fields: [course.updatedById],
    references: [user.id],
    relationName: "courseUpdatedBy",
  }),
  tags: many(courseTag),
  lessons: many(lesson),
  enrollments: many(courseEnrollment),
  lessonProgress: many(lessonProgress),
}))

export const courseTagRelations = relations(courseTag, ({ one }) => ({
  course: one(course, {
    fields: [courseTag.courseId],
    references: [course.id],
  }),
  tag: one(tag, {
    fields: [courseTag.tagId],
    references: [tag.id],
  }),
}))

export const lessonRelations = relations(lesson, ({ one, many }) => ({
  course: one(course, {
    fields: [lesson.courseId],
    references: [course.id],
  }),
  enrollmentsAtCurrentLesson: many(courseEnrollment),
  progress: many(lessonProgress),
  questions: many(quizQuestion),
  attempts: many(quizAttempt),
}))

export const courseEnrollmentRelations = relations(
  courseEnrollment,
  ({ one }) => ({
    user: one(user, {
      fields: [courseEnrollment.userId],
      references: [user.id],
    }),
    course: one(course, {
      fields: [courseEnrollment.courseId],
      references: [course.id],
    }),
    currentLesson: one(lesson, {
      fields: [courseEnrollment.currentLessonId],
      references: [lesson.id],
    }),
  })
)

export const lessonProgressRelations = relations(lessonProgress, ({ one }) => ({
  user: one(user, {
    fields: [lessonProgress.userId],
    references: [user.id],
  }),
  course: one(course, {
    fields: [lessonProgress.courseId],
    references: [course.id],
  }),
  lesson: one(lesson, {
    fields: [lessonProgress.lessonId],
    references: [lesson.id],
  }),
}))

export const quizQuestionRelations = relations(
  quizQuestion,
  ({ one, many }) => ({
    lesson: one(lesson, {
      fields: [quizQuestion.lessonId],
      references: [lesson.id],
    }),
    options: many(quizOption),
  })
)

export const quizOptionRelations = relations(quizOption, ({ one }) => ({
  question: one(quizQuestion, {
    fields: [quizOption.questionId],
    references: [quizQuestion.id],
  }),
}))

export const quizAttemptRelations = relations(quizAttempt, ({ one }) => ({
  user: one(user, {
    fields: [quizAttempt.userId],
    references: [user.id],
  }),
  lesson: one(lesson, {
    fields: [quizAttempt.lessonId],
    references: [lesson.id],
  }),
}))
