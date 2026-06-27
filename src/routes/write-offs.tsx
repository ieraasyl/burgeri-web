import {
  IconArrowRight,
  IconBuildingStore,
  IconCamera,
  IconCircleCheck,
  IconClock,
  IconLoader2,
  IconX,
} from "@tabler/icons-react"
import { Link, createFileRoute, useRouter } from "@tanstack/react-router"
import { createServerFn, useServerFn } from "@tanstack/react-start"
import { useState } from "react"
import type { ChangeEvent, FormEvent } from "react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createWriteOffRequest } from "@/lib/actions"
import {
  deductionTypeLabels,
  iikoSyncStatusLabels,
  productTypeLabels,
  restaurantLocations,
  writeOffStatusLabels,
} from "@/lib/write-offs"
import type {
  RestaurantLocationId,
  WriteOffDeductionType,
  WriteOffProductType,
} from "@/lib/write-offs"

const getWriteOffData = createServerFn({ method: "GET" }).handler(async () => {
  const { getWriteOffPageData } = await import("@/lib/write-offs.server")
  return getWriteOffPageData()
})

export const Route = createFileRoute("/write-offs")({
  loader: () => getWriteOffData(),
  component: WriteOffPage,
})

type FormState =
  | { status: "idle" }
  | { status: "pending" }
  | { status: "error"; message: string }
  | { status: "success"; message: string }

