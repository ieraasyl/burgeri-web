import { z } from "zod"

import {
  courseDifficulties,
  opportunityCategories,
  opportunityFormats,
} from "@/db/schema"

const slugSchema = z
  .string()
  .trim()
  .min(2, "Use at least 2 characters.")
  .max(80, "Keep the slug under 80 characters.")
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Use lowercase letters, numbers, and hyphens."
  )

const optionalText = z
  .string()
  .trim()
  .transform((value) => (value.length ? value : null))

const optionalInteger = z
  .number()
  .int()
  .nullable()
  .or(z.nan().transform(() => null))

const optionalGrade = z
  .number()
  .int()
  .min(1, "Grade must be between 1 and 12.")
  .max(12, "Grade must be between 1 and 12.")
  .nullable()
  .or(z.nan().transform(() => null))

const dateInput = z
  .string()
  .trim()
  .min(1, "Choose a date.")
  .refine((value) => !Number.isNaN(Date.parse(value)), "Choose a valid date.")

const optionalDateInput = z
  .string()
  .trim()
  .transform((value) => (value.length ? value : null))
  .refine(
    (value) => value === null || !Number.isNaN(Date.parse(value)),
    "Choose a valid date."
  )

export const completeOnboardingSchema = z.object({
  grade: z.number().int().min(8).max(11),
  interests: z.array(z.string().trim().min(1)).min(1, "Choose one interest."),
  subjects: z.array(z.string().trim().min(1)).default([]),
  goals: z.array(z.string().trim().min(1)).min(1, "Choose one goal."),
})

export const toggleSavedOpportunitySchema = z.object({
  opportunityId: z.string().min(1),
})

export const enrollCourseSchema = z.object({
  courseId: z.string().min(1),
})

export const markLessonCompleteSchema = z.object({
  lessonId: z.string().min(1),
})

export const submitLessonQuizSchema = z.object({
  lessonId: z.string().min(1),
  answers: z.record(z.string(), z.array(z.string()).default([])),
})

export const adminUpsertOpportunitySchema = z.object({
  id: z.string().trim().optional().nullable(),
  slug: slugSchema,
  title: z.string().trim().min(2).max(160),
  summary: z.string().trim().min(8).max(280),
  description: z.string().trim().min(20),
  category: z.enum(opportunityCategories),
  format: z.enum(opportunityFormats),
  providerName: z.string().trim().min(2).max(120),
  location: optionalText,
  country: optionalText,
  city: optionalText,
  minGrade: optionalGrade,
  maxGrade: optionalGrade,
  deadlineAt: dateInput,
  startsAt: optionalDateInput,
  endsAt: optionalDateInput,
  applyUrl: z.string().trim().url(),
  requirementsText: z.string().trim().min(3),
  tagSlugs: z.array(z.string().trim().min(1)).default([]),
  isFeatured: z.boolean().default(false),
  isPublished: z.boolean().default(false),
})

export const adminDeleteOpportunitySchema = z.object({
  opportunityId: z.string().min(1),
})

export const adminUpsertCourseSchema = z.object({
  id: z.string().trim().optional().nullable(),
  slug: slugSchema,
  title: z.string().trim().min(2).max(160),
  summary: z.string().trim().min(8).max(280),
  description: z.string().trim().min(20),
  difficulty: z.enum(courseDifficulties),
  estimatedHours: optionalInteger,
  thumbnailUrl: optionalText,
  tagSlugs: z.array(z.string().trim().min(1)).default([]),
  isFeatured: z.boolean().default(false),
  isPublished: z.boolean().default(false),
})

export const adminDeleteCourseSchema = z.object({
  courseId: z.string().min(1),
})

export const adminUpsertLessonSchema = z.object({
  id: z.string().trim().optional().nullable(),
  courseId: z.string().min(1),
  slug: slugSchema,
  title: z.string().trim().min(2).max(160),
  summary: optionalText,
  content: optionalText,
  videoUrl: optionalText,
  materialsText: z.string().trim().default(""),
  assignmentPrompt: optionalText,
  durationMinutes: optionalInteger,
  position: z.number().int().min(1).max(100),
  isPreview: z.boolean().default(false),
})

export const adminDeleteLessonSchema = z.object({
  lessonId: z.string().min(1),
})

export type CompleteOnboardingInput = z.infer<typeof completeOnboardingSchema>
export type ToggleSavedOpportunityInput = z.infer<
  typeof toggleSavedOpportunitySchema
>
export type EnrollCourseInput = z.infer<typeof enrollCourseSchema>
export type MarkLessonCompleteInput = z.infer<typeof markLessonCompleteSchema>
export type SubmitLessonQuizInput = z.infer<typeof submitLessonQuizSchema>
export type AdminUpsertOpportunityInput = z.infer<
  typeof adminUpsertOpportunitySchema
>
export type AdminDeleteOpportunityInput = z.infer<
  typeof adminDeleteOpportunitySchema
>
export type AdminUpsertCourseInput = z.infer<typeof adminUpsertCourseSchema>
export type AdminDeleteCourseInput = z.infer<typeof adminDeleteCourseSchema>
export type AdminUpsertLessonInput = z.infer<typeof adminUpsertLessonSchema>
export type AdminDeleteLessonInput = z.infer<typeof adminDeleteLessonSchema>

export function getZodFieldErrors(error: z.ZodError) {
  const fieldErrors: Record<string, string[]> = {}

  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form"
    const messages = fieldErrors[key] ?? []
    messages.push(issue.message)
    fieldErrors[key] = messages
  }

  return fieldErrors
}
