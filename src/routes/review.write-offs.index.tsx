import {
  IconCheck,
  IconClock,
  IconExternalLink,
  IconLoader2,
  IconPhotoOff,
  IconSearch,
  IconX,
} from "@tabler/icons-react"
import { Link, createFileRoute } from "@tanstack/react-router"
import { createServerFn, useServerFn } from "@tanstack/react-start"
import { useMemo, useState } from "react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { CityPosFilter } from "@/components/city-pos-filter"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { ConfidencePill } from "@/components/write-off-ml-panel"
import { reviewWriteOffRequest } from "@/lib/actions"
import { matchesCityPosFilter } from "@/lib/point-of-sale"
import { cn } from "@/lib/utils"
import {
  deductionModeLabels,
  formatMoney,
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
      approvedLoss: requests
        .filter((request) => request.status === "approved")
        .reduce((sum, request) => sum + (request.lossAmount ?? 0), 0),
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

  const statusFilters: Array<{
    key: StatusFilter
    label: string
    count: number
  }> = [
    { key: "all", label: "Все", count: stats.total },
    {
      key: "pending",
      label: writeOffStatusLabels.pending,
      count: stats.pending,
    },
    {
      key: "approved",
      label: writeOffStatusLabels.approved,
      count: stats.approved,
    },
    {
      key: "rejected",
      label: writeOffStatusLabels.rejected,
      count: stats.rejected,
    },
  ]

  return (
    <div>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Все заявки" value={stats.total} />
        <StatCard
          label="На рассмотрении"
          value={stats.pending}
          tone="warning"
        />
        <StatCard label="Одобрено" value={stats.approved} tone="success" />
        <StatCard label="Отклонено" value={stats.rejected} tone="destructive" />
        <StatCard
          label="Потери (одобрено)"
          value={formatMoney(stats.approvedLoss)}
        />
      </section>

      <section className="mt-8">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <CityPosFilter
            pointsOfSale={initialData.pointsOfSale}
            city={city}
            posId={posId}
            onCityChange={setCity}
            onPosChange={setPosId}
          />
        </div>

        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {statusFilters.map(({ key, label, count }) => (
              <Button
                key={key}
                type="button"
                size="sm"
                variant={statusFilter === key ? "default" : "outline"}
                onClick={() => setStatusFilter(key)}
              >
                {label}
                <span className="tabular-nums opacity-70">{count}</span>
              </Button>
            ))}
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

        <div className="mt-2 overflow-hidden rounded-2xl border bg-card">
          <Table className="min-w-[1040px]">
            <TableHeader className="bg-muted/40">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-3 p-0" aria-label="Уверенность QC" />
                <TableHead>Фото</TableHead>
                <SortableHead
                  label="Подано"
                  sortKey="createdAt"
                  sort={sort}
                  onSort={toggleSort}
                />
                <SortableHead
                  label="Точка продаж"
                  sortKey="pointOfSaleName"
                  sort={sort}
                  onSort={toggleSort}
                />
                <TableHead>Детали</TableHead>
                <SortableHead
                  label="Статус"
                  sortKey="status"
                  sort={sort}
                  onSort={toggleSort}
                />
                <TableHead>Решение</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleRequests.map((request) => {
                const isPending = pendingIds.has(request.id)
                const ml = request.mlClassification
                const showMlPill = Boolean(ml && !ml.error && ml.confidence > 0)
                return (
                  <TableRow key={request.id} className="align-middle">
                    <TableCell className="w-3 px-1 py-4 align-middle">
                      {showMlPill ? (
                        <ConfidencePill
                          confidence={ml!.confidence}
                          className="mx-auto min-h-16"
                        />
                      ) : null}
                    </TableCell>
                    <TableCell className="py-4">
                      <Link
                        to="/review/write-offs/$id"
                        params={{ id: request.id }}
                        aria-label="Открыть заявку"
                      >
                        <Evidence url={request.photoUrl} />
                      </Link>
                    </TableCell>
                    <TableCell className="py-4 whitespace-normal">
                      <p className="font-medium">
                        {request.submitter?.name ?? "Неизвестный пользователь"}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {request.requestNumber} ·{" "}
                        {formatDate(request.createdAt)}
                      </p>
                    </TableCell>
                    <TableCell className="py-4 whitespace-normal text-muted-foreground">
                      {request.pointOfSaleName}
                    </TableCell>
                    <TableCell className="max-w-72 py-4 whitespace-normal">
                      <p className="font-medium">
                        {request.productName} ·{" "}
                        {formatQuantity(request.quantity, request.unit)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Потери: {formatMoney(request.lossAmount)}
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
                    </TableCell>
                    <TableCell className="py-4 whitespace-normal">
                      <StatusBadge status={request.status} />
                      {request.status === "approved" && (
                        <p className="mt-2 max-w-28 text-xs text-muted-foreground">
                          {iikoSyncStatusLabels[request.iikoSyncStatus]}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="w-64 py-4 whitespace-normal">
                      {request.status === "pending" ? (
                        <div className="grid gap-2">
                          <Textarea
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
                            className="min-h-16 py-2 text-xs"
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
                    </TableCell>
                  </TableRow>
                )
              })}
              {visibleRequests.length === 0 && (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={7} className="p-0">
                    <Empty className="border-0">
                      <EmptyHeader>
                        <EmptyMedia variant="icon">
                          <IconSearch />
                        </EmptyMedia>
                        <EmptyTitle>Ничего не найдено</EmptyTitle>
                        <EmptyDescription>
                          Под выбранные фильтры не попала ни одна заявка.
                          Измените статус, точку продаж или строку поиска.
                        </EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  )
}

function Evidence({ url }: { url: string | null }) {
  if (!url) {
    return (
      <span className="grid size-16 place-items-center rounded-lg bg-muted text-muted-foreground">
        <IconPhotoOff className="size-6" />
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
  value: number | string
  tone?: "default" | "warning" | "success" | "destructive"
}) {
  const tones = {
    default: "text-foreground",
    warning: "text-warning",
    success: "text-success",
    destructive: "text-destructive",
  }

  return (
    <Card size="sm">
      <CardContent>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p
          className={cn(
            "mt-2 font-heading text-3xl font-semibold tabular-nums",
            tones[tone]
          )}
        >
          {value}
        </p>
      </CardContent>
    </Card>
  )
}

function SortableHead({
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
    <TableHead
      className="cursor-pointer select-none"
      onClick={() => onSort(sortKey)}
    >
      {label}
      {sort.key === sortKey && (
        <span className="ml-1 text-muted-foreground">
          {sort.direction === "asc" ? "↑" : "↓"}
        </span>
      )}
    </TableHead>
  )
}

function StatusBadge({ status }: { status: WriteOffStatus }) {
  const variants = {
    pending: "warning",
    approved: "success",
    rejected: "destructive",
  } as const
  const Icon =
    status === "pending" ? IconClock : status === "approved" ? IconCheck : IconX

  return (
    <Badge variant={variants[status]}>
      <Icon />
      {writeOffStatusLabels[status]}
    </Badge>
  )
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ru-KZ", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}
