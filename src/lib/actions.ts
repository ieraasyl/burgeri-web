import { createServerFn } from "@tanstack/react-start"
import type { z } from "zod"

import { actionError } from "@/lib/action-result"
import type { ActionResult } from "@/lib/action-result"
import {
  adminDeleteCourseSchema,
  adminDeleteLessonSchema,
  adminDeleteOpportunitySchema,
  adminUpsertCourseSchema,
  adminUpsertLessonSchema,
  adminUpsertOpportunitySchema,
  completeOnboardingSchema,
  createWriteOffRequestSchema,
  enrollCourseSchema,
  getZodFieldErrors,
  markLessonCompleteSchema,
  reviewWriteOffRequestSchema,
  submitLessonQuizSchema,
  toggleSavedOpportunitySchema,
} from "@/lib/validation"
import type {
  AdminDeleteCourseInput,
  AdminDeleteLessonInput,
  AdminDeleteOpportunityInput,
  AdminUpsertCourseInput,
  AdminUpsertLessonInput,
  AdminUpsertOpportunityInput,
  CompleteOnboardingInput,
  CreateWriteOffRequestInput,
  EnrollCourseInput,
  MarkLessonCompleteInput,
  ReviewWriteOffRequestInput,
  SubmitLessonQuizInput,
  ToggleSavedOpportunityInput,
} from "@/lib/validation"

export const completeOnboarding = createServerFn({ method: "POST" })
  .validator((data: CompleteOnboardingInput) => data)
  .handler(async ({ data }) =>
    withValidation(completeOnboardingSchema, data, async (input) => {
      const { completeOnboardingAction } = await import("@/lib/actions.server")
      return completeOnboardingAction(input)
    })
  )

export const toggleSavedOpportunity = createServerFn({ method: "POST" })
  .validator((data: ToggleSavedOpportunityInput) => data)
  .handler(async ({ data }) =>
    withValidation(toggleSavedOpportunitySchema, data, async (input) => {
      const { toggleSavedOpportunityAction } =
        await import("@/lib/actions.server")
      return toggleSavedOpportunityAction(input)
    })
  )

export const enrollCourse = createServerFn({ method: "POST" })
  .validator((data: EnrollCourseInput) => data)
  .handler(async ({ data }) =>
    withValidation(enrollCourseSchema, data, async (input) => {
      const { enrollCourseAction } = await import("@/lib/actions.server")
      return enrollCourseAction(input)
    })
  )

export const markLessonComplete = createServerFn({ method: "POST" })
  .validator((data: MarkLessonCompleteInput) => data)
  .handler(async ({ data }) =>
    withValidation(markLessonCompleteSchema, data, async (input) => {
      const { markLessonCompleteAction } = await import("@/lib/actions.server")
      return markLessonCompleteAction(input)
    })
  )

export const submitLessonQuiz = createServerFn({ method: "POST" })
  .validator((data: SubmitLessonQuizInput) => data)
  .handler(async ({ data }) =>
    withValidation(submitLessonQuizSchema, data, async (input) => {
      const { submitLessonQuizAction } = await import("@/lib/actions.server")
      return submitLessonQuizAction(input)
    })
  )

export const adminUpsertOpportunity = createServerFn({ method: "POST" })
  .validator((data: AdminUpsertOpportunityInput) => data)
  .handler(async ({ data }) =>
    withValidation(adminUpsertOpportunitySchema, data, async (input) => {
      const { adminUpsertOpportunityAction } =
        await import("@/lib/actions.server")
      return adminUpsertOpportunityAction(input)
    })
  )

export const adminDeleteOpportunity = createServerFn({ method: "POST" })
  .validator((data: AdminDeleteOpportunityInput) => data)
  .handler(async ({ data }) =>
    withValidation(adminDeleteOpportunitySchema, data, async (input) => {
      const { adminDeleteOpportunityAction } =
        await import("@/lib/actions.server")
      return adminDeleteOpportunityAction(input)
    })
  )

export const adminUpsertCourse = createServerFn({ method: "POST" })
  .validator((data: AdminUpsertCourseInput) => data)
  .handler(async ({ data }) =>
    withValidation(adminUpsertCourseSchema, data, async (input) => {
      const { adminUpsertCourseAction } = await import("@/lib/actions.server")
      return adminUpsertCourseAction(input)
    })
  )

export const adminDeleteCourse = createServerFn({ method: "POST" })
  .validator((data: AdminDeleteCourseInput) => data)
  .handler(async ({ data }) =>
    withValidation(adminDeleteCourseSchema, data, async (input) => {
      const { adminDeleteCourseAction } = await import("@/lib/actions.server")
      return adminDeleteCourseAction(input)
    })
  )

export const adminUpsertLesson = createServerFn({ method: "POST" })
  .validator((data: AdminUpsertLessonInput) => data)
  .handler(async ({ data }) =>
    withValidation(adminUpsertLessonSchema, data, async (input) => {
      const { adminUpsertLessonAction } = await import("@/lib/actions.server")
      return adminUpsertLessonAction(input)
    })
  )

export const adminDeleteLesson = createServerFn({ method: "POST" })
  .validator((data: AdminDeleteLessonInput) => data)
  .handler(async ({ data }) =>
    withValidation(adminDeleteLessonSchema, data, async (input) => {
      const { adminDeleteLessonAction } = await import("@/lib/actions.server")
      return adminDeleteLessonAction(input)
    })
  )

export const createWriteOffRequest = createServerFn({ method: "POST" })
  .validator((data: CreateWriteOffRequestInput) => data)
  .handler(async ({ data }) =>
    withValidation(createWriteOffRequestSchema, data, async (input) => {
      const { createWriteOffRequestAction } =
        await import("@/lib/write-offs.server")
      return createWriteOffRequestAction(input)
    })
  )

export const reviewWriteOffRequest = createServerFn({ method: "POST" })
  .validator((data: ReviewWriteOffRequestInput) => data)
  .handler(async ({ data }) =>
    withValidation(reviewWriteOffRequestSchema, data, async (input) => {
      const { reviewWriteOffRequestAction } =
        await import("@/lib/write-offs.server")
      return reviewWriteOffRequestAction(input)
    })
  )

async function withValidation<TInput, TOutput>(
  schema: z.ZodType<TInput>,
  data: unknown,
  handler: (input: TInput) => Promise<ActionResult<TOutput>>
) {
  const parsed = schema.safeParse(data)

  if (!parsed.success) {
    return actionError(
      "Check the highlighted fields.",
      getZodFieldErrors(parsed.error)
    )
  }

  return handler(parsed.data)
}
