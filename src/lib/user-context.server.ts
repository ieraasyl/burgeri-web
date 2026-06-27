import "@tanstack/react-start/server-only"

import { redirect } from "@tanstack/react-router"
import { getRequest } from "@tanstack/react-start/server"

import { ensureStaffProfile } from "@/db/queries"
import { getSession } from "@/lib/auth.server"
import { getServerDb } from "@/lib/db.server"

export interface CurrentUserContext {
  session: NonNullable<Awaited<ReturnType<typeof getSession>>>
  user: NonNullable<Awaited<ReturnType<typeof getSession>>>["user"]
  profile: NonNullable<Awaited<ReturnType<typeof ensureStaffProfile>>>
}

export async function getCurrentUserContext(): Promise<CurrentUserContext | null> {
  const request = getRequest()
  const session = await getSession(request)

  if (!session) {
    return null
  }

  const db = getServerDb()
  const profile = await ensureStaffProfile(db, session.user.id)

  if (!profile) {
    return null
  }

  return {
    session,
    user: session.user,
    profile,
  }
}

export async function requireUser(redirectTo = getCurrentPath()) {
  const context = await getCurrentUserContext()

  if (!context) {
    throw redirect({
      to: "/sign-in",
      search: {
        redirect: redirectTo,
      },
    })
  }

  return context
}

export async function requireReviewer(redirectTo = getCurrentPath()) {
  const context = await requireUser(redirectTo)

  if (context.profile.role !== "reviewer" && context.profile.role !== "admin") {
    throw redirect({ to: "/write-offs" })
  }

  return context
}

export async function requireAdmin(redirectTo = getCurrentPath()) {
  const context = await requireUser(redirectTo)

  if (context.profile.role !== "admin") {
    throw redirect({ to: "/write-offs" })
  }

  return context
}

export async function getViewerState() {
  const context = await getCurrentUserContext()

  return {
    userId: context?.user.id,
    isSignedIn: Boolean(context),
    role: context?.profile.role ?? null,
    isReviewer:
      context?.profile.role === "reviewer" || context?.profile.role === "admin",
    isAdmin: context?.profile.role === "admin",
  }
}

function getCurrentPath() {
  const url = new URL(getRequest().url)
  return `${url.pathname}${url.search}`
}
