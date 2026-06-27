import {
  IconArrowDownRight,
  IconArrowUpRight,
  IconMinus,
} from "@tabler/icons-react"
import { Link, createFileRoute } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"
import { useState } from "react"

import { cn } from "@/lib/utils"

type RangeKey = "7d" | "14d" | "30d"
type MetricKey = "total" | "pending" | "approved" | "rejected"
type BreakdownKey = "locations" | "products" | "categories"

const rangeDays: Record<RangeKey, 7 | 14 | 30> = {
  "7d": 7,
  "14d": 14,
  "30d": 30,
}

const getAnalytics = createServerFn({ method: "GET" })
  .validator((days: 7 | 14 | 30) => days)
  .handler(async ({ data }) => {
    const { getWriteOffAnalyticsData } = await import("@/lib/write-offs.server")
    return getWriteOffAnalyticsData(data)
  })

export const Route = createFileRoute("/review/analytics")({
  validateSearch: (search): { range?: RangeKey } => ({
    range:
      search.range === "7d" || search.range === "30d" || search.range === "14d"
        ? search.range
        : undefined,
  }),
  loaderDeps: ({ search }) => ({ range: search.range ?? "14d" }),
  loader: ({ deps }) => getAnalytics({ data: rangeDays[deps.range] }),
  component: AnalyticsPage,
})

const metricLabels: Record<MetricKey, string> = {
  total: "All write-offs",
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
}

function AnalyticsPage() {
  const data = Route.useLoaderData()
  const { range: searchRange } = Route.useSearch()
  const range = searchRange ?? "14d"
  const [metric, setMetric] = useState<MetricKey>("total")
  const [breakdown, setBreakdown] = useState<BreakdownKey>("locations")
  const breakdowns = {
    locations: data.byLocation,
    products: data.byProduct,
    categories: data.byCategory,
  }
  const approvalRate = data.byStatus.total
    ? Math.round((data.byStatus.approved / data.byStatus.total) * 100)
    : 0
  const deductionTotal = data.byDeduction.none + data.byDeduction.employee

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-muted-foreground">
            A focused view of write-off volume, decisions, and iiko delivery.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatDate(data.period.start)}–{formatDate(data.period.end, true)}{" "}
            · UTC
          </p>
        </div>
        <div
          className="inline-flex w-fit rounded-lg border bg-card p-1"
          aria-label="Analytics date range"
        >
          {Object.keys(rangeDays).map((key) => (
            <Link
              key={key}
              to="/review/analytics"
              search={{ range: key as RangeKey }}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
                range === key && "bg-muted text-foreground shadow-sm"
              )}
            >
              {key}
            </Link>
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border bg-card">
        <div className="grid divide-y sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
          {(Object.keys(metricLabels) as MetricKey[]).map((key) => (
            <MetricButton
              key={key}
              label={metricLabels[key]}
              value={data.byStatus[key]}
              previous={data.previousByStatus[key]}
              active={metric === key}
              onClick={() => setMetric(key)}
            />
          ))}
        </div>
        <div className="border-t p-4 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-heading text-lg font-semibold">
                {metricLabels[metric]}
              </h2>
              <p className="text-xs text-muted-foreground">
                Daily submissions · last {data.period.days} days
              </p>
            </div>
            <p className="text-sm font-medium tabular-nums">
              {data.byStatus[metric]} total
            </p>
          </div>
          <TrendChart rows={data.trend} metric={metric} />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Panel>
          <PanelHeader
            title="Operational breakdown"
            subtitle="Where write-offs are concentrated"
          />
          <div className="mt-4 flex gap-1 border-b">
            {(
              [
                ["locations", "Locations"],
                ["products", "Products"],
                ["categories", "Reasons"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                className={cn(
                  "border-b-2 border-transparent px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground",
                  breakdown === key &&
                    "border-primary font-medium text-foreground"
                )}
                onClick={() => setBreakdown(key)}
              >
                {label}
              </button>
            ))}
          </div>
          <RankedRows rows={breakdowns[breakdown]} />
        </Panel>

        <Panel>
          <PanelHeader
            title="Decision quality"
            subtitle="Approval rate and employee deductions"
            value={`${approvalRate}% approved`}
          />
          <div className="mt-5 grid grid-cols-2 overflow-hidden rounded-xl border">
            <CompactStat
              label="No deduction"
              value={data.byDeduction.none}
              total={deductionTotal}
            />
            <CompactStat
              label="Employee deduction"
              value={data.byDeduction.employee}
              total={deductionTotal}
              border
            />
          </div>
          <h3 className="mt-6 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Most charged employees
          </h3>
          <RankedRows rows={data.topChargedEmployees} compact />
        </Panel>

        <Panel>
          <PanelHeader
            title="iiko delivery"
            subtitle="Approved acts moving into inventory"
            value={`${data.iikoSync.synced} synced`}
          />
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <StatusRow label="Queued" value={data.iikoSync.queued} />
            <StatusRow label="Sending" value={data.iikoSync.syncing} />
            <StatusRow
              label="Synced"
              value={data.iikoSync.synced}
              tone="green"
            />
            <StatusRow label="Failed" value={data.iikoSync.failed} tone="red" />
          </div>
        </Panel>

        <Panel>
          <PanelHeader
            title="At a glance"
            subtitle="The decisions needing reviewer attention"
          />
          <div className="mt-5 divide-y rounded-xl border">
            <SummaryRow
              label="Awaiting review"
              value={data.byStatus.pending}
              detail="open requests"
            />
            <SummaryRow
              label="Rejected"
              value={data.byStatus.rejected}
              detail="in this period"
            />
            <SummaryRow
              label="iiko needs attention"
              value={data.iikoSync.failed + data.iikoSync.queued}
              detail="failed or queued"
            />
          </div>
        </Panel>
      </section>
    </div>
  )
}

