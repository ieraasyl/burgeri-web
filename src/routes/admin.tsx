import {
  IconBook2,
  IconCalendarDue,
  IconLoader2,
  IconPlus,
  IconTrash,
  IconUsers,
} from "@tabler/icons-react"
import { createFileRoute, useRouter } from "@tanstack/react-router"
import { createServerFn, useServerFn } from "@tanstack/react-start"
import { useState } from "react"
import type { FormEvent } from "react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  courseDifficulties,
  opportunityCategories,
  opportunityFormats,
} from "@/db/schema"
import {
  adminDeleteCourse,
  adminDeleteLesson,
  adminDeleteOpportunity,
  adminUpsertCourse,
  adminUpsertLesson,
  adminUpsertOpportunity,
} from "@/lib/actions"
import type { AdminPageData } from "@/lib/admin.server"
import { capitalize, formatCategory, formatFormat } from "@/lib/catalog"

const requireAdminAccess = createServerFn({ method: "GET" }).handler(
  async () => {
    const { requireAdmin } = await import("@/lib/user-context.server")
    await requireAdmin("/admin")
    return { ok: true }
  }
)

const getAdminData = createServerFn({ method: "GET" }).handler(async () => {
  const { getAdminPageData } = await import("@/lib/admin.server")
  return getAdminPageData()
})

export const Route = createFileRoute("/admin")({
  beforeLoad: () => requireAdminAccess(),
  loader: () => getAdminData(),
  component: AdminPage,
})

function AdminPage() {
  const data = Route.useLoaderData()

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="border-b pb-8">
        <p className="text-sm font-medium text-primary">Admin panel</p>
        <h1 className="mt-3 font-heading text-4xl font-semibold text-balance">
          Manage published programs and lessons
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground">
          Create, edit, publish, and remove the catalog records that power the
          public opportunity and course pages.
        </p>
      </section>

      <section className="grid gap-4 py-8 md:grid-cols-5">
        <Stat
          icon={<IconCalendarDue />}
          label="Programs"
          value={data.stats.opportunities}
        />
        <Stat
          icon={<IconCalendarDue />}
          label="Published"
          value={data.stats.publishedOpportunities}
        />
        <Stat icon={<IconBook2 />} label="Courses" value={data.stats.courses} />
        <Stat
          icon={<IconBook2 />}
          label="Published"
          value={data.stats.publishedCourses}
        />
        <Stat icon={<IconUsers />} label="Users" value={data.stats.users} />
      </section>

      <section className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="flex flex-col gap-8">
          <CatalogAdminSection title="Opportunities">
            <details className="rounded-md border p-4">
              <summary className="cursor-pointer font-medium">
                Add opportunity
              </summary>
              <OpportunityForm tags={data.tags} />
            </details>
            {data.opportunities.map((opportunity) => (
              <details key={opportunity.id} className="rounded-md border p-4">
                <summary className="cursor-pointer">
                  <span className="font-medium">{opportunity.title}</span>
                  <span className="ml-2 text-sm text-muted-foreground">
                    {opportunity.isPublished ? "Published" : "Draft"}
                  </span>
                </summary>
                <OpportunityForm opportunity={opportunity} tags={data.tags} />
              </details>
            ))}
          </CatalogAdminSection>

          <CatalogAdminSection title="Courses and lessons">
            <details className="rounded-md border p-4">
              <summary className="cursor-pointer font-medium">
                Add course
              </summary>
              <CourseForm tags={data.tags} />
            </details>
            {data.courses.map((course) => (
              <details key={course.id} className="rounded-md border p-4">
                <summary className="cursor-pointer">
                  <span className="font-medium">{course.title}</span>
                  <span className="ml-2 text-sm text-muted-foreground">
                    {course.lessons.length} lessons
                  </span>
                </summary>
                <CourseForm course={course} tags={data.tags} />
                <div className="mt-6 border-t pt-5">
                  <p className="font-heading text-lg font-semibold">Lessons</p>
                  <div className="mt-4 flex flex-col gap-4">
                    <details className="rounded-md border p-4">
                      <summary className="cursor-pointer font-medium">
                        Add lesson
                      </summary>
                      <LessonForm courseId={course.id} />
                    </details>
                    {course.lessons.map((lesson) => (
                      <details
                        key={lesson.id}
                        className="rounded-md border p-4"
                      >
                        <summary className="cursor-pointer">
                          {lesson.position}. {lesson.title}
                        </summary>
                        <LessonForm courseId={course.id} lesson={lesson} />
                      </details>
                    ))}
                  </div>
                </div>
              </details>
            ))}
          </CatalogAdminSection>
        </div>

        <aside className="rounded-md border p-5 xl:sticky xl:top-24 xl:self-start">
          <h2 className="font-heading text-xl font-semibold">Recent users</h2>
          <div className="mt-5 flex flex-col gap-3">
            {data.users.map((user) => (
              <div key={user.id} className="rounded-md border p-3">
                <p className="text-sm font-medium">{user.name}</p>
                <p className="mt-1 text-xs break-all text-muted-foreground">
                  {user.email}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {user.role} ·{" "}
                  {user.grade ? `Grade ${user.grade}` : "No grade"} ·{" "}
                  {user.onboardingCompleted ? "Onboarded" : "Incomplete"}
                </p>
              </div>
            ))}
          </div>
        </aside>
      </section>
    </div>
  )
}

