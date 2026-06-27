import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  IconArrowDownRight,
  IconArrowUpRight,
  IconArrowsMove,
  IconMinus,
} from "@tabler/icons-react"
import { Link, createFileRoute } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"
import { useEffect, useState } from "react"

import { formatMoney, writeOffStatusLabels } from "@/lib/write-offs"
import { cn } from "@/lib/utils"

type RangeKey = "7d" | "14d" | "30d"
type MetricKey = "total" | "pending" | "approved" | "rejected"
type BreakdownKey = "locations" | "products" | "categories"
type LossBreakdownKey = "locations" | "products" | "categories"

const rangeDays: Record<RangeKey, 7 | 14 | 30> = {
  "7d": 7,
  "14d": 14,
  "30d": 30,
}

const rangeLabels: Record<RangeKey, string> = {
  "7d": "7 дн.",
  "14d": "14 дн.",
  "30d": "30 дн.",
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
  total: "Все списания",
  pending: writeOffStatusLabels.pending,
  approved: writeOffStatusLabels.approved,
  rejected: writeOffStatusLabels.rejected,
}

const LAYOUT_STORAGE_KEY = "burgeri-analytics-layout"

const defaultWidgetOrder = [
  "trend",
  "loss-trend",
  "operations",
  "decisions",
  "iiko",
  "summary",
  "disproportion-flags",
  "loss-breakdown",
] as const

type WidgetId = (typeof defaultWidgetOrder)[number]

function isWidgetId(value: string): value is WidgetId {
  return (defaultWidgetOrder as readonly string[]).includes(value)
}

function readWidgetOrder(): WidgetId[] {
  if (typeof window === "undefined") return [...defaultWidgetOrder]
  try {
    const stored = localStorage.getItem(LAYOUT_STORAGE_KEY)
    if (!stored) return [...defaultWidgetOrder]
    const parsed = JSON.parse(stored) as unknown
    if (!Array.isArray(parsed)) return [...defaultWidgetOrder]
    const valid = parsed.filter(
      (id): id is WidgetId => typeof id === "string" && isWidgetId(id)
    )
    const missing = defaultWidgetOrder.filter((id) => !valid.includes(id))
    return [...valid, ...missing]
  } catch {
    return [...defaultWidgetOrder]
  }
}

function writeWidgetOrder(order: WidgetId[]) {
  localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(order))
}

