import {
  IconBook2,
  IconCheck,
  IconChevronDown,
  IconFilter,
} from "@tabler/icons-react"
import { Link, createFileRoute } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"
import { useState } from "react"
import type { ReactNode } from "react"

import { CourseEnrollButton } from "@/components/course-enroll-button"
import { buttonVariants } from "@/components/ui/button"
import { capitalize } from "@/lib/catalog"
import type { CourseFilters } from "@/lib/catalog"
import { cn } from "@/lib/utils"

const getCourseCatalog = createServerFn({ method: "GET" })
  .validator((filters: CourseFilters) => filters)
  .handler(async ({ data }) => {
    const { getCourseCatalogData } = await import("@/lib/catalog.server")
    return getCourseCatalogData(data)
  })

export const Route = createFileRoute("/courses/")({
  validateSearch: (search): CourseFilters => ({
    difficulty: toStringArray(search.difficulty),
    tag: toStringArray(search.tag),
  }),
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => getCourseCatalog({ data: deps }),
  component: CoursesPage,
})

function CoursesPage() {
  const search = Route.useSearch()
  const { courses, viewer, totalCount, filterOptions } = Route.useLoaderData()
  const { subjects, difficulties } = filterOptions
  const [filtersOpen, setFiltersOpen] = useState(false)
  const activeFilterCount =
    (search.tag?.length ?? 0) + (search.difficulty?.length ?? 0)

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="grid gap-6 border-b pb-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div>
          <p className="text-sm font-medium text-primary">Course catalog</p>
          <h1 className="mt-3 font-heading text-4xl font-semibold text-balance">
            Study the skills that show up in applications.
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground">
            Courses are short enough to fit around school. Each one includes
            lessons, a preview topic, and a small assignment or quiz.
          </p>
        </div>
        <div className="lg:border-l lg:pl-6">
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <IconBook2 />
            Course library
          </div>
          <p className="mt-3 font-heading text-3xl font-semibold">
            {totalCount} courses
          </p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Math, English, economics, and admissions planning
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
            <FilterGroup title="Subjects" icon={<IconFilter />}>
              {subjects.map((tag) => (
                <FilterCheckbox
                  key={tag.id}
                  search={courseFilterSearch(search, {
                    tag: toggleValue(search.tag, tag.slug),
                  })}
                  active={search.tag?.includes(tag.slug) ?? false}
                >
                  {tag.name}
                </FilterCheckbox>
              ))}
            </FilterGroup>

            <FilterGroup title="Difficulty">
              {difficulties.map((difficulty) => (
                <FilterCheckbox
                  key={difficulty}
                  search={courseFilterSearch(search, {
                    difficulty: toggleValue(search.difficulty, difficulty),
                  })}
                  active={search.difficulty?.includes(difficulty) ?? false}
                >
                  {capitalize(difficulty)}
                </FilterCheckbox>
              ))}
            </FilterGroup>
          </div>
        </aside>

        <section>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Showing {courses.length} of {totalCount} courses
            </p>
            {(search.tag?.length || search.difficulty?.length) && (
              <Link
                to="/courses"
                resetScroll={false}
                className="text-sm font-medium text-primary hover:underline"
              >
                Clear filters
              </Link>
            )}
          </div>

          <div className="catalog-list">
            {courses.map((course) => (
              <article
                key={course.id}
                className="catalog-row grid gap-5 md:grid-cols-[8rem_minmax(0,1fr)]"
              >
                <div className="stat-tile hidden md:flex">
                  <span className="stat-tile-label">Lessons</span>
                  <span className="stat-tile-value">{course.lessonCount}</span>
                  <span className="stat-tile-meta">{course.durationLabel}</span>
                </div>

                <div className="min-w-0">
                  <p className="mb-3 flex items-center gap-1.5 text-sm font-medium text-primary md:hidden">
                    <IconBook2 className="size-4" />
                    {course.lessonCount} lessons
                    <span className="font-normal text-muted-foreground">
                      · {course.durationLabel}
                    </span>
                  </p>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>{capitalize(course.difficulty)}</span>
                  </div>
                  <h2 className="mt-3 font-heading text-2xl font-semibold">
                    {course.title}
                  </h2>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                    {course.summary}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {course.tags.slice(0, 5).map((tag) => (
                      <span key={tag.id} className="tag-pill">
                        {tag.name}
                      </span>
                    ))}
                  </div>
                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    <CourseEnrollButton
                      course={course}
                      redirectTo={`/courses/${course.slug}`}
                      viewer={viewer}
                    />
                    <Link
                      to="/courses/$slug"
                      params={{ slug: course.slug }}
                      className={buttonVariants({
                        variant: "outline",
                        size: "sm",
                      })}
                    >
                      View lessons
                    </Link>
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
  children: ReactNode
  icon?: ReactNode
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
  children: ReactNode
  search: CourseFilters
}) {
  return (
    <Link
      to="/courses"
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

function courseFilterSearch(
  current: CourseFilters,
  patch: Partial<CourseFilters>
): CourseFilters {
  return { ...current, ...patch }
}
