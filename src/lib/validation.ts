import { z } from "zod"

import {
  userRoles,
  writeOffDeductionTypes,
  writeOffProductTypes,
  writeOffStatuses,
} from "@/db/schema"
import { restaurantLocationIds } from "@/lib/write-offs"

export const createWriteOffRequestSchema = z
  .object({
    locationId: z.enum(restaurantLocationIds),
    productType: z.enum(writeOffProductTypes),
    quantity: z.number().int().min(1).max(100),
    deductionType: z.enum(writeOffDeductionTypes),
    chargedEmployeeId: z.string().trim().nullable(),
    comment: z
      .string()
      .trim()
      .min(10, "Add at least 10 characters.")
      .max(1_000),
    photoDataUrl: z
      .string()
      .max(2_100_000, "The photo must be smaller than 1.5 MB.")
      .regex(
        /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/,
        "Attach a JPEG, PNG, or WebP photo."
      ),
  })
  .superRefine((value, context) => {
    if (value.deductionType === "employee" && !value.chargedEmployeeId) {
      context.addIssue({
        code: "custom",
        path: ["chargedEmployeeId"],
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
        message: "Explain why the request was rejected.",
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

export type CreateWriteOffRequestInput = z.infer<
  typeof createWriteOffRequestSchema
>
export type ReviewWriteOffRequestInput = z.infer<
  typeof reviewWriteOffRequestSchema
>
export type SyncWriteOffToIikoInput = z.infer<typeof syncWriteOffToIikoSchema>
export type SetStaffRoleInput = z.infer<typeof setStaffRoleSchema>

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
