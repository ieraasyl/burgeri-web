import { IconCalendarDue } from "@tabler/icons-react"
import { Link, createFileRoute } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"

import { buttonVariants } from "@/components/ui/button"
import { formatCategory, formatFormat } from "@/lib/catalog"

const getHomeCatalog = createServerFn({ method: "GET" }).handler(async () => {
  const { getHomeCatalogData } = await import("@/lib/catalog.server")
  return getHomeCatalogData()
})

export const Route = createFileRoute("/")({
  loader: () => getHomeCatalog(),
  component: HomePage,
})

function HomePage() {
  const { opportunities } = Route.useLoaderData()
  const featuredOpportunities = opportunities.slice(0, 4)

  return (
    <>
      <section className="flex flex-1 items-center">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_29rem] lg:px-8 lg:py-16">
          <div className="flex max-w-3xl flex-col justify-center">
            <h1 className="font-heading text-4xl font-semibold tracking-normal text-balance sm:text-5xl lg:text-6xl">
              Build a shortlist before the deadline.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              Compare olympiads, hackathons, summer schools, scholarships, and
              self-paced courses with the grade range and next date visible from
              the start.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/opportunities"
                className={buttonVariants({ size: "lg" })}
              >
                Find programs
              </Link>
            </div>
          </div>

          <div className="deadline-panel">
            <div className="flex items-center justify-between gap-4 border-b px-5 py-4">
              <div>
                <p className="text-sm font-medium">Next application dates</p>
                <p className="text-xs text-muted-foreground">
                  Sorted by deadline
                </p>
              </div>
              <IconCalendarDue className="text-primary" />
            </div>
            <div className="deadline-rail">
              {featuredOpportunities.map((opportunity) => (
                <Link
                  key={opportunity.id}
                  to="/opportunities/$slug"
                  params={{ slug: opportunity.slug }}
                  className="deadline-rail-item"
                >
                  <span className="deadline-dot" aria-hidden="true" />
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>{opportunity.deadlineShortLabel}</span>
                      <span>{formatCategory(opportunity.category)}</span>
                    </span>
                    <span className="font-heading text-base leading-snug font-semibold">
                      {opportunity.title}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {opportunity.gradeLabel} ·{" "}
                      {formatFormat(opportunity.format)}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