function MetricButton({
  label,
  value,
  previous,
  active,
  onClick,
}: {
  label: string
  value: number
  previous: number
  active: boolean
  onClick: () => void
}) {
  const change = getPercentChange(value, previous)

  return (
    <button
      type="button"
      className={cn(
        "relative p-5 text-left transition-colors hover:bg-muted/40",
        active && "bg-muted/50"
      )}
      aria-pressed={active}
      onClick={onClick}
    >
      {active && <span className="absolute inset-x-0 top-0 h-0.5 bg-primary" />}
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="mt-2 flex items-end justify-between gap-2">
        <span className="font-heading text-3xl font-semibold tabular-nums">
          {value}
        </span>
        <Change value={change} />
      </span>
    </button>
  )
}

function Change({ value }: { value: number | null }) {
  if (value === null || value === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
        <IconMinus className="size-3.5" />
        {value === null ? "New" : "0%"}
      </span>
    )
  }

  const positive = value > 0
  const Icon = positive ? IconArrowUpRight : IconArrowDownRight
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-medium",
        positive ? "text-amber-600" : "text-emerald-600"
      )}
      title="Compared with the previous period"
    >
      <Icon className="size-3.5" />
      {Math.abs(value)}%
    </span>
  )
}

function TrendChart({
  rows,
  metric,
}: {
  rows: Array<Record<MetricKey | "date", number | string>>
  metric: MetricKey
}) {
  const width = 720
  const height = 190
  const top = 16
  const bottom = 28
  const chartHeight = height - top - bottom
  const values = rows.map((row) => Number(row[metric]))
  const max = Math.max(1, ...values)
  const step = rows.length > 1 ? width / (rows.length - 1) : width
  const points = values.map((value, index) => ({
    x: index * step,
    y: top + chartHeight - (value / max) * chartHeight,
    value,
    date: String(rows[index].date),
  }))
  const line = points.map((point) => `${point.x},${point.y}`).join(" ")
  const area = `0,${top + chartHeight} ${line} ${width},${top + chartHeight}`
  const labelEvery = rows.length > 14 ? 5 : rows.length > 7 ? 2 : 1

  return (
    <div className="mt-5 overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-52 w-full min-w-[38rem]"
        role="img"
        aria-label={`${metricLabels[metric]} trend over ${rows.length} days`}
      >
        <defs>
          <linearGradient id="analytics-area" x1="0" x2="0" y1="0" y2="1">
            <stop
              offset="0%"
              stopColor="var(--color-primary)"
              stopOpacity="0.22"
            />
            <stop
              offset="100%"
              stopColor="var(--color-primary)"
              stopOpacity="0"
            />
          </linearGradient>
        </defs>
        {[0, 0.5, 1].map((ratio) => (
          <line
            key={ratio}
            x1="0"
            x2={width}
            y1={top + chartHeight * ratio}
            y2={top + chartHeight * ratio}
            stroke="var(--color-border)"
            strokeDasharray="4 5"
          />
        ))}
        <polygon points={area} fill="url(#analytics-area)" />
        <polyline
          points={line}
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth="3"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {points.map((point, index) => (
          <g key={point.date}>
            <circle
              cx={point.x}
              cy={point.y}
              r="4"
              fill="var(--color-background)"
              stroke="var(--color-primary)"
              strokeWidth="2"
            >
              <title>{`${formatDate(point.date)}: ${point.value}`}</title>
            </circle>
            {(index % labelEvery === 0 || index === points.length - 1) && (
              <text
                x={point.x}
                y={height - 5}
                textAnchor={
                  index === 0
                    ? "start"
                    : index === points.length - 1
                      ? "end"
                      : "middle"
                }
                fill="var(--color-muted-foreground)"
                fontSize="10"
              >
                {formatShortDate(point.date)}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  )
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border bg-card p-5">{children}</section>
  )
}

function PanelHeader({
  title,
  subtitle,
  value,
}: {
  title: string
  subtitle: string
  value?: string
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h2 className="font-heading text-lg font-semibold">{title}</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
      </div>
      {value && <p className="text-sm font-medium tabular-nums">{value}</p>}
    </div>
  )
}

function RankedRows({
  rows,
  compact = false,
}: {
  rows: Array<{ id: string; name: string; total: number }>
  compact?: boolean
}) {
  const visible = rows.slice(0, compact ? 5 : 7)
  const max = Math.max(1, ...visible.map((row) => row.total))

  if (visible.length === 0) {
    return <p className="py-8 text-sm text-muted-foreground">No data yet.</p>
  }

  return (
    <div className={cn("divide-y", compact ? "mt-2" : "mt-1")}>
      {visible.map((row) => (
        <div key={row.id} className="relative py-3">
          <div
            className="absolute inset-y-1 left-0 rounded-md bg-primary/7"
            style={{ width: `${Math.round((row.total / max) * 100)}%` }}
          />
          <div className="relative flex items-center justify-between gap-4 px-2 text-sm">
            <span className="truncate">{row.name}</span>
            <span className="font-medium tabular-nums">{row.total}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

function CompactStat({
  label,
  value,
  total,
  border = false,
}: {
  label: string
  value: number
  total: number
  border?: boolean
}) {
  const percent = total ? Math.round((value / total) * 100) : 0
  return (
    <div className={cn("p-4", border && "border-l")}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-2 font-heading text-2xl font-semibold tabular-nums">
        {value}
      </p>
      <p className="text-xs text-muted-foreground">{percent}% of requests</p>
    </div>
  )
}

function StatusRow({
  label,
  value,
  tone = "default",
}: {
  label: string
  value: number
  tone?: "default" | "green" | "red"
}) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-muted/60 px-4 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span
        className={cn(
          "font-heading text-xl font-semibold tabular-nums",
          tone === "green" && "text-emerald-600",
          tone === "red" && "text-destructive"
        )}
      >
        {value}
      </span>
    </div>
  )
}

function SummaryRow({
  label,
  value,
  detail,
}: {
  label: string
  value: number
  detail: string
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{detail}</p>
      </div>
      <p className="font-heading text-2xl font-semibold tabular-nums">
        {value}
      </p>
    </div>
  )
}

function getPercentChange(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : null
  return Math.round(((current - previous) / previous) * 100)
}

function formatDate(value: string, exclusiveEnd = false) {
  const date = new Date(value)
  if (exclusiveEnd) date.setUTCDate(date.getUTCDate() - 1)
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date)
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(value))
}