function OpportunityForm({
  opportunity,
  tags,
}: {
  opportunity?: AdminPageData["opportunities"][number]
  tags: AdminPageData["tags"]
}) {
  const upsertOpportunity = useServerFn(adminUpsertOpportunity)
  const deleteOpportunity = useServerFn(adminDeleteOpportunity)
  const router = useRouter()
  const [state, setState] = useState<FormState>({ status: "idle" })

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setState({ status: "pending" })
    const formData = new FormData(event.currentTarget)
    const result = await upsertOpportunity({
      data: {
        id: opportunity?.id,
        slug: getString(formData, "slug"),
        title: getString(formData, "title"),
        summary: getString(formData, "summary"),
        description: getString(formData, "description"),
        category: getString(
          formData,
          "category"
        ) as AdminPageData["opportunities"][number]["category"],
        format: getString(
          formData,
          "format"
        ) as AdminPageData["opportunities"][number]["format"],
        providerName: getString(formData, "providerName"),
        location: getNullableString(formData, "location"),
        country: getNullableString(formData, "country"),
        city: getNullableString(formData, "city"),
        minGrade: getNullableNumber(formData, "minGrade"),
        maxGrade: getNullableNumber(formData, "maxGrade"),
        deadlineAt: getString(formData, "deadlineAt"),
        startsAt: getNullableString(formData, "startsAt") ?? "",
        endsAt: getNullableString(formData, "endsAt") ?? "",
        applyUrl: getString(formData, "applyUrl"),
        requirementsText: getString(formData, "requirementsText"),
        tagSlugs: formData.getAll("tagSlugs").map(String),
        isFeatured: formData.get("isFeatured") === "on",
        isPublished: formData.get("isPublished") === "on",
      },
    })

    if (!result.ok) {
      setState({ status: "error", message: result.message })
      return
    }

    setState({ status: "success", message: "Opportunity saved." })
    await router.invalidate()
  }

  async function handleDelete() {
    if (!opportunity) {
      return
    }

    setState({ status: "pending" })
    const result = await deleteOpportunity({
      data: { opportunityId: opportunity.id },
    })

    if (!result.ok) {
      setState({ status: "error", message: result.message })
      return
    }

    setState({ status: "success", message: "Opportunity deleted." })
    await router.invalidate()
  }

  return (
    <form className="mt-5 grid gap-4" onSubmit={handleSubmit}>
      <TextField name="slug" label="Slug" defaultValue={opportunity?.slug} />
      <TextField name="title" label="Title" defaultValue={opportunity?.title} />
      <TextField
        name="summary"
        label="Summary"
        defaultValue={opportunity?.summary}
      />
      <TextAreaField
        name="description"
        label="Description"
        defaultValue={opportunity?.description}
      />
      <div className="grid gap-4 md:grid-cols-2">
        <SelectField
          name="category"
          label="Category"
          defaultValue={opportunity?.category}
          options={opportunityCategories.map((value) => ({
            label: formatCategory(value),
            value,
          }))}
        />
        <SelectField
          name="format"
          label="Format"
          defaultValue={opportunity?.format}
          options={opportunityFormats.map((value) => ({
            label: formatFormat(value),
            value,
          }))}
        />
      </div>
      <TextField
        name="providerName"
        label="Provider"
        defaultValue={opportunity?.providerName}
      />
      <div className="grid gap-4 md:grid-cols-3">
        <TextField
          name="location"
          label="Location"
          defaultValue={opportunity?.location}
        />
        <TextField
          name="country"
          label="Country"
          defaultValue={opportunity?.country}
        />
        <TextField name="city" label="City" defaultValue={opportunity?.city} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <NumberField
          name="minGrade"
          label="Minimum grade"
          defaultValue={opportunity?.minGrade}
        />
        <NumberField
          name="maxGrade"
          label="Maximum grade"
          defaultValue={opportunity?.maxGrade}
        />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <TextField
          name="deadlineAt"
          label="Deadline"
          type="date"
          defaultValue={opportunity?.deadlineAt}
        />
        <TextField
          name="startsAt"
          label="Starts"
          type="date"
          defaultValue={opportunity?.startsAt}
        />
        <TextField
          name="endsAt"
          label="Ends"
          type="date"
          defaultValue={opportunity?.endsAt}
        />
      </div>
      <TextField
        name="applyUrl"
        label="Apply URL"
        type="url"
        defaultValue={opportunity?.applyUrl}
      />
      <TextAreaField
        name="requirementsText"
        label="Requirements"
        defaultValue={opportunity?.requirementsText}
      />
      <TagCheckboxes tags={tags} selected={opportunity?.tags ?? []} />
      <BooleanFields
        featured={Boolean(opportunity?.isFeatured)}
        published={Boolean(opportunity?.isPublished)}
      />
      <FormActions
        isPending={state.status === "pending"}
        message={"message" in state ? state.message : undefined}
        onDelete={opportunity ? handleDelete : undefined}
        submitLabel={opportunity ? "Save opportunity" : "Create opportunity"}
      />
    </form>
  )
}

