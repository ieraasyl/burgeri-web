import { createServerFn } from "@tanstack/react-start"
import type { z } from "zod"

import { actionError } from "@/lib/action-result"
import type { ActionResult } from "@/lib/action-result"
import {
  createEmployeeSchema,
  getZodFieldErrors,
  reviewWriteOffRequestSchema,
  setEmployeePasswordSchema,
  setStaffRoleSchema,
  syncWriteOffToIikoSchema,
  upsertPointOfSaleSchema,
  upsertProductCategorySchema,
  upsertProductSchema,
} from "@/lib/validation"
import type {
  CreateEmployeeInput,
  ReviewWriteOffRequestInput,
  SetEmployeePasswordInput,
  SetStaffRoleInput,
  SyncWriteOffToIikoInput,
  UpsertPointOfSaleInput,
  UpsertProductCategoryInput,
  UpsertProductInput,
} from "@/lib/validation"

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

export const createEmployee = createServerFn({ method: "POST" })
  .validator((data: CreateEmployeeInput) => data)
  .handler(async ({ data }) =>
    withValidation(createEmployeeSchema, data, async (input) => {
      const { createEmployeeAction } = await import("@/lib/write-offs.server")
      return createEmployeeAction(input)
    })
  )

export const setEmployeePassword = createServerFn({ method: "POST" })
  .validator((data: SetEmployeePasswordInput) => data)
  .handler(async ({ data }) =>
    withValidation(setEmployeePasswordSchema, data, async (input) => {
      const { setEmployeePasswordAction } =
        await import("@/lib/write-offs.server")
      return setEmployeePasswordAction(input)
    })
  )

export const upsertPointOfSale = createServerFn({ method: "POST" })
  .validator((data: UpsertPointOfSaleInput) => data)
  .handler(async ({ data }) =>
    withValidation(upsertPointOfSaleSchema, data, async (input) => {
      const { upsertPointOfSaleAction } =
        await import("@/lib/write-offs.server")
      return upsertPointOfSaleAction(input)
    })
  )

export const upsertProductCategory = createServerFn({ method: "POST" })
  .validator((data: UpsertProductCategoryInput) => data)
  .handler(async ({ data }) =>
    withValidation(upsertProductCategorySchema, data, async (input) => {
      const { upsertProductCategoryAction } =
        await import("@/lib/write-offs.server")
      return upsertProductCategoryAction(input)
    })
  )

export const upsertProduct = createServerFn({ method: "POST" })
  .validator((data: UpsertProductInput) => data)
  .handler(async ({ data }) =>
    withValidation(upsertProductSchema, data, async (input) => {
      const { upsertProductAction } = await import("@/lib/write-offs.server")
      return upsertProductAction(input)
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
      "Проверьте выделенные поля.",
      getZodFieldErrors(parsed.error)
    )
  }

  return handler(parsed.data)
}