function WriteOffPage() {
  const data = Route.useLoaderData()
  const router = useRouter()
  const submitRequest = useServerFn(createWriteOffRequest)
  const [photoDataUrl, setPhotoDataUrl] = useState("")
  const [deductionType, setDeductionType] =
    useState<WriteOffDeductionType>("company")
  const [formState, setFormState] = useState<FormState>({ status: "idle" })

  async function handlePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) {
      setPhotoDataUrl("")
      return
    }

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setFormState({
        status: "error",
        message: "Use a JPEG, PNG, or WebP photo.",
      })
      event.target.value = ""
      return
    }

    if (file.size > 1_500_000) {
      setFormState({
        status: "error",
        message: "The photo must be smaller than 1.5 MB.",
      })
      event.target.value = ""
      return
    }

    const result = await readFileAsDataUrl(file)
    setPhotoDataUrl(result)
    setFormState({ status: "idle" })
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const formData = new FormData(form)

    if (!photoDataUrl) {
      setFormState({
        status: "error",
        message: "Attach a photo of the product before submitting.",
      })
      return
    }

    setFormState({ status: "pending" })
    const result = await submitRequest({
      data: {
        locationId: String(formData.get("locationId")) as RestaurantLocationId,
        productType: String(formData.get("productType")) as WriteOffProductType,
        quantity: Number(formData.get("quantity")),
        deductionType,
        chargedEmployeeId:
          deductionType === "employee"
            ? String(formData.get("chargedEmployeeId") || "")
            : null,
        comment: String(formData.get("comment")),
        photoDataUrl,
      },
    })

    if (!result.ok) {
      setFormState({ status: "error", message: result.message })
      return
    }

    form.reset()
    setPhotoDataUrl("")
    setDeductionType("company")
    setFormState({
      status: "success",
      message: "Write-off request sent for review.",
    })
    await router.invalidate()
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="flex flex-col gap-5 border-b pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">Operations</p>
          <h1 className="mt-2 font-heading text-4xl font-semibold text-balance">
            Product write-offs
          </h1>
          <p className="mt-3 max-w-2xl leading-7 text-muted-foreground">
            Photograph the product, record what happened, and send it to the
            responsible reviewer.
          </p>
        </div>
        {data.viewer.isReviewer && (
          <Link
            to="/review/write-offs"
            className={buttonVariants({ variant: "outline" })}
          >
            Open review queue
            <IconArrowRight data-icon="inline-end" />
          </Link>
        )}
      </section>

      <div className="grid gap-8 py-8 lg:grid-cols-[minmax(0,28rem)_minmax(0,1fr)]">
        <section className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-full bg-primary/10 text-primary">
              <IconCamera />
            </span>
            <div>
              <h2 className="font-heading text-xl font-semibold">
                New request
              </h2>
              <p className="text-sm text-muted-foreground">
                All fields are required.
              </p>
            </div>
          </div>

          <form className="mt-6 grid gap-5" onSubmit={handleSubmit}>
            <FormField label="Photo evidence">
              <label className="relative flex min-h-44 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-dashed bg-muted/30 text-center transition-colors hover:bg-muted/60">
                {photoDataUrl ? (
                  <img
                    src={photoDataUrl}
                    alt="Selected write-off evidence"
                    className="absolute inset-0 size-full object-cover"
                  />
                ) : (
                  <span className="flex flex-col items-center gap-2 p-5 text-sm text-muted-foreground">
                    <IconCamera className="size-7 text-primary" />
                    Take a photo or choose one
                    <span className="text-xs">
                      JPEG, PNG or WebP · max 1.5 MB
                    </span>
                  </span>
                )}
                <input
                  className="sr-only"
                  type="file"
                  name="photo"
                  accept="image/jpeg,image/png,image/webp"
                  capture="environment"
                  onChange={handlePhoto}
                />
              </label>
            </FormField>

            <FormField label="Restaurant">
              <select name="locationId" className={selectClass} required>
                {restaurantLocations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
            </FormField>

            <div className="grid gap-4 sm:grid-cols-[1fr_7rem]">
              <FormField label="Product">
                <select name="productType" className={selectClass} required>
                  {Object.entries(productTypeLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Quantity">
                <Input
                  name="quantity"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={100}
                  defaultValue={1}
                  required
                />
              </FormField>
            </div>

            <fieldset className="grid gap-2">
              <legend className="mb-1 text-sm font-medium">Deduction</legend>
              {(
                Object.entries(deductionTypeLabels) as Array<
                  [WriteOffDeductionType, string]
                >
              ).map(([value, label]) => (
                <label
                  key={value}
                  className="flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm has-checked:border-primary has-checked:bg-primary/5"
                >
                  <input
                    type="radio"
                    name="deductionType"
                    value={value}
                    checked={deductionType === value}
                    onChange={() => setDeductionType(value)}
                  />
                  {label}
                </label>
              ))}
            </fieldset>

            {deductionType === "employee" && (
              <FormField label="Responsible employee">
                <select
                  name="chargedEmployeeId"
                  className={selectClass}
                  required
                  defaultValue=""
                >
                  <option value="" disabled>
                    Choose an employee
                  </option>
                  {data.employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name} · {employee.email}
                    </option>
                  ))}
                </select>
              </FormField>
            )}

            <FormField label="Comment">
              <textarea
                name="comment"
                minLength={10}
                maxLength={1000}
                required
                rows={4}
                placeholder="Describe what happened and why the product cannot be used…"
                className={`${selectClass} h-auto resize-y py-2`}
              />
              <p className="text-xs text-muted-foreground">
                Minimum 10 characters.
              </p>
            </FormField>

            {formState.status === "error" && (
              <Alert variant="destructive">
                <AlertTitle>Could not submit</AlertTitle>
                <AlertDescription>{formState.message}</AlertDescription>
              </Alert>
            )}
            {formState.status === "success" && (
              <Alert>
                <IconCircleCheck />
                <AlertTitle>Request created</AlertTitle>
                <AlertDescription>{formState.message}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              size="lg"
              disabled={formState.status === "pending"}
            >
              {formState.status === "pending" ? (
                <IconLoader2
                  className="animate-spin"
                  data-icon="inline-start"
                />
              ) : (
                <IconArrowRight data-icon="inline-start" />
              )}
              Send for review
            </Button>
          </form>
        </section>

        <section>
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="font-heading text-2xl font-semibold">
                Your history
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {data.requests.length} total requests
              </p>
            </div>
          </div>

          {data.requests.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed p-10 text-center">
              <IconBuildingStore className="mx-auto size-8 text-muted-foreground" />
              <p className="mt-3 font-medium">No write-offs yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Submitted requests will appear here.
              </p>
            </div>
          ) : (
            <div className="mt-5 grid gap-4">
              {data.requests.map((request) => (
                <article
                  key={request.id}
                  className="grid gap-4 rounded-2xl border bg-card p-4 sm:grid-cols-[7rem_1fr] sm:p-5"
                >
                  <img
                    src={request.photoDataUrl}
                    alt=""
                    className="aspect-square w-full rounded-xl object-cover"
                  />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-heading text-lg font-semibold">
                          {productTypeLabels[request.productType]} ·{" "}
                          {request.quantity}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {request.locationName}
                        </p>
                      </div>
                      <StatusBadge status={request.status} />
                    </div>
                    <p className="mt-3 line-clamp-2 text-sm leading-6">
                      {request.comment}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>{formatDate(request.createdAt)}</span>
                      {request.status === "approved" && (
                        <span>
                          {iikoSyncStatusLabels[request.iikoSyncStatus]}
                        </span>
                      )}
                      {request.reviewComment && (
                        <span>Reviewer: {request.reviewComment}</span>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function FormField({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="grid gap-2">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </div>
  )
}

function StatusBadge({
  status,
}: {
  status: "pending" | "approved" | "rejected"
}) {
  const styles = {
    pending: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
    approved: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    rejected: "bg-destructive/10 text-destructive",
  }
  const Icon =
    status === "pending"
      ? IconClock
      : status === "approved"
        ? IconCircleCheck
        : IconX

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${styles[status]}`}
    >
      <Icon className="size-3.5" />
      {writeOffStatusLabels[status]}
    </span>
  )
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener("load", () => resolve(String(reader.result)))
    reader.addEventListener("error", () => reject(reader.error))
    reader.readAsDataURL(file)
  })
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-KZ", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

const selectClass =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
