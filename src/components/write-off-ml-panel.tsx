import {
  confidenceColor,
  formatDamageLevel,
  formatMlCategory,
  formatMlFamily,
} from "@/lib/burger-ml"
import type { WriteOffMlClassification } from "@/lib/burger-ml"

export function ConfidencePill({
  confidence,
  className = "",
}: {
  confidence: number
  className?: string
}) {
  return (
    <span
      className={`block w-1.5 shrink-0 rounded-full ${className}`}
      style={{ backgroundColor: confidenceColor(confidence) }}
      title={`Уверенность QC: ${Math.round(confidence * 100)}%`}
      aria-label={`Уверенность QC: ${Math.round(confidence * 100)}%`}
    />
  )
}

export function WriteOffMlPanel({
  classification,
  productName,
}: {
  classification: WriteOffMlClassification
  productName: string
}) {
  if (classification.error) {
    return (
      <div className="mt-4 rounded-2xl border border-dashed bg-muted/30 p-4">
        <p className="text-sm font-medium">Визуальная проверка (ML)</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Анализ недоступен: {classification.error}
        </p>
      </div>
    )
  }

  const confidencePct = Math.round(classification.confidence * 100)

  return (
    <div className="mt-4 rounded-2xl border bg-card p-4">
      <div className="flex items-start gap-3">
        <ConfidencePill
          confidence={classification.confidence}
          className="min-h-16 self-stretch"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Визуальная проверка (ML)</p>
          <p className="mt-1 text-xs text-muted-foreground">
            CLIP · уверенность {confidencePct}%
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                classification.needsManualCheck
                  ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                  : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              }`}
            >
              {classification.needsManualCheck
                ? "Нужна ручная проверка"
                : "Модель уверена"}
            </span>
            {classification.productMismatch && (
              <span className="inline-flex items-center rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive">
                Не совпадает с «{productName}»
              </span>
            )}
          </div>

          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            <MlDetail label="Категория" value={formatMlCategory(classification.category)} />
            <MlDetail
              label="Ингредиент"
              value={formatMlFamily(classification.ingredientFamily)}
            />
            <MlDetail
              label="Повреждение"
              value={formatDamageLevel(classification.damageLevel)}
            />
            <MlDetail
              label="Согласованность кадров"
              value={`${Math.round(classification.viewAgreement * 100)}%`}
            />
          </dl>

          {classification.suggestedComment && (
            <p className="mt-4 rounded-xl bg-muted/60 p-3 text-sm leading-6 text-muted-foreground">
              {classification.suggestedComment}
            </p>
          )}

          {classification.top3.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-medium text-muted-foreground">
                Топ совпадений
              </p>
              <ul className="mt-2 space-y-2">
                {classification.top3.map((match, index) => (
                  <li
                    key={`${match.category}-${index}`}
                    className="flex items-center justify-between gap-3 text-xs"
                  >
                    <span className="capitalize">
                      {index + 1}. {formatMlCategory(match.category)}
                    </span>
                    <span className="font-medium tabular-nums">
                      {Math.round(match.confidence * 100)}%
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function MlDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/50 px-3 py-2">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium capitalize">{value}</dd>
    </div>
  )
}