function CourseForm({
  course,
  tags,
}: {
  course?: AdminPageData["courses"][number]
  tags: AdminPageData["tags"]
}) {
  const upsertCourse = useServerFn(adminUpsertCourse)
  const deleteCourse = useServerFn(adminDeleteCourse)
  const router = useRouter()
  const [state, setState] = useState<FormState>({ status: "idle" })

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setState({ status: "pending" })
    const formData = new FormData(event.currentTarget)
    const result = await upsertCourse({
      data: {
        id: course?.id,
        slug: getString(formData, "slug"),
        title: getString(formData, "title"),
        summary: getString(formData, "summary"),
        description: getString(formData, "description"),
        difficulty: getString(
          formData,
          "difficulty"
        ) as AdminPageData["courses"][number]["difficulty"],
        estimatedHours: getNullableNumber(formData, "estimatedHours"),
        thumbnailUrl: getNullableString(formData, "thumbnailUrl"),
        tagSlugs: formData.getAll("tagSlugs").map(String),
        isFeatured: formData.get("isFeatured") === "on",
        isPublished: formData.get("isPublished") === "on",
      },
    })

    if (!result.ok) {
      setState({ status: "error", message: result.message })
      return
    }

    setState({ status: "success", message: "Course saved." })
    await router.invalidate()
  }

  async function handleDelete() {
    if (!course) {
      return
    }

    setState({ status: "pending" })
    const result = await deleteCourse({ data: { courseId: course.id } })

    if (!result.ok) {
      setState({ status: "error", message: result.message })
      return
    }

    setState({ status: "success", message: "Course deleted." })
    await router.invalidate()
  }

  return (
    <form className="mt-5 grid gap-4" onSubmit={handleSubmit}>
      <TextField name="slug" label="Slug" defaultValue={course?.slug} />
      <TextField name="title" label="Title" defaultValue={course?.title} />
      <TextField
        name="summary"
        label="Summary"
        defaultValue={course?.summary}
      />
      <TextAreaField
        name="description"
        label="Description"
        defaultValue={course?.description}
      />
      <div className="grid gap-4 md:grid-cols-2">
        <SelectField
          name="difficulty"
          label="Difficulty"
          defaultValue={course?.difficulty}
          options={courseDifficulties.map((value) => ({
            label: capitalize(value),
            value,
          }))}
        />
        <NumberField
          name="estimatedHours"
          label="Estimated hours"
          defaultValue={course?.estimatedHours}
        />
      </div>
      <TextField
        name="thumbnailUrl"
        label="Thumbnail URL"
        defaultValue={course?.thumbnailUrl}
      />
      <TagCheckboxes tags={tags} selected={course?.tags ?? []} />
      <BooleanFields
        featured={Boolean(course?.isFeatured)}
        published={Boolean(course?.isPublished)}
      />
      <FormActions
        isPending={state.status === "pending"}
        message={"message" in state ? state.message : undefined}
        onDelete={course ? handleDelete : undefined}
        submitLabel={course ? "Save course" : "Create course"}
      />
    </form>
  )
}

