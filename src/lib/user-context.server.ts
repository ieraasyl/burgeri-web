import "@tanstack/react-start/server-only"

import { redirect } from "@tanstack/react-router"
import { getRequest } from "@tanstack/react-start/server"

import { getStudentProfile } from "@/db/queries"
import { getSession } from "@/lib/auth.server"
import { getServerDb } from "@/lib/db.server"

export interface CurrentUserContext {
  session: NonNullable<Awaited<ReturnType<typeof getSession>>>
  user: NonNullable<Awaited<ReturnType<typeof getSession>>>["user"]
  profile: Awaited<ReturnType<typeof getStudentProfile>>
}

export async function getCurrentUserContext(): Promise<CurrentUserContext | null> {
  const request = getRequest()
  const session = await getSession(request)

  if (!session) {
    return null
  }

  const db = getServerDb()
  const profile = await getStudentProfile(db, session.user.id)

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

export async function requireCompletedProfile(redirectTo = getCurrentPath()) {
  const context = await requireUser(redirectTo)

  if (!context.profile?.onboardingCompleted) {
    throw redirect({
      to: "/onboarding",
      search: {
        redirect: redirectTo,
      },
    })
  }

  return context
}

export async function requireAdmin(redirectTo = getCurrentPath()) {
  const context = await requireUser(redirectTo)

  if (context.profile?.role !== "admin") {
    throw redirect({
      to: context.profile?.onboardingCompleted ? "/account" : "/onboarding",
      search: context.profile?.onboardingCompleted
        ? undefined
        : { redirect: "/admin" },
    })
  }

  return context
}

export async function requireOnboardingUser() {
  return requireUser("/onboarding")
}

export async function getViewerState() {
  const context = await getCurrentUserContext()

  return {
    userId: context?.user.id,
    isSignedIn: Boolean(context),
    onboardingCompleted: Boolean(context?.profile?.onboardingCompleted),
    role: context?.profile?.role ?? null,
  }
}

function getCurrentPath() {
  const url = new URL(getRequest().url)
  return `${url.pathname}${url.search}`
}
