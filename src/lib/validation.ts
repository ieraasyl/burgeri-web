import { z } from "zod"

import {
  userRoles,
  writeOffDeductionModes,
  writeOffStatuses,
} from "@/db/schema"

// Employee identifier (табельный номер) used as the better-auth username.
const employeeIdSchema = z
  .string()
  .trim()
  .min(2, "Используйте не менее 2 символов.")
  .max(40, "Не более 40 символов.")
  .regex(
    /^[A-Za-z0-9_-]+$/,
    "Используйте буквы, цифры, дефис или подчёркивание."
  )

export const submitWriteOffSchema = z
  .object({
    photoFileId: z.string().trim().min(1, "Attach a photo."),
    productId: z.string().trim().min(1, "Choose a product."),
    quantity: z
      .number()
      .positive("Enter a quantity greater than zero.")
      .max(100_000),
    pointOfSaleId: z.string().trim().min(1, "Choose a point of sale."),
    deductionMode: z.enum(writeOffDeductionModes),
    deductionEmployeeId: z.string().trim().nullable().optional(),
    writeOffCategoryId: z
      .string()
      .trim()
      .min(1, "Choose a write-off category."),
    comment: z
      .string()
      .trim()
      .min(10, "Add at least 10 characters.")
      .max(1_000),
  })
  .superRefine((value, context) => {
    if (value.deductionMode === "employee" && !value.deductionEmployeeId) {
      context.addIssue({
        code: "custom",
        path: ["deductionEmployeeId"],
        message: "Choose the employee responsible for the deduction.",
      })
    }
  })

export const reviewWriteOffRequestSchema = z
  .object({
    requestId: z.string().min(1),
    status: z.enum(writeOffStatuses).refine((value) => value !== "pending"),
    reviewComment: z.string().trim().max(1_000),
  })
  .superRefine((value, context) => {
    if (value.status === "rejected" && value.reviewComment.length < 3) {
      context.addIssue({
        code: "custom",
        path: ["reviewComment"],
        message: "Укажите причину отклонения заявки.",
      })
    }
  })

export const syncWriteOffToIikoSchema = z.object({
  requestId: z.string().min(1),
})

export const setStaffRoleSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(userRoles),
})

export const createEmployeeSchema = z.object({
  name: z.string().trim().min(2, "Введите имя.").max(120),
  employeeId: employeeIdSchema,
  password: z.string().min(8, "Используйте не менее 8 символов.").max(128),
  defaultPointOfSaleId: z
    .string()
    .trim()
    .transform((value) => (value.length ? value : null))
    .nullable(),
})

export const setEmployeePasswordSchema = z.object({
  userId: z.string().min(1),
  password: z.string().min(8, "Используйте не менее 8 символов.").max(128),
})

export const upsertPointOfSaleSchema = z.object({
  id: z.string().trim().optional(),
  name: z.string().trim().min(2, "Введите название.").max(120),
  address: z.string().trim().max(200),
  isActive: z.boolean(),
})

export const upsertProductCategorySchema = z.object({
  id: z.string().trim().optional(),
  name: z.string().trim().min(2, "Введите название.").max(120),
  position: z.coerce.number().int().min(0).max(999),
})

export const upsertProductSchema = z.object({
  id: z.string().trim().optional(),
  categoryId: z.string().trim().min(1, "Выберите категорию."),
  name: z.string().trim().min(2, "Введите название.").max(120),
  sku: z.string().trim().max(40),
  unit: z.string().trim().min(1, "Укажите единицу измерения.").max(20),
  isActive: z.boolean(),
})

export type SubmitWriteOffInput = z.infer<typeof submitWriteOffSchema>
export type ReviewWriteOffRequestInput = z.infer<
  typeof reviewWriteOffRequestSchema
>
export type SyncWriteOffToIikoInput = z.infer<typeof syncWriteOffToIikoSchema>
export type SetStaffRoleInput = z.infer<typeof setStaffRoleSchema>
export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>
export type SetEmployeePasswordInput = z.infer<typeof setEmployeePasswordSchema>
export type UpsertPointOfSaleInput = z.infer<typeof upsertPointOfSaleSchema>
export type UpsertProductCategoryInput = z.infer<
  typeof upsertProductCategorySchema
>
export type UpsertProductInput = z.infer<typeof upsertProductSchema>

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