function LessonForm({
  courseId,
  lesson,
}: {
  courseId: string
  lesson?: AdminPageData["courses"][number]["lessons"][number]
}) {
  const upsertLesson = useServerFn(adminUpsertLesson)
  const deleteLesson = useServerFn(adminDeleteLesson)
  const router = useRouter()
  const [state, setState] = useState<FormState>({ status: "idle" })

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setState({ status: "pending" })
    const formData = new FormData(event.currentTarget)
    const result = await upsertLesson({
      data: {
        id: lesson?.id,
        courseId,
        slug: getString(formData, "slug"),
        title: getString(formData, "title"),
        summary: getNullableString(formData, "summary"),
        content: getNullableString(formData, "content"),
        videoUrl: getNullableString(formData, "videoUrl"),
        materialsText: getString(formData, "materialsText"),
        assignmentPrompt: getNullableString(formData, "assignmentPrompt"),
        durationMinutes: getNullableNumber(formData, "durationMinutes"),
        position: Number(getString(formData, "position") || 1),
        isPreview: formData.get("isPreview") === "on",
      },
    })

    if (!result.ok) {
      setState({ status: "error", message: result.message })
      return
    }

    setState({ status: "success", message: "Lesson saved." })
    await router.invalidate()
  }

  async function handleDelete() {
    if (!lesson) {
      return
    }

    setState({ status: "pending" })
    const result = await deleteLesson({ data: { lessonId: lesson.id } })

    if (!result.ok) {
      setState({ status: "error", message: result.message })
      return
    }

    setState({ status: "success", message: "Lesson deleted." })
    await router.invalidate()
  }

  return (
    <form className="mt-5 grid gap-4" onSubmit={handleSubmit}>
      <div className="grid gap-4 md:grid-cols-[1fr_7rem]">
        <TextField name="slug" label="Slug" defaultValue={lesson?.slug} />
        <NumberField
          name="position"
          label="Position"
          defaultValue={lesson?.position ?? 1}
        />
      </div>
      <TextField name="title" label="Title" defaultValue={lesson?.title} />
      <TextField
        name="summary"
        label="Summary"
        defaultValue={lesson?.summary}
      />
      <TextAreaField
        name="content"
        label="Content"
        defaultValue={lesson?.content}
      />
      <TextField
        name="videoUrl"
        label="Video URL"
        defaultValue={lesson?.videoUrl}
      />
      <TextAreaField
        name="materialsText"
        label="Materials"
        defaultValue={lesson?.materialsText}
      />
      <TextAreaField
        name="assignmentPrompt"
        label="Assignment prompt"
        defaultValue={lesson?.assignmentPrompt}
      />
      <NumberField
        name="durationMinutes"
        label="Duration minutes"
        defaultValue={lesson?.durationMinutes}
      />
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="isPreview"
          defaultChecked={Boolean(lesson?.isPreview)}
        />
        Preview lesson
      </label>
      <FormActions
        isPending={state.status === "pending"}
        message={"message" in state ? state.message : undefined}
        onDelete={lesson ? handleDelete : undefined}
        submitLabel={lesson ? "Save lesson" : "Create lesson"}
      />
    </form>
  )
}

