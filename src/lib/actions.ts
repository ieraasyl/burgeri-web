import { createServerFn } from "@tanstack/react-start"
import type { z } from "zod"

import { actionError } from "@/lib/action-result"
import type { ActionResult } from "@/lib/action-result"
import {
  createWriteOffRequestSchema,
  getZodFieldErrors,
  reviewWriteOffRequestSchema,
  setStaffRoleSchema,
  syncWriteOffToIikoSchema,
} from "@/lib/validation"
import type {
  CreateWriteOffRequestInput,
  ReviewWriteOffRequestInput,
  SetStaffRoleInput,
  SyncWriteOffToIikoInput,
} from "@/lib/validation"

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

export const syncWriteOffToIiko = createServerFn({ method: "POST" })
  .validator((data: SyncWriteOffToIikoInput) => data)
  .handler(async ({ data }) =>
    withValidation(syncWriteOffToIikoSchema, data, async (input) => {
      const { syncWriteOffToIikoAction } =
        await import("@/lib/write-offs.server")
      return syncWriteOffToIikoAction(input)
    })
  )

export const setStaffRole = createServerFn({ method: "POST" })
  .validator((data: SetStaffRoleInput) => data)
  .handler(async ({ data }) =>
    withValidation(setStaffRoleSchema, data, async (input) => {
      const { setStaffRoleAction } = await import("@/lib/write-offs.server")
      return setStaffRoleAction(input)
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
