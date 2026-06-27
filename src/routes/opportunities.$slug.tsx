import {
  IconCalendarDue,
  IconChecklist,
  IconExternalLink,
  IconMapPin,
} from "@tabler/icons-react"
import { Link, createFileRoute } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"

import { SaveOpportunityButton } from "@/components/save-opportunity-button"
import { buttonVariants } from "@/components/ui/button"
import { formatCategory, formatDate, formatFormat } from "@/lib/catalog"

const getOpportunityDetail = createServerFn({ method: "GET" })
  .validator((slug: string) => slug)
  .handler(async ({ data: slug }) => {
    const { getOpportunityDetailData } = await import("@/lib/catalog.server")
    return getOpportunityDetailData(slug)
  })

export const Route = createFileRoute("/opportunities/$slug")({
  loader: ({ params }) => getOpportunityDetail({ data: params.slug }),
  component: OpportunityDetailPage,
})

function OpportunityDetailPage() {
  const { opportunity, viewer } = Route.useLoaderData()

  if (!opportunity) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <Link
          to="/opportunities"
          className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
        >
          Back to opportunities
        </Link>
        <h1 className="mt-6 font-heading text-3xl font-semibold">
          Program not found
        </h1>
        <p className="mt-3 text-muted-foreground">
          This program may have been removed or renamed.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        to="/opportunities"
        className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
      >
        Back to opportunities
      </Link>

      <section className="mt-6 grid gap-8 border-b pb-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div>
          <div className="flex flex-wrap gap-2">
            <span className="tag-pill">
              {formatCategory(opportunity.category)}
            </span>
            <span className="tag-pill">{formatFormat(opportunity.format)}</span>
            <span className="tag-pill">{opportunity.gradeLabel}</span>
          </div>
          <h1 className="mt-5 max-w-4xl font-heading text-4xl font-semibold text-balance sm:text-5xl">
            {opportunity.title}
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-muted-foreground">
            {opportunity.description}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <a
              href={opportunity.applyUrl}
              target="_blank"
              rel="noreferrer"
              className={buttonVariants({ size: "lg" })}
            >
              Open application site
              <IconExternalLink data-icon="inline-end" />
            </a>
            <Link
              to="/courses"
              className={buttonVariants({ variant: "outline", size: "lg" })}
            >
              Match a course
            </Link>
            <SaveOpportunityButton
              opportunity={opportunity}
              redirectTo={`/opportunities/${opportunity.slug}`}
              size="lg"
              viewer={viewer}
            />
          </div>
        </div>

        <div className="rounded-md border">
          <div className="border-b p-5">
            <div className="flex items-center gap-2 text-sm font-medium">
              <IconCalendarDue />
              Application deadline
            </div>
            <p className="mt-3 font-heading text-3xl font-semibold">
              {opportunity.deadlineLabel}
            </p>
          </div>
          <dl className="grid gap-4 p-5 text-sm">
            <InfoRow label="Provider" value={opportunity.providerName} />
            <InfoRow label="Dates" value={opportunity.durationLabel} />
            <InfoRow
              label="Location"
              value={
                opportunity.location ??
                opportunity.city ??
                opportunity.country ??
                "Online"
              }
            />
            <InfoRow label="Grades" value={opportunity.gradeLabel} />
          </dl>
        </div>
      </section>

      <section className="grid gap-8 py-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <IconChecklist />
            Requirements
          </div>
          <ul className="mt-4 divide-y border-t">
            {opportunity.requirements.map((requirement) => (
              <li key={requirement} className="py-3 text-sm leading-6">
                {requirement}
              </li>
            ))}
          </ul>
        </div>

        <aside className="flex flex-col gap-8">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium">
              <IconMapPin />
              Program tags
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {opportunity.tags.map((tag) => (
                <span key={tag.id} className="tag-pill">
                  {tag.name}
                </span>
              ))}
            </div>
          </div>
          <div className="border-t pt-6">
            <p className="text-sm font-medium">Dates to note</p>
            <dl className="mt-4 grid gap-3 text-sm">
              <InfoRow
                label="Applications close"
                value={formatDate(opportunity.deadlineAt)}
              />
              <InfoRow
                label="Starts"
                value={formatDate(opportunity.startsAt)}
              />
              <InfoRow label="Ends" value={formatDate(opportunity.endsAt)} />
            </dl>
          </div>
        </aside>
      </section>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  )
}
