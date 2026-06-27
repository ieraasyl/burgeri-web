import {
  IconCalendarDue,
  IconCheck,
  IconChevronDown,
  IconFilter,
  IconMapPin,
} from "@tabler/icons-react"
import { Link, createFileRoute } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"
import { useState } from "react"

import { SaveOpportunityButton } from "@/components/save-opportunity-button"
import { buttonVariants } from "@/components/ui/button"
import {
  formatCategory,
  formatDayOfMonth,
  formatDeadlineCountdown,
  formatFormat,
  formatMonthShort,
} from "@/lib/catalog"
import type { OpportunityFilters } from "@/lib/catalog"
import { cn } from "@/lib/utils"

const getOpportunityCatalog = createServerFn({ method: "GET" })
  .validator((filters: OpportunityFilters) => filters)
  .handler(async ({ data }) => {
    const { getOpportunityCatalogData } = await import("@/lib/catalog.server")
    return getOpportunityCatalogData(data)
  })

export const Route = createFileRoute("/opportunities/")({
  validateSearch: (search): OpportunityFilters => ({
    tag: toStringArray(search.tag),
    category: toStringArray(search.category),
    format: toStringArray(search.format),
    grade: toGradeArray(search.grade),
    deadline: toDeadlineArray(search.deadline),
  }),
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => getOpportunityCatalog({ data: deps }),
  component: OpportunitiesPage,
})

