import { IconCheck, IconLoader2 } from "@tabler/icons-react"
import { createFileRoute } from "@tanstack/react-router"
import { createServerFn, useServerFn } from "@tanstack/react-start"
import { useMemo, useState } from "react"
import type { FormEvent } from "react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel, FieldSet } from "@/components/ui/field"
import { completeOnboarding } from "@/lib/actions"
import { cn } from "@/lib/utils"

const STEPS = [
  {
    key: "grade",
    label: "Grade",
    title: "What grade are you in?",
    description:
      "We use this to surface deadlines and grade-appropriate programs.",
    headline: "Tell Mentoria what should rise to the top.",
    blurb:
      "Start with your grade so deadlines and grade ranges line up from the first card.",
  },
  {
    key: "interests",
    label: "Interests",
    title: "Which fields interest you?",
    description: "Choose at least one. Recommendations start from these.",
    headline: "What gets you curious?",
    blurb:
      "Your fields shape the first wave of programs and courses we surface.",
  },
  {
    key: "subjects",
    label: "Subjects",
    title: "Any subjects you want support with?",
    description: "Pick the classes or exams you're focused on. Optional.",
    headline: "Where do you want backup?",
    blurb: "Subjects help us line up the right courses, prep, and practice.",
  },
  {
    key: "goals",
    label: "Goals",
    title: "What are you working toward?",
    description: "Choose at least one outcome.",
    headline: "Name the outcome you're chasing.",
    blurb: "Goals keep your shortlist pointed at what actually matters to you.",
  },
] as const

const requireOnboardingAccess = createServerFn({ method: "GET" }).handler(
  async () => {
    const { requireOnboardingUser } = await import("@/lib/user-context.server")
    await requireOnboardingUser()
    return { ok: true }
  }
)

const getOnboardingData = createServerFn({ method: "GET" }).handler(
  async () => {
    const { listTags } = await import("@/db/queries")
    const { getUserTagPreferences } = await import("@/db/queries")
    const { getServerDb } = await import("@/lib/db.server")
    const { requireOnboardingUser } = await import("@/lib/user-context.server")
    const context = await requireOnboardingUser()
    const db = getServerDb()
    const [tags, preferences] = await Promise.all([
      listTags(db),
      getUserTagPreferences(db, context.user.id),
    ])

    return {
      user: {
        name: context.user.name,
        email: context.user.email,
      },
      profile: {
        grade: context.profile?.grade ?? 10,
      },
      preferences: {
        interests: preferences
          .filter((preference) => preference.preferenceType === "interest")
          .map((preference) => preference.tagSlug),
        subjects: preferences
          .filter((preference) => preference.preferenceType === "subject")
          .map((preference) => preference.tagSlug),
        goals: preferences
          .filter((preference) => preference.preferenceType === "goal")
          .map((preference) => preference.tagSlug),
      },
      fields: tags.filter((tag) => tag.kind === "field"),
      subjects: tags.filter((tag) => tag.kind === "subject"),
      goals: tags.filter((tag) => tag.kind === "goal"),
    }
  }
)

export const Route = createFileRoute("/onboarding")({
  validateSearch: (search): { redirect?: string } => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  beforeLoad: () => requireOnboardingAccess(),
  loader: () => getOnboardingData(),
  component: OnboardingPage,
})

