import { IconDeviceMobile, IconLoader2, IconLogout } from "@tabler/icons-react"
import { createFileRoute, redirect } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { signOut } from "@/lib/auth-client"

const getHomeState = createServerFn({ method: "GET" }).handler(async () => {
  const { getViewerState } = await import("@/lib/user-context.server")
  return getViewerState()
})

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const state = await getHomeState()
    if (!state.isSignedIn) {
      throw redirect({ to: "/sign-in" })
    }
    if (state.isReviewer) {
      throw redirect({ to: "/review/write-offs" })
    }
  },
  component: EmployeeNotice,
})

function EmployeeNotice() {
  const [isSigningOut, setIsSigningOut] = useState(false)

  async function handleSignOut() {
    setIsSigningOut(true)
    const result = await signOut()
    if (result.error) {
      setIsSigningOut(false)
      return
    }
    window.location.assign("/sign-in")
  }

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-xl flex-col items-center justify-center px-4 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
        <IconDeviceMobile className="size-7" />
      </span>
      <h1 className="mt-5 font-heading text-3xl font-semibold text-balance">
        This workspace is for reviewers
      </h1>
      <p className="mt-3 leading-7 text-muted-foreground">
        Employees submit product write-offs from the Burgeri mobile app. If you
        review write-offs, ask an administrator to grant you reviewer access.
      </p>
      <Button
        type="button"
        variant="outline"
        className="mt-6"
        disabled={isSigningOut}
        onClick={handleSignOut}
      >
        {isSigningOut ? (
          <IconLoader2 className="animate-spin" data-icon="inline-start" />
        ) : (
          <IconLogout data-icon="inline-start" />
        )}
        Sign out
      </Button>
    </div>
  )
}
