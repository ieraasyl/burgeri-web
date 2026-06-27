import {
  IconCheck,
  IconClock,
  IconExternalLink,
  IconLoader2,
  IconPhoto,
  IconSearch,
  IconX,
} from "@tabler/icons-react"
import { Link, createFileRoute } from "@tanstack/react-router"
import { createServerFn, useServerFn } from "@tanstack/react-start"
import { useMemo, useState } from "react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { CityPosFilter } from "@/components/city-pos-filter"
import { ConfidencePill } from "@/components/write-off-ml-panel"
import { Input } from "@/components/ui/input"
import { reviewWriteOffRequest } from "@/lib/actions"
import { matchesCityPosFilter } from "@/lib/point-of-sale"
import {
  deductionModeLabels,
  formatQuantity,
  iikoSyncStatusLabels,
  writeOffStatusLabels,
} from "@/lib/write-offs"
import type { WriteOffStatus } from "@/lib/write-offs"

const getReviewData = createServerFn({ method: "GET" }).handler(async () => {
  const { getWriteOffReviewData } = await import("@/lib/write-offs.server")
  return getWriteOffReviewData()
})

export const Route = createFileRoute("/review/write-offs/")({
  loader: () => getReviewData(),
  component: WriteOffReviewPage,
})

type ReviewRequest = ReturnType<typeof Route.useLoaderData>["requests"][number]
type StatusFilter = "all" | WriteOffStatus
type SortKey = "createdAt" | "pointOfSaleName" | "status"

