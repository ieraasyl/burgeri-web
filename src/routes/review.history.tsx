import { IconDownload, IconSearch } from "@tabler/icons-react"
import { createFileRoute } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"
import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  deductionModeLabels,
  formatQuantity,
  iikoSyncStatusLabels,
  writeOffStatusLabels,
} from "@/lib/write-offs"
import type { WriteOffDeductionMode, WriteOffStatus } from "@/lib/write-offs"

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

function HistoryPage() {
  const { requests } = Route.useLoaderData()
  const [status, setStatus] = useState<StatusFilter>("all")
  const [location, setLocation] = useState("all")
  const [product, setProduct] = useState("all")
  const [search, setSearch] = useState("")

  const locationOptions = useMemo(
    () => uniqueOptions(requests, (r) => [r.pointOfSaleId, r.pointOfSaleName]),
    [requests]
  )
  const productOptions = useMemo(
    () => uniqueOptions(requests, (r) => [r.productId, r.productName]),
    [requests]
  )

  const visible = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()
    return requests.filter((request) => {
      if (status !== "all" && request.status !== status) return false
      if (location !== "all" && request.pointOfSaleId !== location) return false
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
  }, [requests, status, location, product, search])

  return (
    <div>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Статус">
            <select
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as StatusFilter)
              }
              className={selectClass}
            >
              <option value="all">Все статусы</option>
              {(["pending", "approved", "rejected"] as const).map((value) => (
                <option key={value} value={value}>
                  {writeOffStatusLabels[value]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Точка продаж">
            <select
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              className={selectClass}
            >
              <option value="all">Все точки продаж</option>
              {locationOptions.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Продукт">
            <select
              value={product}
              onChange={(event) => setProduct(event.target.value)}
              className={selectClass}
            >
              <option value="all">Все продукты</option>
              {productOptions.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                </option>
              ))}
            </select>
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
      </p>

      <div className="mt-2 overflow-x-auto rounded-2xl border">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead className="border-b bg-muted/40">
            <tr>
              <Th>Номер</Th>
              <Th>Подано</Th>
              <Th>Сотрудник</Th>
              <Th>Точка продаж</Th>
              <Th>Продукт</Th>
              <Th>Удержание</Th>
              <Th>Статус</Th>
              <Th>iiko</Th>
            </tr>
          </thead>
          <tbody>
            {visible.map((request) => (
              <tr
                key={request.id}
                className="border-b align-top last:border-0 hover:bg-muted/20"
              >
                <td className="px-4 py-3 font-medium">
                  {request.requestNumber}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {formatDate(request.createdAt)}
                </td>
                <td className="px-4 py-3">{request.submitter?.name ?? "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {request.pointOfSaleName}
                </td>
                <td className="px-4 py-3">
                  {request.productName} ·{" "}
                  {formatQuantity(request.quantity, request.unit)}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {deductionModeLabels[request.deductionMode]}
                  {request.chargedEmployee
                    ? ` · ${request.chargedEmployee.name}`
                    : ""}
                </td>
                <td className="px-4 py-3">
                  {writeOffStatusLabels[request.status]}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {request.iikoDocumentId ??
                    iikoSyncStatusLabels[request.iikoSyncStatus]}
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="px-6 py-12 text-center text-muted-foreground"
                >
                  Нет записей по этим фильтрам.
                </td>
              </tr>
            )}
          </tbody>
        </table>
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

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="grid gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 font-medium">{children}</th>
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

const selectClass =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
