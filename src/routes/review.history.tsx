import { IconDownload, IconHistory, IconSearch } from "@tabler/icons-react"
import { createFileRoute } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"
import { useMemo, useState } from "react"

import { CityPosFilter } from "@/components/city-pos-filter"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { matchesCityPosFilter } from "@/lib/point-of-sale"
import {
  deductionModeLabels,
  formatMoney,
  formatQuantity,
  iikoSyncStatusLabels,
  writeOffStatusLabels,
} from "@/lib/write-offs"
import type {
  IikoSyncStatus,
  WriteOffDeductionMode,
  WriteOffStatus,
} from "@/lib/write-offs"

const getHistory = createServerFn({ method: "GET" }).handler(async () => {
  const { getWriteOffHistoryData } = await import("@/lib/write-offs.server")
  return getWriteOffHistoryData()
})

export const Route = createFileRoute("/review/history")({
  loader: () => getHistory(),
  component: HistoryPage,
})

type HistoryRequest = ReturnType<typeof Route.useLoaderData>["requests"][number]
type StatusFilter = "all" | WriteOffStatus
type SortKey =
  | "requestNumber"
  | "createdAt"
  | "submitterName"
  | "pointOfSaleName"
  | "productName"
  | "lossAmount"
  | "deduction"
  | "status"
  | "iiko"

const statusBadgeVariant = {
  pending: "warning",
  approved: "success",
  rejected: "destructive",
} as const

