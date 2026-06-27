import {
  IconBook2,
  IconChecklist,
  IconClock,
  IconExternalLink,
  IconFileText,
  IconLoader2,
} from "@tabler/icons-react"
import { Link, createFileRoute, useRouter } from "@tanstack/react-router"
import { createServerFn, useServerFn } from "@tanstack/react-start"
import { useState } from "react"
import type { FormEvent } from "react"

import { CourseEnrollButton } from "@/components/course-enroll-button"
import { Button, buttonVariants } from "@/components/ui/button"
import { markLessonComplete, submitLessonQuiz } from "@/lib/actions"
import { capitalize } from "@/lib/catalog"
import type { CatalogLesson, ViewerState } from "@/lib/catalog"

const getCourseDetail = createServerFn({ method: "GET" })
  .validator((slug: string) => slug)
  .handler(async ({ data: slug }) => {
    const { getCourseDetailData } = await import("@/lib/catalog.server")
    return getCourseDetailData(slug)
  })

export const Route = createFileRoute("/courses/$slug")({
  loader: ({ params }) => getCourseDetail({ data: params.slug }),
  component: CourseDetailPage,
})

function CourseDetailPage() {
  const { course, viewer } = Route.useLoaderData()

  if (!course) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <Link
          to="/courses"
          className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
        >
          Back to courses
        </Link>
        <h1 className="mt-6 font-heading text-3xl font-semibold">
          Course not found
        </h1>
        <p className="mt-3 text-muted-foreground">
          This course may have been removed or renamed.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        to="/courses"
        className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
      >
        Back to courses
      </Link>

      <section className="mt-6 grid gap-8 border-b pb-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div>
          <div className="flex flex-wrap gap-2">
            <span className="tag-pill">{capitalize(course.difficulty)}</span>
            <span className="tag-pill">{course.lessonCount} lessons</span>
            <span className="tag-pill">{course.durationLabel}</span>
          </div>
          <h1 className="mt-5 max-w-4xl font-heading text-4xl font-semibold text-balance sm:text-5xl">
            {course.title}
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-muted-foreground">
            {course.description}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <a href="#lessons" className={buttonVariants({ size: "lg" })}>
              View lessons
              <IconBook2 data-icon="inline-end" />
            </a>
            <Link
              to="/opportunities"
              className={buttonVariants({ variant: "outline", size: "lg" })}
            >
              Find matching programs
              <IconExternalLink data-icon="inline-end" />
            </Link>
            <CourseEnrollButton
              course={course}
              redirectTo={`/courses/${course.slug}`}
              size="lg"
              viewer={viewer}
            />
          </div>
        </div>

        <div className="rounded-md border p-5">
          <div className="flex items-center gap-2 text-sm font-medium">
            <IconChecklist />
            Course plan
          </div>
          <dl className="mt-5 grid gap-4 text-sm">
            <InfoRow label="Difficulty" value={capitalize(course.difficulty)} />
            <InfoRow label="Lessons" value={`${course.lessonCount}`} />
            <InfoRow label="Time" value={course.durationLabel} />
            <InfoRow label="Preview" value={course.previewLesson.title} />
            <InfoRow
              label="Progress"
              value={
                course.isEnrolled
                  ? `${course.progressPercent}% complete`
                  : "Not enrolled"
              }
            />
          </dl>
          <ProgressBar value={course.progressPercent} />
          <div className="mt-5 flex flex-wrap gap-2">
            {course.tags.map((tag) => (
              <span key={tag.id} className="tag-pill">
                {tag.name}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section id="lessons" className="py-8">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-primary">Lesson list</p>
            <h2 className="mt-3 font-heading text-3xl font-semibold">
              Work through one topic at a time
            </h2>
          </div>
        </div>

        <div className="catalog-list">
          {course.lessons.map((lesson) => (
            <article
              key={lesson.id}
              className="catalog-row grid gap-5 md:grid-cols-[4rem_minmax(0,1fr)]"
            >
              <div className="lesson-number">{lesson.position}</div>
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {lesson.isPreview && <span>Preview</span>}
                  <span className="inline-flex items-center gap-1">
                    <IconClock />
                    {lesson.durationMinutes} min
                  </span>
                  <span>{lesson.quizCount} quiz question</span>
                  {lesson.progressStatus === "completed" && (
                    <span>Completed</span>
                  )}
                </div>
                <h3 className="mt-3 font-heading text-2xl font-semibold">
                  {lesson.title}
                </h3>
                <ProgressBar value={lesson.progressPercent} />
                {lesson.summary && (
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                    {lesson.summary}
                  </p>
                )}
                {lesson.content && (
                  <p className="mt-3 max-w-3xl text-sm leading-6">
                    {lesson.content}
                  </p>
                )}
                {lesson.videoUrl && (
                  <a
                    href={lesson.videoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 flex min-h-28 flex-col justify-center rounded-md bg-muted p-4 transition-colors hover:bg-muted/70"
                  >
                    <span className="text-sm font-medium">Video lesson</span>
                    <span className="mt-2 text-sm text-muted-foreground">
                      Open the lesson video in a new tab.
                    </span>
                  </a>
                )}
                {lesson.assignmentPrompt && (
                  <div className="mt-4 rounded-md bg-muted p-4">
                    <p className="flex items-center gap-2 text-sm font-medium">
                      <IconFileText />
                      Assignment
                    </p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {lesson.assignmentPrompt}
                    </p>
                  </div>
                )}
                {lesson.materials.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {lesson.materials.map((material) => (
                      <a
                        key={material.url}
                        href={material.url}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-md bg-muted px-3 py-2 text-sm font-medium transition-colors hover:bg-muted/70"
                      >
                        {material.title}
                      </a>
                    ))}
                  </div>
                )}
                <LessonActions
                  lesson={lesson}
                  redirectTo={`/courses/${course.slug}`}
                  viewer={viewer}
                />
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}

function LessonActions({
  lesson,
  redirectTo,
  viewer,
}: {
  lesson: CatalogLesson
  redirectTo: string
  viewer: ViewerState
}) {
  const markLessonCompleteFn = useServerFn(markLessonComplete)
  const submitLessonQuizFn = useServerFn(submitLessonQuiz)
  const router = useRouter()
  const [isCompleting, setIsCompleting] = useState(false)
  const [isSubmittingQuiz, setIsSubmittingQuiz] = useState(false)
  const [answers, setAnswers] = useState<Partial<Record<string, string[]>>>({})
  const [message, setMessage] = useState<string | null>(null)

  if (!viewer.isSignedIn) {
    return (
      <Link
        to="/sign-in"
        search={{ redirect: redirectTo }}
        className={buttonVariants({ size: "sm" })}
      >
        Sign in to track progress
      </Link>
    )
  }

  if (!viewer.onboardingCompleted) {
    return (
      <Link
        to="/onboarding"
        search={{ redirect: redirectTo }}
        className={buttonVariants({ size: "sm" })}
      >
        Complete onboarding
      </Link>
    )
  }

  async function handleMarkComplete() {
    setMessage(null)
    setIsCompleting(true)
    const result = await markLessonCompleteFn({ data: { lessonId: lesson.id } })
    setIsCompleting(false)

    if (!result.ok) {
      setMessage(result.message)
      return
    }

    setMessage("Lesson marked complete.")
    await router.invalidate()
  }

  async function handleSubmitQuiz(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage(null)
    setIsSubmittingQuiz(true)
    const result = await submitLessonQuizFn({
      data: {
        lessonId: lesson.id,
        answers: Object.fromEntries(
          lesson.quizQuestions.map((question) => [
            question.id,
            answers[question.id] ?? [],
          ])
        ),
      },
    })
    setIsSubmittingQuiz(false)

    if (!result.ok) {
      setMessage(result.message)
      return
    }

    setMessage(
      `Quiz score: ${result.data.correctAnswers}/${result.data.totalQuestions} (${result.data.scorePercent}%).`
    )
    await router.invalidate()
  }

  return (
    <div className="mt-5 flex flex-col gap-4">
      {lesson.quizQuestions.length > 0 && (
        <form className="rounded-md bg-muted p-4" onSubmit={handleSubmitQuiz}>
          <p className="font-heading text-base font-semibold">Mini-quiz</p>
          <div className="mt-4 flex flex-col gap-4">
            {lesson.quizQuestions.map((question) => (
              <fieldset key={question.id} className="grid gap-3">
                <legend className="text-sm font-medium">
                  {question.prompt}
                </legend>
                <div className="grid gap-2">
                  {question.options.map((option) => {
                    const selected = answers[question.id]?.includes(option.id)

                    return (
                      <label
                        key={option.id}
                        className="flex items-center gap-2 rounded-md bg-background px-3 py-2 text-sm"
                      >
                        <input
                          type={
                            question.type === "multiple_choice"
                              ? "checkbox"
                              : "radio"
                          }
                          name={question.id}
                          checked={Boolean(selected)}
                          onChange={() =>
                            setAnswers((current) => ({
                              ...current,
                              [question.id]:
                                question.type === "multiple_choice"
                                  ? toggleOption(
                                      current[question.id] ?? [],
                                      option.id
                                    )
                                  : [option.id],
                            }))
                          }
                        />
                        {option.label}
                      </label>
                    )
                  })}
                </div>
              </fieldset>
            ))}
          </div>
          <Button
            type="submit"
            size="sm"
            className="mt-4"
            disabled={isSubmittingQuiz}
          >
            {isSubmittingQuiz && (
              <IconLoader2 className="animate-spin" data-icon="inline-start" />
            )}
            Submit quiz
          </Button>
        </form>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant={
            lesson.progressStatus === "completed" ? "secondary" : "outline"
          }
          size="sm"
          disabled={isCompleting}
          onClick={handleMarkComplete}
        >
          {isCompleting && (
            <IconLoader2 className="animate-spin" data-icon="inline-start" />
          )}
          {lesson.progressStatus === "completed"
            ? "Completed"
            : "Mark complete"}
        </Button>
        {lesson.quizScorePercent !== null && (
          <span className="text-sm text-muted-foreground">
            Last quiz score: {lesson.quizScorePercent}%
          </span>
        )}
        {message && (
          <span className="text-sm text-muted-foreground">{message}</span>
        )}
      </div>
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

function toggleOption(current: string[], optionId: string) {
  return current.includes(optionId)
    ? current.filter((id) => id !== optionId)
    : [...current, optionId]
}
