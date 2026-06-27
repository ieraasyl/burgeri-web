import {
  IconBook2,
  IconCalendarDue,
  IconCircleCheck,
  IconLoader2,
  IconLogout,
  IconSparkles,
} from "@tabler/icons-react"
import { Link, createFileRoute } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"
import { useState } from "react"

import { Button, buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { capitalize, formatCategory, formatFormat } from "@/lib/catalog"
import type { StudentDashboardData } from "@/lib/catalog"
import { signOut } from "@/lib/auth-client"

const requireAccountAccess = createServerFn({ method: "GET" }).handler(
  async () => {
    const { requireCompletedProfile } =
      await import("@/lib/user-context.server")
    await requireCompletedProfile("/account")
    return { ok: true }
  }
)

const getDashboard = createServerFn({ method: "GET" }).handler(async () => {
  const { getStudentDashboardData } = await import("@/lib/catalog.server")
  return getStudentDashboardData()
})

export const Route = createFileRoute("/account")({
  beforeLoad: () => requireAccountAccess(),
  loader: () => getDashboard(),
  component: AccountDashboardPage,
})

function AccountDashboardPage() {
  const dashboard = Route.useLoaderData()
  const [isSigningOut, setIsSigningOut] = useState(false)

  async function handleSignOut() {
    setIsSigningOut(true)
    const result = await signOut()

    if (result.error) {
      setIsSigningOut(false)
      return
    }

    window.location.assign("/")
  }

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[20rem_minmax(0,1fr)] lg:px-8 lg:py-12">
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <Card className="rounded-md" size="sm">
          <CardHeader>
            <div className="flex size-14 items-center justify-center rounded-md bg-primary font-heading text-lg font-semibold text-primary-foreground">
              {getInitials(dashboard.user.name, dashboard.user.email)}
            </div>
            <CardTitle className="mt-3">{dashboard.user.name}</CardTitle>
            <CardDescription className="break-all">
              {dashboard.user.email}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <dl className="grid gap-3 text-sm">
              <ProfileRow
                label="Grade"
                value={
                  dashboard.profile.grade
                    ? `Grade ${dashboard.profile.grade}`
                    : "Not set"
                }
              />
              <ProfileRow label="Country" value={dashboard.profile.country} />
              <ProfileRow label="Role" value={dashboard.profile.role} />
            </dl>
            <div className="flex flex-wrap gap-2">
              {dashboard.preferences.slice(0, 8).map((preference) => (
                <span key={preference.tagSlug} className="tag-pill">
                  {preference.tagName}
                </span>
              ))}
            </div>
            <Link
              to="/onboarding"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Update profile
            </Link>
            {dashboard.profile.role === "admin" && (
              <Link to="/admin" className={buttonVariants({ size: "sm" })}>
                Admin panel
              </Link>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isSigningOut}
              onClick={handleSignOut}
            >
              {isSigningOut ? (
                <IconLoader2
                  className="animate-spin"
                  data-icon="inline-start"
                />
              ) : (
                <IconLogout data-icon="inline-start" />
              )}
              Sign out
            </Button>
          </CardContent>
        </Card>
      </aside>

      <section className="min-w-0">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-8">
          <div>
            <p className="text-sm font-medium text-primary">
              Student dashboard
            </p>
            <h1 className="mt-3 font-heading text-4xl font-semibold text-balance">
              Saved deadlines and course progress
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
              Your shortlist, active lessons, and recommendations update from
              the profile you completed during onboarding.
            </p>
          </div>
          <Link to="/opportunities" className={buttonVariants()}>
            Find programs
          </Link>
        </div>

        <div className="grid gap-4 py-8 md:grid-cols-3">
          <MetricCard
            icon={<IconCalendarDue />}
            label="Saved programs"
            value={`${dashboard.savedOpportunities.length}`}
          />
          <MetricCard
            icon={<IconBook2 />}
            label="Enrolled courses"
            value={`${dashboard.enrolledCourses.length}`}
          />
          <MetricCard
            icon={<IconCircleCheck />}
            label="Upcoming deadlines"
            value={`${dashboard.upcomingDeadlines.length}`}
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="flex flex-col gap-6">
            <DashboardSection
              title="Saved opportunities"
              description="Programs you marked for follow-up."
              empty="Save programs from the catalog to build this list."
            >
              {dashboard.savedOpportunities.map((opportunity) => (
                <OpportunityRow
                  key={opportunity.id}
                  opportunity={opportunity}
                />
              ))}
            </DashboardSection>

            <DashboardSection
              title="Enrolled courses"
              description="Progress is based on completed lessons and quizzes."
              empty="Enroll from a course page to start tracking progress."
            >
              {dashboard.enrolledCourses.map((course) => (
                <CourseRow key={course.id} course={course} />
              ))}
            </DashboardSection>
          </div>

          <aside className="flex flex-col gap-6 xl:border-l xl:pl-6">
            <DashboardSection
              title="Upcoming deadlines"
              description="Saved programs sorted by date."
              empty="No upcoming saved deadlines yet."
            >
              {dashboard.upcomingDeadlines.map((opportunity) => (
                <Link
                  key={opportunity.id}
                  to="/opportunities/$slug"
                  params={{ slug: opportunity.slug }}
                  className="rounded-md px-3 py-3 transition-colors hover:bg-muted"
                >
                  <p className="text-xs text-muted-foreground">
                    {opportunity.deadlineShortLabel}
                  </p>
                  <p className="mt-2 text-sm font-medium">
                    {opportunity.title}
                  </p>
                </Link>
              ))}
            </DashboardSection>

            <DashboardSection
              title="Recommended next"
              description="Ranked by your onboarding tags."
              empty="Recommendations appear after the catalog has matching tags."
              icon={<IconSparkles />}
            >
              {dashboard.recommendedOpportunities
                .slice(0, 3)
                .map((opportunity) => (
                  <OpportunityRow
                    key={opportunity.id}
                    opportunity={opportunity}
                    compact
                  />
                ))}
              {dashboard.recommendedCourses.slice(0, 2).map((course) => (
                <CourseRow key={course.id} course={course} compact />
              ))}
            </DashboardSection>
          </aside>
        </div>
      </section>
    </div>
  )
}

function DashboardSection({
  children,
  description,
  empty,
  icon,
  title,
}: {
  children: React.ReactNode
  description: string
  empty: string
  icon?: React.ReactNode
  title: string
}) {
  const items = Array.isArray(children) ? children.filter(Boolean) : children
  const isEmpty = Array.isArray(items) ? items.length === 0 : !items

  return (
    <section>
      <div className="flex items-start gap-3">
        {icon && <span className="mt-1 text-primary">{icon}</span>}
        <div>
          <h2 className="font-heading text-xl font-semibold">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="mt-5 flex flex-col divide-y">
        {isEmpty ? (
          <p className="rounded-md bg-muted p-4 text-sm text-muted-foreground">
            {empty}
          </p>
        ) : (
          items
        )}
      </div>
    </section>
  )
}

function OpportunityRow({
  compact,
  opportunity,
}: {
  compact?: boolean
  opportunity: StudentDashboardData["savedOpportunities"][number]
}) {
  return (
    <Link
      to="/opportunities/$slug"
      params={{ slug: opportunity.slug }}
      className="flex gap-3 rounded-md px-3 py-4 transition-colors hover:bg-muted"
    >
      <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        <IconCalendarDue />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>{opportunity.deadlineShortLabel}</span>
          <span>{formatCategory(opportunity.category)}</span>
          <span>{formatFormat(opportunity.format)}</span>
        </div>
        <p className="mt-2 font-heading text-lg font-semibold">
          {opportunity.title}
        </p>
        {!compact && (
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {opportunity.summary}
          </p>
        )}
      </div>
    </Link>
  )
}

function CourseRow({
  compact,
  course,
}: {
  compact?: boolean
  course: StudentDashboardData["enrolledCourses"][number]
}) {
  return (
    <Link
      to="/courses/$slug"
      params={{ slug: course.slug }}
      className="flex gap-3 rounded-md px-3 py-4 transition-colors hover:bg-muted"
    >
      <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        <IconBook2 />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>{capitalize(course.difficulty)}</span>
          <span>{course.lessonCount} lessons</span>
          <span>{course.durationLabel}</span>
        </div>
        <p className="mt-2 font-heading text-lg font-semibold">
          {course.title}
        </p>
        {!compact && (
          <>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {course.summary}
            </p>
            <ProgressBar value={course.progressPercent} />
          </>
        )}
      </div>
    </Link>
  )
}

function MetricCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="rounded-md bg-muted p-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="text-primary">{icon}</span>
        {label}
      </div>
      <p className="mt-3 font-heading text-2xl font-semibold">{value}</p>
    </div>
  )
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium capitalize">{value}</dd>
    </div>
  )
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
      <div
        className="h-full rounded-full bg-primary"
        style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
      />
    </div>
  )
}

function getInitials(name: string, email: string) {
  const source = name.trim() || email
  const initials = source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("")

  return initials || "MH"
}