function WriteOffReviewPage() {
  const initialData = Route.useLoaderData()
  const reviewRequest = useServerFn(reviewWriteOffRequest)
  const [requests, setRequests] = useState(initialData.requests)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending")
  const [city, setCity] = useState("all")
  const [posId, setPosId] = useState("all")
  const [search, setSearch] = useState("")
  const [sort, setSort] = useState<{ key: SortKey; direction: "asc" | "desc" }>(
    { key: "createdAt", direction: "desc" }
  )
  const [comments, setComments] = useState<Record<string, string>>({})
  const [pendingIds, setPendingIds] = useState<Set<string>>(() => new Set())
  const [actionError, setActionError] = useState("")

  const stats = useMemo(
    () => ({
      total: requests.length,
      pending: requests.filter((request) => request.status === "pending")
        .length,
      approved: requests.filter((request) => request.status === "approved")
        .length,
      rejected: requests.filter((request) => request.status === "rejected")
        .length,
    }),
    [requests]
  )

  const visibleRequests = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()
    const filtered = requests.filter((request) => {
      if (statusFilter !== "all" && request.status !== statusFilter) {
        return false
      }
      if (!matchesCityPosFilter(request, city, posId)) {
        return false
      }
      if (!query) {
        return true
      }
      return [
        request.requestNumber,
        request.submitter?.name,
        request.submitter?.employeeId,
        request.pointOfSaleName,
        request.productName,
        request.comment,
      ].some((value) => value?.toLocaleLowerCase().includes(query))
    })

    return [...filtered].sort((a, b) => {
      const comparison =
        sort.key === "createdAt"
          ? new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          : String(a[sort.key]).localeCompare(String(b[sort.key]), undefined, {
              sensitivity: "base",
            })
      return sort.direction === "asc" ? comparison : -comparison
    })
  }, [requests, search, sort, statusFilter, city, posId])

  function toggleSort(key: SortKey) {
    setSort((current) => ({
      key,
      direction:
        current.key === key && current.direction === "asc" ? "desc" : "asc",
    }))
  }

  async function handleReview(
    request: ReviewRequest,
    status: "approved" | "rejected"
  ) {
    const reviewComment = (comments[request.id] || "").trim()
    if (status === "rejected" && reviewComment.length < 3) {
      setActionError("Укажите краткую причину перед отклонением заявки.")
      return
    }

    setActionError("")
    setPendingIds((current) => new Set(current).add(request.id))
    setRequests((current) =>
      current.map((row) =>
        row.id === request.id
          ? {
              ...row,
              status,
              reviewComment: reviewComment || null,
              iikoSyncStatus: status === "approved" ? "queued" : "not_started",
            }
          : row
      )
    )

    const result = await reviewRequest({
      data: { requestId: request.id, status, reviewComment },
    })

    if (!result.ok) {
      setRequests((current) =>
        current.map((row) => (row.id === request.id ? request : row))
      )
      setActionError(result.message)
    }

    setPendingIds((current) => {
      const next = new Set(current)
      next.delete(request.id)
      return next
    })
  }

  return (
    <div>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Все заявки" value={stats.total} />
        <StatCard label="На рассмотрении" value={stats.pending} tone="amber" />
        <StatCard label="Одобрено" value={stats.approved} tone="green" />
        <StatCard label="Отклонено" value={stats.rejected} tone="red" />
      </section>

      <section className="mt-8">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <CityPosFilter
            pointsOfSale={initialData.pointsOfSale}
            city={city}
            posId={posId}
            onCityChange={setCity}
            onPosChange={setPosId}
            selectClass="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
          />
        </div>

        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {(["all", "pending", "approved", "rejected"] as const).map(
              (status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(status)}
                  className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                    statusFilter === status
                      ? "border-primary bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  }`}
                >
                  {status === "all" ? "Все" : writeOffStatusLabels[status]}
                  <span className="ml-1.5 opacity-70">
                    {status === "all" ? stats.total : stats[status]}
                  </span>
                </button>
              )
            )}
          </div>
          <label className="relative w-full lg:max-w-sm">
            <IconSearch className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Поиск: номер, сотрудник, точка, продукт…"
              className="pl-9"
            />
          </label>
        </div>

        {actionError && (
          <Alert variant="destructive" className="mt-4">
            <AlertTitle>Не удалось обновить заявку</AlertTitle>
            <AlertDescription>{actionError}</AlertDescription>
          </Alert>
        )}

        <p className="mt-5 text-xs text-muted-foreground">
          Показано {visibleRequests.length} из {requests.length} заявок
        </p>

        <div className="mt-2 overflow-x-auto rounded-2xl border">
          <table className="w-full min-w-[1040px] text-left text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="w-3 p-0" aria-label="Уверенность QC" />
                <th className="px-4 py-3 font-medium">Фото</th>
                <SortableHeader
                  label="Подано"
                  sortKey="createdAt"
                  sort={sort}
                  onSort={toggleSort}
                />
                <SortableHeader
                  label="Точка продаж"
                  sortKey="pointOfSaleName"
                  sort={sort}
                  onSort={toggleSort}
                />
                <th className="px-4 py-3 font-medium">Детали</th>
                <SortableHeader
                  label="Статус"
                  sortKey="status"
                  sort={sort}
                  onSort={toggleSort}
                />
                <th className="px-4 py-3 font-medium">Решение</th>
              </tr>
            </thead>
            <tbody>
              {visibleRequests.map((request) => {
                const isPending = pendingIds.has(request.id)
                const ml = request.mlClassification
                const showMlPill = Boolean(
                  ml && !ml.error && ml.confidence > 0
                )
                return (
                  <tr
                    key={request.id}
                    className="border-b align-top last:border-0 hover:bg-muted/20"
                  >
                    <td className="w-3 px-1 py-4 align-middle">
                      {showMlPill ? (
                        <ConfidencePill
                          confidence={ml!.confidence}
                          className="mx-auto min-h-16"
                        />
                      ) : null}
                    </td>
                    <td className="px-4 py-4">
                      <Link
                        to="/review/write-offs/$id"
                        params={{ id: request.id }}
                        aria-label="Открыть заявку"
                      >
                        <Evidence url={request.photoUrl} />
                      </Link>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-medium">
                        {request.submitter?.name ?? "Неизвестный пользователь"}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {request.requestNumber} ·{" "}
                        {formatDate(request.createdAt)}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">
                      {request.pointOfSaleName}
                    </td>
                    <td className="max-w-72 px-4 py-4">
                      <p className="font-medium">
                        {request.productName} ·{" "}
                        {formatQuantity(request.quantity, request.unit)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {request.writeOffCategoryName} ·{" "}
                        {deductionModeLabels[request.deductionMode]}
                        {request.chargedEmployee
                          ? ` · ${request.chargedEmployee.name}`
                          : ""}
                      </p>
                      <p className="mt-2 line-clamp-3 text-sm leading-5">
                        {request.comment}
                      </p>
                      <Link
                        to="/review/write-offs/$id"
                        params={{ id: request.id }}
                        className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                      >
                        Открыть детали
                        <IconExternalLink className="size-3.5" />
                      </Link>
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge status={request.status} />
                      {request.status === "approved" && (
                        <p className="mt-2 max-w-28 text-xs text-muted-foreground">
                          {iikoSyncStatusLabels[request.iikoSyncStatus]}
                        </p>
                      )}
                    </td>
                    <td className="w-64 px-4 py-4">
                      {request.status === "pending" ? (
                        <div className="grid gap-2">
                          <textarea
                            value={comments[request.id] ?? ""}
                            onChange={(event) =>
                              setComments((current) => ({
                                ...current,
                                [request.id]: event.target.value,
                              }))
                            }
                            rows={2}
                            maxLength={1000}
                            placeholder="Заметка ревьюера (обязательна при отклонении)"
                            className="w-full resize-none rounded-md border border-input bg-background px-2.5 py-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              disabled={isPending}
                              onClick={() => handleReview(request, "approved")}
                            >
                              {isPending ? (
                                <IconLoader2 className="animate-spin" />
                              ) : (
                                <IconCheck />
                              )}
                              Одобрить
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={isPending}
                              onClick={() => handleReview(request, "rejected")}
                            >
                              <IconX />
                              Отклонить
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground">
                          <p>{request.reviewer?.name ?? "Ревьюер"}</p>
                          {request.reviewComment && (
                            <p className="mt-1 text-foreground">
                              {request.reviewComment}
                            </p>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
              {visibleRequests.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-12 text-center text-muted-foreground"
                  >
                    Нет заявок по этим фильтрам.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function Evidence({ url }: { url: string | null }) {
  if (!url) {
    return (
      <span className="grid size-16 place-items-center rounded-lg bg-muted text-muted-foreground">
        <IconPhoto className="size-6" />
      </span>
    )
  }
  return <img src={url} alt="" className="size-16 rounded-lg object-cover" />
}

function StatCard({
  label,
  value,
  tone = "default",
}: {
  label: string
  value: number
  tone?: "default" | "amber" | "green" | "red"
}) {
  const tones = {
    default: "text-foreground",
    amber: "text-amber-600 dark:text-amber-300",
    green: "text-emerald-600 dark:text-emerald-300",
    red: "text-destructive",
  }

  return (
    <div className="rounded-2xl border bg-card p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={`mt-2 font-heading text-3xl font-semibold ${tones[tone]}`}>
        {value}
      </p>
    </div>
  )
}

function SortableHeader({
  label,
  sortKey,
  sort,
  onSort,
}: {
  label: string
  sortKey: SortKey
  sort: { key: SortKey; direction: "asc" | "desc" }
  onSort: (key: SortKey) => void
}) {
  return (
    <th
      className="cursor-pointer px-4 py-3 font-medium select-none"
      onClick={() => onSort(sortKey)}
    >
      {label}
      {sort.key === sortKey && (
        <span className="ml-1 text-muted-foreground">
          {sort.direction === "asc" ? "↑" : "↓"}
        </span>
      )}
    </th>
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
  return new Intl.DateTimeFormat("ru-KZ", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}
