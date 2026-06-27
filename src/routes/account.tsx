import {
  IconChartBar,
  IconClipboardCheck,
  IconLoader2,
  IconLogout,
  IconUsersGroup,
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
import { signOut } from "@/lib/auth-client"
import { userRoleLabels } from "@/lib/write-offs"

const getAccountData = createServerFn({ method: "GET" }).handler(async () => {
  const { requireUser } = await import("@/lib/user-context.server")
  const context = await requireUser("/account")

  return {
    name: context.user.name,
    email: context.user.email,
    role: context.profile.role,
  }
})

export const Route = createFileRoute("/account")({
  loader: () => getAccountData(),
  component: AccountPage,
})

function AccountPage() {
  const account = Route.useLoaderData()
  const [isSigningOut, setIsSigningOut] = useState(false)
  const isReviewer = account.role === "reviewer" || account.role === "admin"

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
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <Card className="rounded-2xl" size="sm">
        <CardHeader>
          <div className="flex size-14 items-center justify-center rounded-2xl bg-primary font-heading text-lg font-semibold text-primary-foreground">
            {getInitials(account.name, account.email)}
          </div>
          <CardTitle className="mt-3">{account.name}</CardTitle>
          <CardDescription className="break-all">
            {account.email}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <dl className="grid gap-4 sm:grid-cols-2">
            <ProfileRow label="Role" value={userRoleLabels[account.role]} />
          </dl>

          <div className="flex flex-wrap gap-2">
            {isReviewer && (
              <>
                <Link
                  to="/review/write-offs"
                  className={buttonVariants({ size: "sm" })}
                >
                  <IconClipboardCheck data-icon="inline-start" />
                  Review queue
                </Link>
                <Link
                  to="/review/analytics"
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  <IconChartBar data-icon="inline-start" />
                  Analytics
                </Link>
              </>
            )}
            {account.role === "admin" && (
              <Link
                to="/admin"
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                <IconUsersGroup data-icon="inline-start" />
                Staff & roles
              </Link>
            )}
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="self-start"
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
        </CardContent>
      </Card>
    </div>
  )
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 rounded-xl bg-muted p-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
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

  return initials || "BG"
}