function HistoryPage() {
  const { requests, pointsOfSale } = Route.useLoaderData()
  const [status, setStatus] = useState<StatusFilter>("all")
  const [city, setCity] = useState("all")
  const [posId, setPosId] = useState("all")
  const [product, setProduct] = useState("all")
  const [search, setSearch] = useState("")
  const [sort, setSort] = useState<{ key: SortKey; direction: "asc" | "desc" }>(
    { key: "createdAt", direction: "desc" }
  )

  const productOptions = useMemo(
    () => uniqueOptions(requests, (r) => [r.productId, r.productName]),
    [requests]
  )
  const statusItems = useMemo(
    () => [
      { value: "all", label: "Все статусы" },
      ...(["pending", "approved", "rejected"] as const).map((value) => ({
        value,
        label: writeOffStatusLabels[value],
      })),
    ],
    []
  )
  const productItems = useMemo(
    () => [
      { value: "all", label: "Все продукты" },
      ...productOptions.map((row) => ({ value: row.id, label: row.name })),
    ],
    [productOptions]
  )

  const visible = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()
    const filtered = requests.filter((request) => {
      if (status !== "all" && request.status !== status) return false
      if (!matchesCityPosFilter(request, city, posId)) return false
      if (product !== "all" && request.productId !== product) return false
      if (!query) return true
      return [
        request.requestNumber,
        request.submitter?.name,
        request.submitter?.employeeId,
        request.comment,
        request.iikoDocumentId,
      ].some((value) => value?.toLocaleLowerCase().includes(query))
    })

    return [...filtered].sort((a, b) => compareHistoryRequests(a, b, sort))
  }, [requests, status, city, posId, product, search, sort])

  const visibleApprovedLoss = useMemo(
    () =>
      visible
        .filter((request) => request.status === "approved")
        .reduce((sum, request) => sum + (request.lossAmount ?? 0), 0),
    [visible]
  )

  function toggleSort(key: SortKey) {
    setSort((current) => ({
      key,
      direction:
        current.key === key && current.direction === "asc" ? "desc" : "asc",
    }))
  }

  return (
    <div>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <Field label="Статус">
            <Select
              value={status}
              items={statusItems}
              onValueChange={(value) => setStatus(value ?? "all")}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Все статусы" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">Все статусы</SelectItem>
                  {(["pending", "approved", "rejected"] as const).map(
                    (value) => (
                      <SelectItem key={value} value={value}>
                        {writeOffStatusLabels[value]}
                      </SelectItem>
                    )
                  )}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <CityPosFilter
            pointsOfSale={pointsOfSale}
            city={city}
            posId={posId}
            onCityChange={setCity}
            onPosChange={setPosId}
            posClassName="xl:col-span-2"
          />
          <Field label="Продукт">
            <Select
              value={product}
              items={productItems}
              onValueChange={(value) => setProduct(value ?? "all")}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Все продукты" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">Все продукты</SelectItem>
                  {productOptions.map((row) => (
                    <SelectItem key={row.id} value={row.id}>
                      {row.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Поиск">
            <label className="relative block">
              <IconSearch className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Номер, сотрудник, id документа…"
                className="pl-9"
              />
            </label>
          </Field>
        </div>
        <Button
          onClick={() => downloadCsv(visible)}
          disabled={visible.length === 0}
        >
          <IconDownload data-icon="inline-start" />
          Экспорт CSV
        </Button>
      </div>

      <p className="mt-5 text-xs text-muted-foreground">
        Показано {visible.length} из {requests.length} записей
        {visibleApprovedLoss > 0
          ? ` · потери (одобрено): ${formatMoney(visibleApprovedLoss)}`
          : ""}
      </p>

      <div className="mt-2 overflow-hidden rounded-2xl border bg-card">
        <Table className="min-w-[960px]">
          <TableHeader className="bg-muted/40">
            <TableRow className="hover:bg-transparent">
              <SortableHead
                label="Номер"
                sortKey="requestNumber"
                sort={sort}
                onSort={toggleSort}
              />
              <SortableHead
                label="Подано"
                sortKey="createdAt"
                sort={sort}
                onSort={toggleSort}
              />
              <SortableHead
                label="Сотрудник"
                sortKey="submitterName"
                sort={sort}
                onSort={toggleSort}
              />
              <SortableHead
                label="Точка продаж"
                sortKey="pointOfSaleName"
                sort={sort}
                onSort={toggleSort}
              />
              <SortableHead
                label="Продукт"
                sortKey="productName"
                sort={sort}
                onSort={toggleSort}
              />
              <SortableHead
                label="Потери"
                sortKey="lossAmount"
                sort={sort}
                onSort={toggleSort}
              />
              <SortableHead
                label="Удержание"
                sortKey="deduction"
                sort={sort}
                onSort={toggleSort}
              />
              <SortableHead
                label="Статус"
                sortKey="status"
                sort={sort}
                onSort={toggleSort}
              />
              <SortableHead
                label="iiko"
                sortKey="iiko"
                sort={sort}
                onSort={toggleSort}
              />
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((request) => (
              <TableRow key={request.id} className="align-middle">
                <TableCell className="py-3 font-medium">
                  {request.requestNumber}
                </TableCell>
                <TableCell className="py-3 whitespace-normal text-muted-foreground">
                  {formatDate(request.createdAt)}
                </TableCell>
                <TableCell className="py-3 whitespace-normal">
                  {request.submitter?.name ?? "—"}
                </TableCell>
                <TableCell className="py-3 whitespace-normal text-muted-foreground">
                  {request.pointOfSaleName}
                </TableCell>
                <TableCell className="py-3 whitespace-normal">
                  {request.productName} ·{" "}
                  {formatQuantity(request.quantity, request.unit)}
                </TableCell>
                <TableCell className="py-3 text-muted-foreground">
                  {formatMoney(request.lossAmount)}
                </TableCell>
                <TableCell className="py-3 whitespace-normal text-muted-foreground">
                  {deductionModeLabels[request.deductionMode]}
                  {request.chargedEmployee
                    ? ` · ${request.chargedEmployee.name}`
                    : ""}
                </TableCell>
                <TableCell className="py-3">
                  <Badge variant={statusBadgeVariant[request.status]}>
                    {writeOffStatusLabels[request.status]}
                  </Badge>
                </TableCell>
                <TableCell className="py-3 whitespace-normal text-muted-foreground">
                  {request.iikoDocumentId ??
                    iikoSyncStatusLabels[request.iikoSyncStatus]}
                </TableCell>
              </TableRow>
            ))}
            {visible.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={9} className="p-0">
                  <Empty className="border-0">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <IconHistory />
                      </EmptyMedia>
                      <EmptyTitle>Нет записей</EmptyTitle>
                      <EmptyDescription>
                        По выбранным фильтрам история пуста. Сбросьте статус,
                        точку продаж или продукт.
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

function uniqueOptions(
  requests: HistoryRequest[],
  pick: (request: HistoryRequest) => [string, string]
) {
  const map = new Map<string, string>()
  for (const request of requests) {
    const [id, name] = pick(request)
    map.set(id, name)
  }
  return [...map.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

function compareHistoryRequests(
  a: HistoryRequest,
  b: HistoryRequest,
  sort: { key: SortKey; direction: "asc" | "desc" }
) {
  const comparison =
    sort.key === "createdAt" || sort.key === "lossAmount"
      ? compareNumber(sortNumber(a, sort.key), sortNumber(b, sort.key))
      : compareText(sortText(a, sort.key), sortText(b, sort.key))

  const directed = sort.direction === "asc" ? comparison : -comparison
  return directed || compareText(a.requestNumber, b.requestNumber)
}

function sortNumber(request: HistoryRequest, key: SortKey) {
  if (key === "createdAt") {
    return new Date(request.createdAt).getTime()
  }
  if (key === "lossAmount") {
    return request.lossAmount ?? 0
  }
  return 0
}

function sortText(request: HistoryRequest, key: SortKey) {
  if (key === "requestNumber") {
    return request.requestNumber
  }
  if (key === "submitterName") {
    return request.submitter?.name ?? ""
  }
  if (key === "pointOfSaleName") {
    return request.pointOfSaleName
  }
  if (key === "productName") {
    return request.productName
  }
  if (key === "deduction") {
    return [
      deductionModeLabels[request.deductionMode as WriteOffDeductionMode],
      request.chargedEmployee?.name ?? "",
    ].join(" ")
  }
  if (key === "status") {
    return writeOffStatusLabels[request.status as WriteOffStatus]
  }
  if (key === "iiko") {
    return (
      request.iikoDocumentId ??
      iikoSyncStatusLabels[request.iikoSyncStatus as IikoSyncStatus]
    )
  }
  return ""
}

function compareNumber(a: number, b: number) {
  return a - b
}

function compareText(a: string, b: string) {
  return a.localeCompare(b, undefined, { sensitivity: "base" })
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

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="grid min-w-0 gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </div>
  )
}

function downloadCsv(rows: HistoryRequest[]) {
  const header = [
    "request_number",
    "submitted_at",
    "employee_name",
    "employee_id",
    "point_of_sale",
    "product",
    "quantity",
    "unit",
    "unit_cost",
    "loss_amount",
    "write_off_category",
    "deduction",
    "charged_employee",
    "status",
    "reviewer",
    "reviewed_at",
    "review_comment",
    "iiko_status",
    "iiko_document_id",
    "comment",
  ]
  const lines = rows.map((request) =>
    [
      request.requestNumber,
      request.createdAt,
      request.submitter?.name ?? "",
      request.submitter?.employeeId ?? "",
      request.pointOfSaleName,
      request.productName,
      request.quantity,
      request.unit,
      request.unitCost ?? "",
      request.lossAmount ?? "",
      request.writeOffCategoryName,
      deductionModeLabels[request.deductionMode as WriteOffDeductionMode],
      request.chargedEmployee?.name ?? "",
      request.status,
      request.reviewer?.name ?? "",
      request.reviewedAt ?? "",
      request.reviewComment ?? "",
      request.iikoSyncStatus,
      request.iikoDocumentId ?? "",
      request.comment,
    ]
      .map(csvCell)
      .join(",")
  )
  const csv = [header.join(","), ...lines].join("\r\n")
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `write-offs-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function csvCell(value: string | number) {
  const text = String(value)
  if (/[",\r\n]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`
  }
  return text
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ru-KZ", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}
