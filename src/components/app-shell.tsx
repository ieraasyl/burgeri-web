import {
  IconBurger,
  IconLoader2,
  IconLogout,
  IconMenu2,
  IconUserCircle,
  IconX,
} from "@tabler/icons-react"
import { Link } from "@tanstack/react-router"
import { useEffect, useState } from "react"
import type { ReactNode } from "react"

import { Button, buttonVariants } from "@/components/ui/button"
import { signOut, useSession } from "@/lib/auth-client"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/review/write-offs", label: "Очередь ревьюера" },
] as const

function useHideOnScroll() {
  const [isHidden, setIsHidden] = useState(false)

  useEffect(() => {
    // How far you must scroll in one direction before the header toggles.
    const THRESHOLD = 200
    let lastY = window.scrollY
    let accumulated = 0

    function onScroll() {
      const y = window.scrollY
      const delta = y - lastY
      lastY = y

      // Ignore jitter and rubber-band scrolling.
      if (Math.abs(delta) < 4) return

      // Reset the counter whenever the scroll direction flips.
      if ((accumulated > 0 && delta < 0) || (accumulated < 0 && delta > 0)) {
        accumulated = 0
      }
      accumulated += delta

      // Always reveal near the top.
      if (y <= 64) {
        setIsHidden(false)
        return
      }

      if (accumulated > THRESHOLD) {
        setIsHidden(true)
        accumulated = 0
      } else if (accumulated < -THRESHOLD) {
        setIsHidden(false)
        accumulated = 0
      }
    }

    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return isHidden
}

export function AppShell({ children }: { children: ReactNode }) {
  const isHeaderHidden = useHideOnScroll()

  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <header
        className={cn(
          "sticky top-0 z-50 border-b bg-background transition-transform duration-300",
          isHeaderHidden && "-translate-y-full"
        )}
      >
        <div className="mx-auto flex min-h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex min-w-0 items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
              <IconBurger className="size-5" />
            </span>
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="font-heading text-base font-semibold">
                Burgeri Ops
              </span>
              <span className="hidden text-xs text-muted-foreground sm:block">
                Быстрые и прозрачные списания
              </span>
            </span>
          </Link>

          <nav
            aria-label="Основная навигация"
            className="hidden items-center gap-1 md:flex"
          >
            {navItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className="rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-muted hover:text-foreground"
                activeProps={{ className: "bg-muted text-foreground" }}
                inactiveProps={{ className: "text-muted-foreground" }}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 md:flex">
              <AuthControls />
            </div>
            <MobileNav />
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col">{children}</main>

      <footer className="border-t">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-center gap-3 px-4 py-4 text-sm sm:px-6 lg:px-8">
          <Link
            to="/privacy"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Конфиденциальность
          </Link>
          <Link
            to="/terms"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Условия
          </Link>
        </div>
      </footer>
    </div>
  )
}

function MobileNav() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="md:hidden">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={isOpen ? "Закрыть меню" : "Открыть меню"}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        {isOpen ? <IconX /> : <IconMenu2 />}
      </Button>
      {isOpen && (
        <div className="absolute inset-x-0 top-full border-b bg-background shadow-sm">
          <nav
            aria-label="Мобильная навигация"
            className="mx-auto flex w-full max-w-7xl flex-col items-end gap-1 px-4 py-3 text-right sm:px-6"
          >
            {navItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className="rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-muted hover:text-foreground"
                activeProps={{ className: "bg-muted text-foreground" }}
                inactiveProps={{ className: "text-muted-foreground" }}
                onClick={() => setIsOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-2 flex w-full flex-col items-end gap-1 border-t pt-2">
              <MobileAuthControls onNavigate={() => setIsOpen(false)} />
            </div>
          </nav>
        </div>
      )}
    </div>
  )
}

function AuthControls() {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) {
    return <GuestAuthControls />
  }

  return <SessionAuthControls />
}

function SessionAuthControls() {
  const { data: session, isPending } = useSession()
  const [isSigningOut, setIsSigningOut] = useState(false)

  async function handleSignOut() {
    setIsSigningOut(true)

    const result = await signOut()

    if (result.error) {
      setIsSigningOut(false)
      return
    }

    window.location.assign("/")
  }

  if (isPending) {
    return (
      <span className="inline-flex h-8 items-center gap-1.5 rounded-4xl px-3 text-sm text-muted-foreground">
        <IconLoader2 className="animate-spin" />
        <span className="hidden sm:inline">Проверка…</span>
      </span>
    )
  }

  if (!session) {
    return <GuestAuthControls />
  }

  const displayName = session.user.name || session.user.email

  return (
    <>
      <Link
        to="/account"
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "max-w-44"
        )}
      >
        <IconUserCircle data-icon="inline-start" />
        <span className="truncate">{displayName}</span>
      </Link>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={isSigningOut}
        onClick={handleSignOut}
      >
        {isSigningOut ? (
          <IconLoader2 className="animate-spin" data-icon="inline-start" />
        ) : (
          <IconLogout data-icon="inline-start" />
        )}
        <span className="hidden sm:inline">Выйти</span>
      </Button>
    </>
  )
}

function GuestAuthControls() {
  return (
    <Link to="/sign-in" className={buttonVariants({ size: "sm" })}>
      Войти
    </Link>
  )
}

function MobileAuthControls({ onNavigate }: { onNavigate: () => void }) {
  const { data: session, isPending } = useSession()
  const [isSigningOut, setIsSigningOut] = useState(false)

  async function handleSignOut() {
    setIsSigningOut(true)

    const result = await signOut()

    if (result.error) {
      setIsSigningOut(false)
      return
    }

    window.location.assign("/")
  }

  if (isPending) {
    return (
      <span className="inline-flex flex-row-reverse items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
        <IconLoader2 className="animate-spin" />
        Проверка…
      </span>
    )
  }

  if (!session) {
    return (
      <Link
        to="/sign-in"
        className="flex flex-row-reverse items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        onClick={onNavigate}
      >
        <IconUserCircle />
        Войти
      </Link>
    )
  }

  const displayName = session.user.name || session.user.email

  return (
    <>
      <Link
        to="/account"
        className="flex flex-row-reverse items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        onClick={onNavigate}
      >
        <IconUserCircle />
        <span className="truncate">{displayName}</span>
      </Link>
      <button
        type="button"
        disabled={isSigningOut}
        onClick={handleSignOut}
        className="flex flex-row-reverse items-center gap-2 rounded-md px-3 py-2 text-right text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
      >
        {isSigningOut ? (
          <IconLoader2 className="animate-spin" />
        ) : (
          <IconLogout />
        )}
        Выйти
      </button>
    </>
  )
}