function AnalyticsPage() {
  const data = Route.useLoaderData()
  const { range: searchRange } = Route.useSearch()
  const range = searchRange ?? "14d"
  const [metric, setMetric] = useState<MetricKey>("total")
  const [breakdown, setBreakdown] = useState<BreakdownKey>("locations")
  const [lossBreakdown, setLossBreakdown] =
    useState<LossBreakdownKey>("locations")
  const [widgetOrder, setWidgetOrder] = useState<WidgetId[]>([
    ...defaultWidgetOrder,
  ])

  useEffect(() => {
    setWidgetOrder(readWidgetOrder())
  }, [])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const breakdowns = {
    locations: data.byLocation,
    products: data.byProduct,
    categories: data.byCategory,
  }
  const lossBreakdowns = {
    locations: data.lossByLocation,
    products: data.lossByProduct,
    categories: data.lossByCategory,
  }
  const approvalRate = data.byStatus.total
    ? Math.round((data.byStatus.approved / data.byStatus.total) * 100)
    : 0
  const deductionTotal = data.byDeduction.none + data.byDeduction.employee
  const lossChange = getPercentChange(data.totalLoss, data.previousTotalLoss)

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setWidgetOrder((items) => {
      const oldIndex = items.indexOf(active.id as WidgetId)
      const newIndex = items.indexOf(over.id as WidgetId)
      if (oldIndex < 0 || newIndex < 0) return items
      const next = arrayMove(items, oldIndex, newIndex)
      writeWidgetOrder(next)
      return next
    })
  }

  const widgets: Record<WidgetId, React.ReactNode> = {
    trend: (
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
                Заявки по дням · последние {data.period.days} дн.
              </p>
            </div>
            <p className="text-sm font-medium tabular-nums">
              {data.byStatus[metric]} всего
            </p>
          </div>
          <TrendChart rows={data.trend} metric={metric} />
        </div>
      </section>
    ),
    "loss-trend": (
      <section className="overflow-hidden rounded-2xl border bg-card">
        <div className="border-b p-4 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-heading text-lg font-semibold">
                Потери (одобрено)
              </h2>
              <p className="text-xs text-muted-foreground">
                Сумма по одобренным заявкам · последние {data.period.days} дн.
              </p>
            </div>
            <div className="text-right">
              <p className="font-heading text-2xl font-semibold tabular-nums text-amber-600 dark:text-amber-300">
                {formatMoney(data.totalLoss)}
              </p>
              <Change value={lossChange} />
            </div>
          </div>
        </div>
        <div className="p-4 sm:p-6">
          <LossTrendChart rows={data.lossTrend} />
        </div>
      </section>
    ),
    operations: (
      <Panel>
        <PanelHeader
          title="По операциям"
          subtitle="Где сосредоточены списания"
        />
        <div className="mt-4 flex gap-1 border-b">
          {(
            [
              ["locations", "Точки"],
              ["products", "Продукты"],
              ["categories", "Причины"],
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
    ),
    decisions: (
      <Panel>
        <PanelHeader
          title="Качество решений"
          subtitle="Доля одобрений и удержания с сотрудников"
          value={`${approvalRate}% одобрено`}
        />
        <div className="mt-5 grid grid-cols-2 overflow-hidden rounded-xl border">
          <CompactStat
            label="Без удержания"
            value={data.byDeduction.none}
            total={deductionTotal}
          />
          <CompactStat
            label="Удержано с сотрудника"
            value={data.byDeduction.employee}
            total={deductionTotal}
            border
          />
        </div>
        <h3 className="mt-6 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Топ по количеству удержаний
        </h3>
        <RankedRows rows={data.topChargedEmployees} compact />
        <h3 className="mt-6 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Топ по сумме удержаний
        </h3>
        <LossRankedRows rows={data.topChargedEmployeesByLoss} compact />
      </Panel>
    ),
    iiko: (
      <Panel>
        <PanelHeader
          title="Доставка в iiko"
          subtitle="Одобренные акты в учётной системе"
          value={`${data.iikoSync.synced} отправлено`}
        />
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <StatusRow label="Не начато" value={data.iikoSync.not_started} />
          <StatusRow label="В очереди" value={data.iikoSync.queued} />
          <StatusRow
            label="Отправлено"
            value={data.iikoSync.synced}
            tone="green"
          />
          <StatusRow label="Ошибка" value={data.iikoSync.failed} tone="red" />
        </div>
      </Panel>
    ),
    summary: (
      <Panel>
        <PanelHeader
          title="Кратко"
          subtitle="Что требует внимания ревьюера"
        />
        <div className="mt-5 divide-y rounded-xl border">
          <SummaryRow
            label="На рассмотрении"
            value={data.byStatus.pending}
            detail="открытых заявок"
          />
          <SummaryRow
            label="Отклонено"
            value={data.byStatus.rejected}
            detail="за период"
          />
          <SummaryRow
            label="iiko требует внимания"
            value={data.iikoSync.failed + data.iikoSync.queued}
            detail="ошибка или в очереди"
          />
          {data.disproportionFlags.length > 0 && (
            <SummaryRow
              label="Аномалии по точкам"
              value={data.disproportionFlags.length}
              detail="продукт–причина выше среднего"
              tone="amber"
            />
          )}
        </div>
      </Panel>
    ),
    "disproportion-flags": (
      <Panel>
        <PanelHeader
          title="Аномалии по точкам"
          subtitle={`Комбинации продукт–причина, где точка превышает среднее на ${data.disproportionThreshold}%+`}
        />
        <DisproportionFlagRows rows={data.disproportionFlags} />
      </Panel>
    ),
    "loss-breakdown": (
      <Panel>
        <PanelHeader
          title="Потери по операциям"
          subtitle="Одобренные списания в деньгах"
          value={formatMoney(data.totalLoss)}
        />
        <div className="mt-4 flex gap-1 border-b">
          {(
            [
              ["locations", "Точки"],
              ["products", "Продукты"],
              ["categories", "Причины"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={cn(
                "border-b-2 border-transparent px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground",
                lossBreakdown === key &&
                  "border-amber-500 font-medium text-foreground"
              )}
              onClick={() => setLossBreakdown(key)}
            >
              {label}
            </button>
          ))}
        </div>
        <LossRankedRows rows={lossBreakdowns[lossBreakdown]} />
      </Panel>
    ),
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-muted-foreground">
            Объём списаний, решения ревьюеров и доставка актов в iiko.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatDate(data.period.start)}–{formatDate(data.period.end, true)}{" "}
            · UTC · перетащите блоки за ручку
          </p>
        </div>
        <div
          className="inline-flex w-fit rounded-lg border bg-card p-1"
          aria-label="Период аналитики"
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
              {rangeLabels[key as RangeKey]}
            </Link>
          ))}
        </div>
      </section>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={widgetOrder}
          strategy={verticalListSortingStrategy}
        >
          <div className="columns-1 gap-6 lg:columns-2 lg:pl-6">
            {widgetOrder.map((id) => (
              <SortableWidget
                key={id}
                id={id}
                wide={
                  id === "trend" ||
                  id === "loss-trend" ||
                  id === "loss-breakdown"
                }
              >
                {widgets[id]}
              </SortableWidget>
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  )
}

function SortableWidget({
  id,
  wide,
  children,
}: {
  id: WidgetId
  wide?: boolean
  children: React.ReactNode
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        "group/widget mb-6 w-full break-inside-avoid max-lg:pl-6",
        wide && "column-span-all",
        isDragging && "z-20"
      )}
    >
      <div className="flex items-start">
        <div className="relative w-0 shrink-0 overflow-visible">
          <button
            type="button"
            ref={setActivatorNodeRef}
            className={cn(
              "absolute top-4 left-0 flex size-6 -translate-x-full cursor-grab items-center justify-center rounded-md pr-1 text-muted-foreground transition-opacity hover:bg-muted/80 hover:text-foreground active:cursor-grabbing max-lg:translate-x-0",
              "opacity-0 group-hover/widget:opacity-55 hover:!opacity-100",
              "focus-visible:opacity-100",
              "[@media(hover:none)]:opacity-45",
              isDragging && "cursor-grabbing bg-muted/80 opacity-100"
            )}
            aria-label="Перетащить блок"
            {...attributes}
            {...listeners}
          >
            <IconArrowsMove className="size-3.5" stroke={1.75} />
          </button>
        </div>
        <div
          className={cn(
            "min-w-0 flex-1 transition-shadow",
            isDragging && "rounded-2xl shadow-lg ring-2 ring-primary/20"
          )}
        >
          {children}
        </div>
      </div>
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
        {value === null ? "Новое" : "0%"}
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
      title="По сравнению с предыдущим периодом"
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
        aria-label={`${metricLabels[metric]} за ${rows.length} дн.`}
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

function LossTrendChart({
  rows,
}: {
  rows: Array<{ date: string; loss: number }>
}) {
  const width = 720
  const height = 190
  const top = 16
  const bottom = 28
  const chartHeight = height - top - bottom
  const values = rows.map((row) => row.loss)
  const max = Math.max(1, ...values)
  const step = rows.length > 1 ? width / (rows.length - 1) : width
  const points = values.map((value, index) => ({
    x: index * step,
    y: top + chartHeight - (value / max) * chartHeight,
    value,
    date: rows[index].date,
  }))
  const line = points.map((point) => `${point.x},${point.y}`).join(" ")
  const area = `0,${top + chartHeight} ${line} ${width},${top + chartHeight}`
  const labelEvery = rows.length > 14 ? 5 : rows.length > 7 ? 2 : 1

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-52 w-full min-w-[38rem]"
        role="img"
        aria-label={`Потери за ${rows.length} дн.`}
      >
        <defs>
          <linearGradient id="loss-area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
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
        <polygon points={area} fill="url(#loss-area)" />
        <polyline
          points={line}
          fill="none"
          stroke="#f59e0b"
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
              stroke="#f59e0b"
              strokeWidth="2"
            >
              <title>{`${formatDate(point.date)}: ${formatMoney(point.value)}`}</title>
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

function Panel({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={cn("rounded-2xl border bg-card p-5", className)}>
      {children}
    </section>
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
    return <p className="py-8 text-sm text-muted-foreground">Пока нет данных.</p>
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

function LossRankedRows({
  rows,
  compact = false,
}: {
  rows: Array<{ id: string; name: string; loss: number }>
  compact?: boolean
}) {
  const visible = rows.slice(0, compact ? 5 : 7)
  const max = Math.max(1, ...visible.map((row) => row.loss))

  if (visible.length === 0) {
    return <p className="py-8 text-sm text-muted-foreground">Пока нет данных.</p>
  }

  return (
    <div className={cn("divide-y", compact ? "mt-2" : "mt-1")}>
      {visible.map((row) => (
        <div key={row.id} className="relative py-3">
          <div
            className="absolute inset-y-1 left-0 rounded-md bg-amber-500/10"
            style={{ width: `${Math.round((row.loss / max) * 100)}%` }}
          />
          <div className="relative flex items-center justify-between gap-4 px-2 text-sm">
            <span className="truncate">{row.name}</span>
            <span className="font-medium tabular-nums">
              {formatMoney(row.loss)}
            </span>
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
      <p className="text-xs text-muted-foreground">{percent}% заявок</p>
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

function DisproportionFlagRows({
  rows,
}: {
  rows: Array<{
    pointOfSaleId: string
    pointOfSaleName: string
    label: string
    count: number
    averageCount: number
    percentAboveAverage: number
  }>
}) {
  const visible = rows.slice(0, 8)
  const max = Math.max(1, ...visible.map((row) => row.count))

  if (visible.length === 0) {
    return (
      <p className="py-8 text-sm text-muted-foreground">
        Аномалий не обнаружено.
      </p>
    )
  }

  return (
    <div className="mt-1 divide-y">
      {visible.map((row) => (
        <div
          key={`${row.pointOfSaleId}:${row.label}`}
          className="relative py-3"
        >
          <div
            className="absolute inset-y-1 left-0 rounded-md bg-amber-500/10"
            style={{ width: `${Math.round((row.count / max) * 100)}%` }}
          />
          <div className="relative flex items-start justify-between gap-4 px-2 text-sm">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="truncate font-medium">
                  {row.pointOfSaleName}
                </span>
                <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-amber-700 uppercase">
                  Аномалия
                </span>
              </div>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {row.label}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="font-medium text-amber-600 tabular-nums">
                {row.count}
              </p>
              <p className="text-[11px] text-muted-foreground tabular-nums">
                ср. {row.averageCount}, +{row.percentAboveAverage}%
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function SummaryRow({
  label,
  value,
  detail,
  tone,
}: {
  label: string
  value: number
  detail: string
  tone?: "amber"
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{detail}</p>
      </div>
      <p
        className={cn(
          "font-heading text-2xl font-semibold tabular-nums",
          tone === "amber" && "text-amber-600"
        )}
      >
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
  return new Intl.DateTimeFormat("ru", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date)
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("ru", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(value))
}