function OnboardingPage() {
  const data = Route.useLoaderData()
  const search = Route.useSearch()
  const completeOnboardingFn = useServerFn(completeOnboarding)
  const [grade, setGrade] = useState(data.profile.grade)
  const [interests, setInterests] = useState<string[]>(
    data.preferences.interests
  )
  const [subjects, setSubjects] = useState<string[]>(data.preferences.subjects)
  const [goals, setGoals] = useState<string[]>(data.preferences.goals)
  const [message, setMessage] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [step, setStep] = useState(0)
  const lastStep = STEPS.length - 1
  const current = STEPS[step]
  const redirectTo = useMemo(
    () => getSafeRedirect(search.redirect),
    [search.redirect]
  )

  function isStepValid(index: number) {
    if (index === 1) return interests.length > 0
    if (index === 3) return goals.length > 0
    return true
  }

  function goNext() {
    setMessage(null)
    setStep((value) => Math.min(value + 1, lastStep))
  }

  function goBack() {
    setMessage(null)
    setStep((value) => Math.max(value - 1, 0))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage(null)
    setIsSaving(true)

    const result = await completeOnboardingFn({
      data: {
        grade,
        interests,
        subjects,
        goals,
      },
    })

    setIsSaving(false)

    if (!result.ok) {
      setMessage(result.message)
      return
    }

    window.location.assign(redirectTo)
  }

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:min-h-[calc(100svh-8rem)] lg:grid-cols-[minmax(0,1fr)_28rem] lg:items-center lg:px-8 lg:py-12">
      <nav className="lg:hidden" aria-label="Onboarding progress">
        <ol className="flex items-stretch gap-2">
          {STEPS.map((stepItem, index) => (
            <li
              key={stepItem.key}
              className="flex flex-1 flex-col items-center gap-1.5"
            >
              <span
                className={cn(
                  "h-1 w-full rounded-full",
                  index <= step ? "bg-primary" : "bg-muted"
                )}
              />
              <span
                className={cn(
                  "text-xs font-medium",
                  index === step ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {stepItem.label}
              </span>
            </li>
          ))}
        </ol>
      </nav>

      <section className="hidden flex-col justify-center lg:flex">
        <h1 className="max-w-3xl font-heading text-4xl font-semibold text-balance sm:text-5xl">
          {current.headline}
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground">
          {current.blurb}
        </p>
        <ol className="mt-8 grid max-w-md gap-3">
          {STEPS.map((stepItem, index) => {
            const state =
              index < step ? "done" : index === step ? "current" : "upcoming"

            return (
              <li key={stepItem.key} className="flex items-center gap-3">
                <span
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-md text-sm font-semibold",
                    state === "current" && "bg-primary text-primary-foreground",
                    state === "done" && "bg-primary/10 text-primary",
                    state === "upcoming" && "bg-muted text-muted-foreground"
                  )}
                >
                  {state === "done" ? (
                    <IconCheck className="size-4" />
                  ) : (
                    index + 1
                  )}
                </span>
                <p
                  className={cn(
                    "text-sm font-medium",
                    state === "upcoming" && "text-muted-foreground"
                  )}
                >
                  {stepItem.label}
                </p>
              </li>
            )
          })}
        </ol>
      </section>

      <Card className="rounded-md" size="sm">
        <CardHeader>
          <CardDescription className="font-medium text-primary">
            Step {step + 1} of {STEPS.length}
          </CardDescription>
          <CardTitle className="mt-1">{current.title}</CardTitle>
          <CardDescription>{current.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              {message && (
                <Alert variant="destructive">
                  <AlertTitle>Profile not saved</AlertTitle>
                  <AlertDescription>{message}</AlertDescription>
                </Alert>
              )}

              {step === 0 && (
                <Field>
                  <FieldLabel htmlFor="grade">Grade</FieldLabel>
                  <select
                    id="grade"
                    value={grade}
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    onChange={(event) => setGrade(Number(event.target.value))}
                  >
                    {[8, 9, 10, 11].map((value) => (
                      <option key={value} value={value}>
                        Grade {value}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
              {step === 1 && (
                <TagPicker
                  tags={data.fields}
                  selected={interests}
                  onChange={setInterests}
                />
              )}
              {step === 2 && (
                <TagPicker
                  tags={data.subjects}
                  selected={subjects}
                  onChange={setSubjects}
                />
              )}
              {step === 3 && (
                <TagPicker
                  tags={data.goals}
                  selected={goals}
                  onChange={setGoals}
                />
              )}

              <div className="flex items-center justify-between gap-3">
                {step > 0 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={isSaving}
                    onClick={goBack}
                  >
                    Back
                  </Button>
                ) : (
                  <span />
                )}
                {step < lastStep ? (
                  <Button
                    key="next"
                    type="button"
                    disabled={!isStepValid(step)}
                    onClick={goNext}
                  >
                    Continue
                  </Button>
                ) : (
                  <Button
                    key="submit"
                    type="submit"
                    disabled={isSaving || !isStepValid(step)}
                  >
                    {isSaving && (
                      <IconLoader2
                        className="animate-spin"
                        data-icon="inline-start"
                      />
                    )}
                    Continue to dashboard
                  </Button>
                )}
              </div>
            </FieldGroup>
          </form>
          <p className="mt-6 text-xs text-muted-foreground">
            Signed in as {data.user.email}. You can change these later by
            revisiting onboarding.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function TagPicker({
  onChange,
  selected,
  tags,
}: {
  onChange: (next: string[]) => void
  selected: string[]
  tags: Array<{ id: string; slug: string; name: string }>
}) {
  return (
    <FieldSet>
      <div className="grid gap-2 sm:grid-cols-2">
        {tags.map((tag) => {
          const checked = selected.includes(tag.slug)

          return (
            <label
              key={tag.id}
              className={cn(
                "flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors",
                checked && "border-primary bg-muted text-foreground"
              )}
            >
              <input
                type="checkbox"
                checked={checked}
                className="size-4"
                onChange={() =>
                  onChange(
                    checked
                      ? selected.filter((slug) => slug !== tag.slug)
                      : [...selected, tag.slug]
                  )
                }
              />
              {tag.name}
            </label>
          )
        })}
      </div>
    </FieldSet>
  )
}

function getSafeRedirect(value: string | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/account"
  }

  if (value.startsWith("/api/") || value.startsWith("/sign-in")) {
    return "/account"
  }

  return value
}