function CatalogAdminSection({
  children,
  title,
}: {
  children: React.ReactNode
  title: string
}) {
  return (
    <section>
      <h2 className="font-heading text-2xl font-semibold">{title}</h2>
      <div className="mt-5 flex flex-col gap-4">{children}</div>
    </section>
  )
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: number
}) {
  return (
    <div className="rounded-md border p-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="text-primary">{icon}</span>
        {label}
      </div>
      <p className="mt-3 font-heading text-2xl font-semibold">{value}</p>
    </div>
  )
}

function TextField({
  defaultValue,
  label,
  name,
  type = "text",
}: {
  defaultValue?: number | string | null
  label: string
  name: string
  type?: string
}) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      {label}
      <input
        type={type}
        name={name}
        defaultValue={defaultValue ?? ""}
        className={inputClassName}
      />
    </label>
  )
}

function NumberField({
  defaultValue,
  label,
  name,
}: {
  defaultValue?: number | null
  label: string
  name: string
}) {
  return (
    <TextField
      name={name}
      label={label}
      type="number"
      defaultValue={defaultValue}
    />
  )
}

function TextAreaField({
  defaultValue,
  label,
  name,
}: {
  defaultValue?: string | null
  label: string
  name: string
}) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      {label}
      <textarea
        name={name}
        defaultValue={defaultValue ?? ""}
        rows={4}
        className={textareaClassName}
      />
    </label>
  )
}

function SelectField({
  defaultValue,
  label,
  name,
  options,
}: {
  defaultValue?: string
  label: string
  name: string
  options: Array<{ label: string; value: string }>
}) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      {label}
      <select
        name={name}
        defaultValue={defaultValue}
        className={inputClassName}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function TagCheckboxes({
  selected,
  tags,
}: {
  selected: string[]
  tags: AdminPageData["tags"]
}) {
  return (
    <fieldset className="grid gap-3">
      <legend className="text-sm font-medium">Tags</legend>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {tags.map((tag) => (
          <label key={tag.id} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="tagSlugs"
              value={tag.slug}
              defaultChecked={selected.includes(tag.slug)}
            />
            {tag.name}
            <span className="text-xs text-muted-foreground">({tag.kind})</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

function BooleanFields({
  featured,
  published,
}: {
  featured: boolean
  published: boolean
}) {
  return (
    <div className="flex flex-wrap gap-4">
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isFeatured" defaultChecked={featured} />
        Featured
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isPublished" defaultChecked={published} />
        Published
      </label>
    </div>
  )
}

function FormActions({
  isPending,
  message,
  onDelete,
  submitLabel,
}: {
  isPending: boolean
  message?: string
  onDelete?: () => Promise<void>
  submitLabel: string
}) {
  return (
    <div className="flex flex-col gap-3">
      {message && (
        <Alert>
          <AlertTitle>Admin update</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <IconLoader2 className="animate-spin" data-icon="inline-start" />
          ) : (
            <IconPlus data-icon="inline-start" />
          )}
          {submitLabel}
        </Button>
        {onDelete && (
          <Button
            type="button"
            variant="destructive"
            disabled={isPending}
            onClick={() => void onDelete()}
          >
            <IconTrash data-icon="inline-start" />
            Delete
          </Button>
        )}
      </div>
    </div>
  )
}

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim()
}

function getNullableString(formData: FormData, key: string) {
  const value = getString(formData, key)
  return value.length ? value : null
}

function getNullableNumber(formData: FormData, key: string) {
  const value = getString(formData, key)
  return value ? Number(value) : null
}

type FormState =
  | { status: "idle" | "pending" }
  | { status: "error" | "success"; message: string }

const inputClassName =
  "h-9 w-full rounded-3xl border border-input bg-background px-3 text-sm"
const textareaClassName =
  "min-h-24 w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm"
