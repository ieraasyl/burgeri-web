import { createFileRoute } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"

import { formatMoney } from "@/lib/write-offs"

const getAnalytics = createServerFn({ method: "GET" }).handler(async () => {
  const { getWriteOffAnalyticsData } = await import("@/lib/write-offs.server")
  return getWriteOffAnalyticsData()
})

export const Route = createFileRoute("/review/analytics")({
  loader: () => getAnalytics(),
  component: AnalyticsPage,
})

function AnalyticsPage() {
  const data = Route.useLoaderData()
  const trendMax = Math.max(1, ...data.trend.map((day) => day.total))
  const lossTrendMax = Math.max(1, ...data.lossTrend.map((day) => day.loss))
  const locationMax = Math.max(1, ...data.byLocation.map((row) => row.total))
  const productMax = Math.max(1, ...data.byProduct.map((row) => row.total))
  const categoryMax = Math.max(1, ...data.byCategory.map((row) => row.total))
  const lossLocationMax = Math.max(
    1,
    ...data.lossByLocation.map((row) => row.loss)
  )
  const lossProductMax = Math.max(1, ...data.lossByProduct.map((row) => row.loss))
  const lossCategoryMax = Math.max(
    1,
    ...data.lossByCategory.map((row) => row.loss)
  )
  const deductionTotal = data.byDeduction.none + data.byDeduction.employee

  return (
    <div className="flex flex-col gap-8">
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Все списания" value={data.byStatus.total} />
        <StatCard
          label="На рассмотрении"
          value={data.byStatus.pending}
          tone="amber"
        />
        <StatCard
          label="Одобрено"
          value={data.byStatus.approved}
          tone="green"
        />
        <StatCard label="Отклонено" value={data.byStatus.rejected} tone="red" />
        <StatCard
          label="Потери (одобрено)"
          value={formatMoney(data.totalLoss)}
        />
      </section>

      <section className="rounded-2xl border bg-card p-5">
        <h2 className="font-heading text-lg font-semibold">
          Заявки · последние 14 дней
        </h2>
        <div className="mt-5 flex items-end gap-1.5">
          {data.trend.map((day) => (
            <div
              key={day.date}
              className="group flex flex-1 flex-col items-center gap-2"
            >
              <div className="flex h-32 w-full items-end">
                <div
                  className="w-full rounded-t bg-primary/80 transition-colors group-hover:bg-primary"
                  style={{
                    height: `${Math.round((day.total / trendMax) * 100)}%`,
                    minHeight: day.total > 0 ? "0.5rem" : "0",
                  }}
                  title={`${day.date}: ${day.total}`}
                />
              </div>
              <span className="text-[0.625rem] text-muted-foreground">
                {day.date.slice(5)}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border bg-card p-5">
        <h2 className="font-heading text-lg font-semibold">
          Потери · последние 14 дней
        </h2>
        <div className="mt-5 flex items-end gap-1.5">
          {data.lossTrend.map((day) => (
            <div
              key={day.date}
              className="group flex flex-1 flex-col items-center gap-2"
            >
              <div className="flex h-32 w-full items-end">
                <div
                  className="w-full rounded-t bg-amber-500/80 transition-colors group-hover:bg-amber-500"
                  style={{
                    height: `${Math.round((day.loss / lossTrendMax) * 100)}%`,
                    minHeight: day.loss > 0 ? "0.5rem" : "0",
                  }}
                  title={`${day.date}: ${formatMoney(day.loss)}`}
                />
              </div>
              <span className="text-[0.625rem] text-muted-foreground">
                {day.date.slice(5)}
              </span>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <BarSection
          title="По точке продаж"
          rows={data.byLocation}
          max={locationMax}
        />
        <BarSection
          title="По продукту"
          rows={data.byProduct}
          max={productMax}
        />
        <BarSection
          title="По категории списания"
          rows={data.byCategory}
          max={categoryMax}
        />

        <section className="rounded-2xl border bg-card p-5">
          <h2 className="font-heading text-lg font-semibold">
            Распределение удержаний
          </h2>
          <div className="mt-4 flex flex-col gap-3">
            <BarRow
              label="Без удержания с сотрудника"
              value={data.byDeduction.none}
              max={Math.max(1, deductionTotal)}
            />
            <BarRow
              label="Удержано с сотрудника"
              value={data.byDeduction.employee}
              max={Math.max(1, deductionTotal)}
            />
          </div>
          <h3 className="mt-6 text-sm font-medium">
            Топ сотрудников по удержаниям
          </h3>
          <div className="mt-3 flex flex-col gap-2">
            {data.topChargedEmployees.length === 0 ? (
              <Empty />
            ) : (
              data.topChargedEmployees.map((row) => (
                <div
                  key={row.id}
                  className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-sm"
                >
                  <span className="truncate">{row.name}</span>
                  <span className="font-medium">{row.total}</span>
                </div>
              ))
            )}
          </div>
          <h3 className="mt-6 text-sm font-medium">Топ по сумме удержаний</h3>
          <div className="mt-3 flex flex-col gap-2">
            {data.topChargedEmployeesByLoss.length === 0 ? (
              <Empty />
            ) : (
              data.topChargedEmployeesByLoss.map((row) => (
                <div
                  key={row.id}
                  className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-sm"
                >
                  <span className="truncate">{row.name}</span>
                  <span className="font-medium">{formatMoney(row.loss)}</span>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-2xl border bg-card p-5">
          <h2 className="font-heading text-lg font-semibold">
            Синхронизация с iiko
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <SyncTile label="Не начато" value={data.iikoSync.not_started} />
            <SyncTile
              label="В очереди"
              value={data.iikoSync.queued}
              tone="amber"
            />
            <SyncTile
              label="Отправлено"
              value={data.iikoSync.synced}
              tone="green"
            />
            <SyncTile label="Ошибка" value={data.iikoSync.failed} tone="red" />
          </div>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <LossBarSection
          title="Потери по точке"
          rows={data.lossByLocation}
          max={lossLocationMax}
        />
        <LossBarSection
          title="Потери по продукту"
          rows={data.lossByProduct}
          max={lossProductMax}
        />
        <LossBarSection
          title="Потери по категории списания"
          rows={data.lossByCategory}
          max={lossCategoryMax}
        />
      </div>
    </div>
  )
}

function BarSection({
  title,
  rows,
  max,
}: {
  title: string
  rows: Array<{ id: string; name: string; total: number }>
  max: number
}) {
  return (
    <section className="rounded-2xl border bg-card p-5">
      <h2 className="font-heading text-lg font-semibold">{title}</h2>
      <div className="mt-4 flex flex-col gap-3">
        {rows.length === 0 ? (
          <Empty />
        ) : (
          rows.map((row) => (
            <BarRow key={row.id} label={row.name} value={row.total} max={max} />
          ))
        )}
      </div>
    </section>
  )
}

function LossBarSection({
  title,
  rows,
  max,
}: {
  title: string
  rows: Array<{ id: string; name: string; loss: number }>
  max: number
}) {
  return (
    <section className="rounded-2xl border bg-card p-5">
      <h2 className="font-heading text-lg font-semibold">{title}</h2>
      <div className="mt-4 flex flex-col gap-3">
        {rows.length === 0 ? (
          <Empty />
        ) : (
          rows.map((row) => (
            <LossBarRow
              key={row.id}
              label={row.name}
              value={row.loss}
              max={max}
            />
          ))
        )}
      </div>
    </section>
  )
}

function BarRow({
  label,
  value,
  max,
}: {
  label: string
  value: number
  max: number
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="truncate">{label}</span>
        <span className="font-medium tabular-nums">{value}</span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${Math.round((value / max) * 100)}%` }}
        />
      </div>
    </div>
  )
}

function LossBarRow({
  label,
  value,
  max,
}: {
  label: string
  value: number
  max: number
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="truncate">{label}</span>
        <span className="font-medium tabular-nums">{formatMoney(value)}</span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-amber-500"
          style={{ width: `${Math.round((value / max) * 100)}%` }}
        />
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  tone = "default",
}: {
  label: string
  value: number | string
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

function SyncTile({
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
    <div className="rounded-xl bg-muted p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 font-heading text-2xl font-semibold ${tones[tone]}`}>
        {value}
      </p>
    </div>
  )
}

function Empty() {
  return <p className="text-sm text-muted-foreground">Пока нет данных.</p>
}
