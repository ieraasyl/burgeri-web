import { IconHeart } from "@tabler/icons-react"
import { Link } from "@tanstack/react-router"
import { useServerFn } from "@tanstack/react-start"
import { useState } from "react"

import { Button, buttonVariants } from "@/components/ui/button"
import { toggleSavedOpportunity } from "@/lib/actions"
import type { CatalogOpportunity, ViewerState } from "@/lib/catalog"
import { cn } from "@/lib/utils"

export function SaveOpportunityButton({
  opportunity,
  redirectTo,
  size = "sm",
  viewer,
}: {
  opportunity: Pick<CatalogOpportunity, "id" | "isSaved">
  redirectTo: string
  size?: "sm" | "lg"
  viewer: ViewerState
}) {
  const toggleSavedOpportunityFn = useServerFn(toggleSavedOpportunity)
  const [isSaved, setIsSaved] = useState(opportunity.isSaved)
  const [isPending, setIsPending] = useState(false)

  if (!viewer.isSignedIn) {
    return (
      <Link
        to="/sign-in"
        search={{ redirect: redirectTo }}
        className={buttonVariants({ variant: "secondary", size })}
      >
        <IconHeart data-icon="inline-start" />
        Save
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
        <IconHeart data-icon="inline-start" />
        Save
      </Link>
    )
  }

  return (
    <Button
      type="button"
      variant="outline"
      size={size}
      disabled={isPending}
      onClick={async () => {
        setIsPending(true)
        const result = await toggleSavedOpportunityFn({
          data: { opportunityId: opportunity.id },
        })
        setIsPending(false)

        if (result.ok) {
          setIsSaved(result.data.saved)
        }
      }}
    >
      <IconHeart
        data-icon="inline-start"
        className={cn(isSaved && "fill-red-500 text-red-900")}
      />
      {isSaved ? "Saved" : "Save"}
    </Button>
  )
}
