export interface CatalogTag {
  id: string
  slug: string
  name: string
  kind: string
  color: string | null
}

export interface CatalogOpportunity {
  id: string
  slug: string
  title: string
  summary: string
  description: string
  category: string
  format: string
  providerName: string
  location: string | null
  country: string | null
  city: string | null
  minGrade: number | null
  maxGrade: number | null
  deadlineAt: string
  startsAt: string | null
  endsAt: string | null
  applyUrl: string
  requirements: string[]
  tags: CatalogTag[]
  isSaved: boolean
  savedStatus: string | null
  deadlineLabel: string
  deadlineShortLabel: string
  gradeLabel: string
  durationLabel: string
}

export interface CatalogLessonPreview {
  id: string
  title: string
  durationMinutes: number | null
}

export interface CatalogLesson extends CatalogLessonPreview {
  slug: string
  summary: string | null
  content: string | null
  videoUrl: string | null
  materials: Array<{ title: string; url: string }>
  assignmentPrompt: string | null
  position: number
  isPreview: boolean
  quizCount: number
  progressStatus: string | null
  progressPercent: number
  quizScorePercent: number | null
  quizQuestions: CatalogQuizQuestion[]
}

export interface CatalogQuizQuestion {
  id: string
  type: string
  prompt: string
  options: Array<{
    id: string
    label: string
  }>
}

export interface CatalogCourse {
  id: string
  slug: string
  title: string
  summary: string
  description: string
  difficulty: string
  estimatedHours: number | null
  thumbnailUrl: string | null
  tags: CatalogTag[]
  isEnrolled: boolean
  enrollmentStatus: string | null
  progressPercent: number
  lessonCount: number
  previewLesson: CatalogLessonPreview
  totalMinutes: number
  durationLabel: string
}

export interface CatalogCourseDetail extends CatalogCourse {
  lessons: CatalogLesson[]
}

export interface HomeCatalogData {
  opportunities: CatalogOpportunity[]
  courses: CatalogCourse[]
  fields: CatalogTag[]
}

export interface ViewerState {
  userId?: string
  isSignedIn: boolean
  onboardingCompleted: boolean
  role: string | null
}

export interface OpportunityFilters {
  tag?: string[]
  category?: string[]
  format?: string[]
  grade?: number[]
  deadline?: Array<"30" | "90">
}

export interface CourseFilters {
  difficulty?: string[]
  tag?: string[]
}

export interface OpportunityFilterOptions {
  fields: CatalogTag[]
  categories: string[]
  formats: string[]
}

export interface CourseFilterOptions {
  subjects: CatalogTag[]
  difficulties: string[]
}

export interface OpportunityCatalogData {
  viewer: ViewerState
  opportunities: CatalogOpportunity[]
  totalCount: number
  filterOptions: OpportunityFilterOptions
}

export interface OpportunityDetailData {
  viewer: ViewerState
  opportunity: CatalogOpportunity | null
}

export interface CourseCatalogData {
  viewer: ViewerState
  courses: CatalogCourse[]
  totalCount: number
  filterOptions: CourseFilterOptions
}

export interface CourseDetailData {
  viewer: ViewerState
  course: CatalogCourseDetail | null
}

export interface StudentDashboardData {
  user: {
    id: string
    name: string
    email: string
  }
  profile: {
    grade: number | null
    role: string
    country: string
    onboardingCompleted: boolean
  }
  preferences: Array<{
    tagSlug: string
    tagName: string
    tagKind: string
    preferenceType: string
  }>
  savedOpportunities: CatalogOpportunity[]
  enrolledCourses: CatalogCourse[]
  upcomingDeadlines: CatalogOpportunity[]
  recommendedOpportunities: CatalogOpportunity[]
  recommendedCourses: CatalogCourse[]
}

const dateFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  year: "numeric",
})

const monthDayFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
})

const monthFormatter = new Intl.DateTimeFormat("en", { month: "short" })
const dayFormatter = new Intl.DateTimeFormat("en", { day: "numeric" })

export function formatMonthShort(value: string) {
  return monthFormatter.format(new Date(value))
}

export function formatDayOfMonth(value: string) {
  return dayFormatter.format(new Date(value))
}

export function formatDate(value?: string | null) {
  if (!value) {
    return "To be announced"
  }

  return dateFormatter.format(new Date(value))
}

export function formatShortDate(value: string) {
  return monthDayFormatter.format(new Date(value))
}

const DAY_MS = 86_400_000

export function formatDeadlineCountdown(value: string) {
  const days = Math.ceil((new Date(value).getTime() - Date.now()) / DAY_MS)

  return days <= 0 ? "Due today" : `${days} days left`
}

export function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export function formatCategory(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

export function formatFormat(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export function formatGradeRange(
  minGrade?: number | null,
  maxGrade?: number | null
) {
  if (minGrade && maxGrade) {
    return minGrade === maxGrade
      ? `Grade ${minGrade}`
      : `Grades ${minGrade}-${maxGrade}`
  }

  if (minGrade) {
    return `Grade ${minGrade}+`
  }

  if (maxGrade) {
    return `Up to grade ${maxGrade}`
  }

  return "All grades"
}

export function formatDuration(start?: string | null, end?: string | null) {
  if (!start || !end) {
    return "Dates announced after selection"
  }

  return `${formatShortDate(start)}-${formatShortDate(end)}`
}

export function formatCourseDuration(
  totalMinutes: number,
  estimatedHours?: number | null
) {
  if (totalMinutes > 0) {
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60

    if (hours && minutes) {
      return `${hours} hr ${minutes} min`
    }

    if (hours) {
      return `${hours} hr`
    }

    return `${minutes} min`
  }

  return estimatedHours ? `${estimatedHours} hr` : "Self-paced"
}
