import {
  IconArrowLeft,
  IconCheck,
  IconClock,
  IconCloudUpload,
  IconLoader2,
  IconPhoto,
  IconX,
} from "@tabler/icons-react"
import { Link, createFileRoute, useRouter } from "@tanstack/react-router"
import { createServerFn, useServerFn } from "@tanstack/react-start"
import { useState } from "react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { reviewWriteOffRequest, syncWriteOffToIiko } from "@/lib/actions"
import {
  deductionModeLabels,
  formatQuantity,
  iikoSyncStatusLabels,
  writeOffStatusLabels,
} from "@/lib/write-offs"
import type { WriteOffStatus } from "@/lib/write-offs"

const getDetail = createServerFn({ method: "GET" })
  .validator((id: string) => id)
  .handler(async ({ data }) => {
    const { getWriteOffDetailData } = await import("@/lib/write-offs.server")
    return getWriteOffDetailData(data)
  })

export const Route = createFileRoute("/review/write-offs/$id")({
  loader: ({ params }) => getDetail({ data: params.id }),
  component: WriteOffDetailPage,
})

function WriteOffDetailPage() {
  const { request, iikoActPreview } = Route.useLoaderData()
  const router = useRouter()
  const reviewRequest = useServerFn(reviewWriteOffRequest)
  const syncToIiko = useServerFn(syncWriteOffToIiko)
  const [reviewComment, setReviewComment] = useState("")
  const [isReviewing, setIsReviewing] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [error, setError] = useState("")

  if (!request) {
    return (
      <div className="rounded-2xl border border-dashed p-10 text-center">
        <p className="font-medium">Request not found</p>
        <Link
          to="/review/write-offs"
          className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          <IconArrowLeft className="size-4" />
          Back to queue
        </Link>
      </div>
    )
  }

  async function handleReview(status: "approved" | "rejected") {
    if (status === "rejected" && reviewComment.trim().length < 3) {
      setError("Add a short reason before rejecting the request.")
      return
    }

    setError("")
    setIsReviewing(true)
    const result = await reviewRequest({
      data: {
        requestId: request!.id,
        status,
        reviewComment: reviewComment.trim(),
      },
    })
    setIsReviewing(false)

    if (!result.ok) {
      setError(result.message)
      return
    }

    await router.invalidate()
  }

  async function handleSync() {
    setError("")
    setIsSyncing(true)
    const result = await syncToIiko({ data: { requestId: request!.id } })
    setIsSyncing(false)

    if (!result.ok) {
      setError(result.message)
      return
    }

    await router.invalidate()
  }

  return (
    <div>
      <Link
        to="/review/write-offs"
        className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <IconArrowLeft className="size-4" />
        Back to queue
      </Link>

      <div className="mt-4 grid gap-8 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
        <section>
          {request.photoUrl ? (
            <a href={request.photoUrl} target="_blank" rel="noreferrer">
              <img
                src={request.photoUrl}
                alt="Write-off evidence"
                className="aspect-square w-full rounded-2xl border object-cover"
              />
            </a>
          ) : (
            <div className="grid aspect-square w-full place-items-center rounded-2xl border border-dashed text-muted-foreground">
              <IconPhoto className="size-10" />
            </div>
          )}
          <p className="mt-2 text-center text-xs text-muted-foreground">
            {request.requestNumber}
          </p>
        </section>

        <section className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-heading text-2xl font-semibold">
              {request.productName} ·{" "}
              {formatQuantity(request.quantity, request.unit)}
            </h2>
            <StatusBadge status={request.status} />
          </div>
          <p className="mt-1 text-muted-foreground">
            {request.pointOfSaleName} · {request.categoryName}
          </p>

          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            <DetailRow
              label="Submitted by"
              value={request.submitter?.name ?? "Unknown"}
              sub={request.submitter?.employeeId ?? undefined}
            />
            <DetailRow
              label="Submitted at"
              value={formatDate(request.createdAt)}
            />
            <DetailRow
              label="Write-off category"
              value={request.writeOffCategoryName}
            />
            <DetailRow
              label="Deduction"
              value={deductionModeLabels[request.deductionMode]}
              sub={request.chargedEmployee?.name ?? undefined}
            />
            <DetailRow
              label="Reviewed by"
              value={request.reviewer?.name ?? "Not reviewed"}
              sub={
                request.reviewedAt ? formatDate(request.reviewedAt) : undefined
              }
            />
          </dl>

          <div className="mt-6 rounded-2xl border bg-card p-4">
            <p className="text-sm font-medium">Employee comment</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {request.comment}
            </p>
          </div>

          {request.reviewComment && (
            <div className="mt-4 rounded-2xl border bg-card p-4">
              <p className="text-sm font-medium">Reviewer note</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {request.reviewComment}
              </p>
            </div>
          )}

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertTitle>Something went wrong</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {request.status === "pending" && (
            <div className="mt-6 rounded-2xl border bg-card p-4">
              <p className="text-sm font-medium">Decision</p>
              <textarea
                value={reviewComment}
                onChange={(event) => setReviewComment(event.target.value)}
                rows={3}
                maxLength={1000}
                placeholder="Review note (required to reject)"
                className="mt-3 w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
              />
              <div className="mt-3 flex gap-2">
                <Button
                  disabled={isReviewing}
                  onClick={() => handleReview("approved")}
                >
                  {isReviewing ? (
                    <IconLoader2
                      className="animate-spin"
                      data-icon="inline-start"
                    />
                  ) : (
                    <IconCheck data-icon="inline-start" />
                  )}
                  Approve
                </Button>
                <Button
                  variant="destructive"
                  disabled={isReviewing}
                  onClick={() => handleReview("rejected")}
                >
                  <IconX data-icon="inline-start" />
                  Reject
                </Button>
              </div>
            </div>
          )}

          {request.status === "approved" && (
            <IikoPanel
              syncStatus={request.iikoSyncStatus}
              documentId={request.iikoDocumentId}
              preview={iikoActPreview}
              isSyncing={isSyncing}
              onSync={handleSync}
            />
          )}
        </section>
      </div>
    </div>
  )
}