function OpportunitiesPage() {
  const search = Route.useSearch()
  const { opportunities, viewer, totalCount, filterOptions } =
    Route.useLoaderData()
  const { fields, categories, formats } = filterOptions
  const [filtersOpen, setFiltersOpen] = useState(false)
  const activeFilterCount =
    (search.tag?.length ?? 0) +
    (search.category?.length ?? 0) +
    (search.format?.length ?? 0) +
    (search.grade?.length ?? 0) +
    (search.deadline?.length ?? 0)

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="grid gap-6 border-b pb-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div>
          <p className="text-sm font-medium text-primary">
            Opportunity catalog
          </p>
          <h1 className="mt-3 font-heading text-4xl font-semibold text-balance">
            Compare programs by deadline, grade, and field.
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground">
            Each card shows the application deadline, format, grade range, and
            requirements before you open the full program page.
          </p>
        </div>
        <div className="lg:border-l lg:pl-6">
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <IconCalendarDue />
            Next deadline
          </div>
          <p className="mt-3 font-heading text-3xl font-semibold">
            {opportunities[0]?.deadlineShortLabel}
          </p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {opportunities[0]?.title}
          </p>
        </div>
      </section>

      <div className="grid gap-8 py-8 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <aside className="flex flex-col gap-4 lg:gap-6">
          <button
            type="button"
            onClick={() => setFiltersOpen((open) => !open)}
            aria-expanded={filtersOpen}
            className="flex items-center justify-between rounded-md border px-4 py-2.5 text-sm font-medium lg:hidden"
          >
            <span className="flex items-center gap-2">
              <IconFilter />
              Filters
              {activeFilterCount > 0 && ` (${activeFilterCount})`}
            </span>
            <IconChevronDown
              className={cn(
                "transition-transform",
                filtersOpen && "rotate-180"
              )}
            />
          </button>
          <div
            className={cn(
              "flex-col gap-6",
              filtersOpen ? "flex" : "hidden lg:flex"
            )}
          >
            <FilterGroup title="Fields" icon={<IconFilter />}>
              {fields.map((tag) => (
                <FilterCheckbox
                  key={tag.id}
                  search={opportunityFilterSearch(search, {
                    tag: toggleValue(search.tag, tag.slug),
                  })}
                  active={search.tag?.includes(tag.slug) ?? false}
                >
                  {tag.name}
                </FilterCheckbox>
              ))}
            </FilterGroup>

            <FilterGroup title="Category">
              {categories.map((category) => (
                <FilterCheckbox
                  key={category}
                  search={opportunityFilterSearch(search, {
                    category: toggleValue(search.category, category),
                  })}
                  active={search.category?.includes(category) ?? false}
                >
                  {formatCategory(category)}
                </FilterCheckbox>
              ))}
            </FilterGroup>

            <FilterGroup title="Format">
              {formats.map((format) => (
                <FilterCheckbox
                  key={format}
                  search={opportunityFilterSearch(search, {
                    format: toggleValue(search.format, format),
                  })}
                  active={search.format?.includes(format) ?? false}
                >
                  {formatFormat(format)}
                </FilterCheckbox>
              ))}
            </FilterGroup>

            <FilterGroup title="Grade">
              {[8, 9, 10, 11].map((grade) => (
                <FilterCheckbox
                  key={grade}
                  search={opportunityFilterSearch(search, {
                    grade: toggleValue(search.grade, grade),
                  })}
                  active={search.grade?.includes(grade) ?? false}
                >
                  Grade {grade}
                </FilterCheckbox>
              ))}
            </FilterGroup>

            <FilterGroup title="Deadline">
              <FilterCheckbox
                search={opportunityFilterSearch(search, {
                  deadline: toggleValue(search.deadline, "30"),
                })}
                active={search.deadline?.includes("30") ?? false}
              >
                Next 30 days
              </FilterCheckbox>
              <FilterCheckbox
                search={opportunityFilterSearch(search, {
                  deadline: toggleValue(search.deadline, "90"),
                })}
                active={search.deadline?.includes("90") ?? false}
              >
                Next 90 days
              </FilterCheckbox>
            </FilterGroup>
          </div>
        </aside>

        <section>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Showing {opportunities.length} of {totalCount} programs
            </p>
            {(search.tag?.length ||
              search.category?.length ||
              search.format?.length ||
              search.grade?.length ||
              search.deadline?.length) && (
              <Link
                to="/opportunities"
                resetScroll={false}
                className="text-sm font-medium text-primary hover:underline"
              >
                Clear filters
              </Link>
            )}
          </div>

          <div className="catalog-list">
            {opportunities.map((opportunity) => (
              <article
                key={opportunity.id}
                className="catalog-row grid gap-5 md:grid-cols-[8rem_minmax(0,1fr)]"
              >
                <div className="stat-tile hidden md:flex">
                  <span className="stat-tile-label">
                    {formatMonthShort(opportunity.deadlineAt)}
                  </span>
                  <span className="stat-tile-value">
                    {formatDayOfMonth(opportunity.deadlineAt)}
                  </span>
                  <span className="stat-tile-meta">
                    {formatDeadlineCountdown(opportunity.deadlineAt)}
                  </span>
                </div>

                <div className="relative min-w-0">
                  <p className="mb-3 flex items-center gap-1.5 text-sm font-medium text-primary md:hidden">
                    <IconCalendarDue className="size-4" />
                    {opportunity.deadlineShortLabel}
                    <span className="font-normal text-muted-foreground">
                      · {formatDeadlineCountdown(opportunity.deadlineAt)}
                    </span>
                  </p>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatCategory(opportunity.category)}</span>
                    <span>{formatFormat(opportunity.format)}</span>
                    <span>{opportunity.gradeLabel}</span>
                  </div>
                  <h2 className="mt-3 font-heading text-2xl font-semibold">
                    {opportunity.title}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {opportunity.summary}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {opportunity.tags.slice(0, 5).map((tag) => (
                      <span key={tag.id} className="tag-pill">
                        {tag.name}
                      </span>
                    ))}
                  </div>
                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3 md:justify-start">
                    <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                      <IconMapPin />
                      {opportunity.location ??
                        opportunity.city ??
                        opportunity.country ??
                        "Online"}
                    </span>
                    <Link
                      to="/opportunities/$slug"
                      params={{ slug: opportunity.slug }}
                      className={buttonVariants({
                        variant: "outline",
                        size: "sm",
                      })}
                    >
                      View requirements
                    </Link>
                    <div className="absolute top-0 right-0 md:static">
                      <SaveOpportunityButton
                        opportunity={opportunity}
                        redirectTo={`/opportunities/${opportunity.slug}`}
                        viewer={viewer}
                      />
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

function FilterGroup({
  children,
  icon,
  title,
}: {
  children: React.ReactNode
  icon?: React.ReactNode
  title: string
}) {
  return (
    <div className="filter-group">
      <div className="filter-group-title">
        {icon}
        {title}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-0.5 lg:flex-col">
        {children}
      </div>
    </div>
  )
}

function FilterCheckbox({
  active,
  children,
  search,
}: {
  active?: boolean
  children: React.ReactNode
  search: OpportunityFilters
}) {
  return (
    <Link
      to="/opportunities"
      search={search}
      resetScroll={false}
      role="checkbox"
      aria-checked={active}
      className={cn("filter-option", active && "filter-option-active")}
    >
      <span
        className={cn("filter-checkbox", active && "filter-checkbox-on")}
        aria-hidden="true"
      >
        {active && <IconCheck className="size-3" />}
      </span>
      {children}
    </Link>
  )
}

function toggleValue<T>(list: T[] | undefined, value: T): T[] | undefined {
  const current = list ?? []
  const next = current.includes(value)
    ? current.filter((item) => item !== value)
    : [...current, value]

  return next.length ? next : undefined
}

function toStringArray(value: unknown): string[] | undefined {
  const raw = Array.isArray(value) ? value : value != null ? [value] : []
  const items = raw.filter((item): item is string => typeof item === "string")

  return items.length ? [...new Set(items)] : undefined
}

function toGradeArray(value: unknown): number[] | undefined {
  const raw = Array.isArray(value) ? value : value != null ? [value] : []
  const grades = raw
    .map(Number)
    .filter((grade) => [8, 9, 10, 11].includes(grade))

  return grades.length ? [...new Set(grades)] : undefined
}

function toDeadlineArray(value: unknown): Array<"30" | "90"> | undefined {
  const raw = Array.isArray(value) ? value : value != null ? [value] : []
  const items = raw.filter(
    (item): item is "30" | "90" => item === "30" || item === "90"
  )

  return items.length ? [...new Set(items)] : undefined
}

function opportunityFilterSearch(
  current: OpportunityFilters,
  patch: Partial<OpportunityFilters>
): OpportunityFilters {
  return { ...current, ...patch }
}
