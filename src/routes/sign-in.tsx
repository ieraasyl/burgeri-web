import { IconAlertCircle, IconLoader2, IconLock } from "@tabler/icons-react"
import { createFileRoute } from "@tanstack/react-router"
import { useEffect, useMemo, useState } from "react"
import type { FormEvent } from "react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { BahandiMark } from "@/components/brand"
import { signIn, useSession } from "@/lib/auth-client"

export const Route = createFileRoute("/sign-in")({
  validateSearch: (search): { redirect?: string } => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  component: SignInPage,
})

function SignInPage() {
  const search = Route.useSearch()
  const redirectTo = useMemo(
    () => getSafeRedirect(search.redirect),
    [search.redirect]
  )
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSigningIn, setIsSigningIn] = useState(false)

  async function handleSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const normalizedEmail = email.trim().toLowerCase()
    const currentPassword = password

    setError(null)

    if (!normalizedEmail) {
      setError("Введите адрес электронной почты.")
      return
    }
    if (!currentPassword) {
      setError("Введите пароль.")
      return
    }

    setIsSigningIn(true)

    const result = await signIn.email({
      email: normalizedEmail,
      password: currentPassword,
    })

    setIsSigningIn(false)

    if (result.error) {
      setError(getAuthErrorMessage(result.error, "Проверьте email и пароль."))
      return
    }

    window.location.assign(redirectTo)
  }

  return (
    <>
      <SessionRedirect redirectTo={redirectTo} />
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-8 sm:px-6 lg:min-h-[calc(100svh-8rem)] lg:grid-cols-[minmax(0,1fr)_29rem] lg:px-8 lg:py-12">
        <section className="flex min-w-0 flex-col justify-center">
          <BahandiMark className="mb-6 size-12" />
          <h1 className="max-w-3xl font-heading text-3xl font-semibold text-balance sm:text-4xl lg:text-5xl">
            Войдите в рабочее место списаний Burgeri.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground">
            Войдите с паролем, выданным администратором Burgeri.
          </p>

          <dl className="mt-10 hidden max-w-md gap-5 lg:grid">
            {[
              ["01", "Проверка списаний с фото"],
              ["02", "Одобрение и отклонение в одной очереди"],
              ["03", "Отправка одобренных актов в iiko"],
            ].map(([marker, label]) => (
              <div key={marker} className="flex items-center gap-4">
                <span className="font-heading text-xl font-semibold text-primary/40 tabular-nums">
                  {marker}
                </span>
                <dt className="text-sm font-medium">{label}</dt>
              </div>
            ))}
          </dl>
        </section>

        <section className="flex items-center">
          <Card className="w-full rounded-md" size="sm">
            <CardHeader>
              <CardTitle>Вход</CardTitle>
              <CardDescription>
                Используйте рабочий email для доступа к списаниям.
              </CardDescription>
            </CardHeader>

            <CardContent className="flex flex-col gap-5">
              {error && (
                <Alert variant="destructive">
                  <IconAlertCircle />
                  <AlertTitle>Не удалось войти</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSignIn}>
                <FieldGroup>
                  <Field data-invalid={Boolean(error)}>
                    <FieldLabel htmlFor="sign-in-email">Email</FieldLabel>
                    <Input
                      id="sign-in-email"
                      type="email"
                      autoComplete="email"
                      inputMode="email"
                      value={email}
                      disabled={isSigningIn}
                      aria-invalid={Boolean(error)}
                      placeholder="you@burgeri.kz"
                      onChange={(event) => setEmail(event.target.value)}
                    />
                  </Field>
                  <Field data-invalid={Boolean(error)}>
                    <FieldLabel htmlFor="sign-in-password">Пароль</FieldLabel>
                    <Input
                      id="sign-in-password"
                      type="password"
                      autoComplete="current-password"
                      value={password}
                      disabled={isSigningIn}
                      aria-invalid={Boolean(error)}
                      placeholder="Ваш пароль"
                      onChange={(event) => setPassword(event.target.value)}
                    />
                  </Field>
                  <Button type="submit" disabled={isSigningIn}>
                    {isSigningIn ? (
                      <IconLoader2
                        className="animate-spin"
                        data-icon="inline-start"
                      />
                    ) : (
                      <IconLock data-icon="inline-start" />
                    )}
                    Войти
                  </Button>
                </FieldGroup>
              </form>
            </CardContent>

            <CardFooter className="border-t">
              <p className="text-sm leading-6 text-muted-foreground">
                Продолжая, используйте эту учётную запись только для подачи и
                проверки списаний в вашем ресторане.
              </p>
            </CardFooter>
          </Card>
        </section>
      </div>
    </>
  )
}

function SessionRedirect({ redirectTo }: { redirectTo: string }) {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) {
    return null
  }

  return <MountedSessionRedirect redirectTo={redirectTo} />
}

function MountedSessionRedirect({ redirectTo }: { redirectTo: string }) {
  const { data: session, isPending } = useSession()

  useEffect(() => {
    if (!isPending && session) {
      window.location.assign(redirectTo)
    }
  }, [isPending, redirectTo, session])

  return null
}

function getSafeRedirect(value: string | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/account"
  }

  if (value.startsWith("/api/") || value.startsWith("/sign-in")) {
    return "/account"
  }

  return value
}

function getAuthErrorMessage(error: unknown, fallback: string) {
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string" &&
    error.message
  ) {
    return error.message
  }

  return fallback
}
