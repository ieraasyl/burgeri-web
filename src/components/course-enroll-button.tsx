import { IconBook2 } from "@tabler/icons-react"
import { Link } from "@tanstack/react-router"
import { useServerFn } from "@tanstack/react-start"
import { useState } from "react"

import { Button, buttonVariants } from "@/components/ui/button"
import { enrollCourse } from "@/lib/actions"
import type { CatalogCourse, ViewerState } from "@/lib/catalog"

export function CourseEnrollButton({
  course,
  redirectTo,
  size = "sm",
  viewer,
}: {
  course: Pick<CatalogCourse, "id" | "isEnrolled">
  redirectTo: string
  size?: "sm" | "lg"
  viewer: ViewerState
}) {
  const enrollCourseFn = useServerFn(enrollCourse)
  const [isEnrolled, setIsEnrolled] = useState(course.isEnrolled)
  const [isPending, setIsPending] = useState(false)

  if (!viewer.isSignedIn) {
    return (
      <Link
        to="/sign-in"
        search={{ redirect: redirectTo }}
        className={buttonVariants({ variant: "secondary", size })}
      >
        <IconBook2 data-icon="inline-start" />
        Enroll
      </Link>
    )
  }

  if (!viewer.onboardingCompleted) {
    return (
      <Link
        to="/onboarding"
        search={{ redirect: redirectTo }}
        className={buttonVariants({ variant: "secondary", size })}
      >
        <IconBook2 data-icon="inline-start" />
        Enroll
      </Link>
    )
  }

  return (
    <Button
      type="button"
      variant={isEnrolled ? "secondary" : "default"}
      size={size}
      disabled={isPending || isEnrolled}
      onClick={async () => {
        setIsPending(true)
        const result = await enrollCourseFn({ data: { courseId: course.id } })
        setIsPending(false)

        if (result.ok) {
          setIsEnrolled(true)
        }
      }}
    >
      <IconBook2 data-icon="inline-start" />
      {isEnrolled ? "Enrolled" : "Enroll"}
    </Button>
  )
}