function IikoPanel({
  syncStatus,
  documentId,
  preview,
  isSyncing,
  onSync,
}: {
  syncStatus: string
  documentId: string | null
  preview: unknown
  isSyncing: boolean
  onSync: () => void
}) {
  const isSynced = syncStatus === "synced"

  return (
    <div className="mt-6 rounded-2xl border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">iiko write-off act</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {iikoSyncStatusLabels[
              syncStatus as keyof typeof iikoSyncStatusLabels
            ]}
            {documentId ? ` · ${documentId}` : ""}
          </p>
        </div>
        {!isSynced && (
          <Button size="sm" disabled={isSyncing} onClick={onSync}>
            {isSyncing ? (
              <IconLoader2 className="animate-spin" data-icon="inline-start" />
            ) : (
              <IconCloudUpload data-icon="inline-start" />
            )}
            Send to iiko
          </Button>
        )}
      </div>

      {preview ? (
        <pre className="mt-3 max-h-72 overflow-auto rounded-xl bg-muted/60 p-3 text-xs leading-5">
          {JSON.stringify(preview, null, 2)}
        </pre>
      ) : null}
      {isSynced && (
        <p className="mt-3 text-xs text-emerald-600 dark:text-emerald-300">
          Stock has been written off in iiko.
        </p>
      )}
    </div>
  )
}

function DetailRow({
  label,
  value,
  sub,
}: {
  label: string
  value: string
  sub?: string
}) {
  return (
    <div className="rounded-xl bg-muted p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm font-medium">{value}</dd>
      {sub && <dd className="text-xs text-muted-foreground">{sub}</dd>}
    </div>
  )
}

function StatusBadge({ status }: { status: WriteOffStatus }) {
  const styles = {
    pending: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
    approved: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    rejected: "bg-destructive/10 text-destructive",
  }
  const Icon =
    status === "pending" ? IconClock : status === "approved" ? IconCheck : IconX

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${styles[status]}`}
    >
      <Icon className="size-3.5" />
      {writeOffStatusLabels[status]}
    </span>
  )
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-KZ", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}
