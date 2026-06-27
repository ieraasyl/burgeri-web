import {
  IconAlertCircle,
  IconCircleCheck,
  IconLoader2,
  IconMail,
  IconShieldCheck,
} from "@tabler/icons-react"
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
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { authClient, signIn, useSession } from "@/lib/auth-client"
import googleLogoUrl from "@/google.svg"

export const Route = createFileRoute("/sign-in")({
  validateSearch: (search): { redirect?: string } => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  component: SignInPage,
})

type AuthStep = "email" | "otp"

function SignInPage() {
  const search = Route.useSearch()
  const redirectTo = useMemo(
    () => getSafeRedirect(search.redirect),
    [search.redirect]
  )
  const [step, setStep] = useState<AuthStep>("email")
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [otp, setOtp] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [isSendingOtp, setIsSendingOtp] = useState(false)
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false)
  const [isGooglePending, setIsGooglePending] = useState(false)

  async function handleRequestOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const normalizedEmail = email.trim().toLowerCase()
    const trimmedName = name.trim()

    setError(null)
    setNotice(null)

    if (!normalizedEmail) {
      setError("Enter the email address you want to use.")
      return
    }

    setIsSendingOtp(true)

    const result = await authClient.emailOtp.sendVerificationOtp({
      email: normalizedEmail,
      type: "sign-in",
    })

    setIsSendingOtp(false)

    if (result.error) {
      setError(getAuthErrorMessage(result.error, "Could not send the code."))
      return
    }

    setEmail(normalizedEmail)
    setName(trimmedName)
    setStep("otp")
    setNotice(`Code sent to ${normalizedEmail}.`)
  }

  async function handleVerifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const normalizedEmail = email.trim().toLowerCase()
    const code = otp.replace(/\s+/g, "")
    const trimmedName = name.trim()

    setError(null)
    setNotice(null)

    if (code.length < 6) {
      setError("Enter the 6-digit code from your email.")
      return
    }

    setIsVerifyingOtp(true)

    const result = await signIn.emailOtp({
      email: normalizedEmail,
      otp: code,
      ...(trimmedName && { name: trimmedName }),
    })

    setIsVerifyingOtp(false)

    if (result.error) {
      setError(getAuthErrorMessage(result.error, "That code did not work."))
      return
    }

    window.location.assign(redirectTo)
  }

  async function handleGoogleSignIn() {
    setError(null)
    setNotice(null)
    setIsGooglePending(true)

    const result = await signIn.social({
      provider: "google",
      callbackURL: redirectTo,
      errorCallbackURL: "/sign-in",
    })

    if (result.error) {
      setIsGooglePending(false)
      setError(
        getAuthErrorMessage(
          result.error,
          "Google sign-in is not available right now."
        )
      )
    }
  }

  const isBusy = isSendingOtp || isVerifyingOtp || isGooglePending

  return (
    <>
      <SessionRedirect redirectTo={redirectTo} />
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-8 sm:px-6 lg:min-h-[calc(100svh-8rem)] lg:grid-cols-[minmax(0,1fr)_29rem] lg:px-8 lg:py-12">
        <section className="flex min-w-0 flex-col justify-center">
          <h1 className="max-w-3xl font-heading text-3xl font-semibold text-balance sm:text-4xl lg:text-5xl">
            Sign in to the Burgeri write-off workspace.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground">
            Sign in with a one-time code. New accounts are created after the
            code is confirmed.
          </p>

          <dl className="mt-10 hidden max-w-md gap-5 lg:grid">
            {[
              ["01", "Review photo-backed write-offs"],
              ["02", "Approve or reject in one queue"],
              ["03", "Push approved acts to iiko"],
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
              <CardTitle>Sign in</CardTitle>
              <CardDescription>
                Use your work email to reach the write-off workspace.
              </CardDescription>
            </CardHeader>

            <CardContent className="flex flex-col gap-5">
              {error && (
                <Alert variant="destructive">
                  <IconAlertCircle />
                  <AlertTitle>Sign-in failed</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {notice && (
                <Alert>
                  <IconCircleCheck />
                  <AlertTitle>Check your inbox</AlertTitle>
                  <AlertDescription>{notice}</AlertDescription>
                </Alert>
              )}

              {step === "email" ? (
                <form onSubmit={handleRequestOtp}>
                  <FieldGroup>
                    <Field data-invalid={Boolean(error)}>
                      <FieldLabel htmlFor="sign-in-email">Email</FieldLabel>
                      <Input
                        id="sign-in-email"
                        type="email"
                        autoComplete="email"
                        inputMode="email"
                        value={email}
                        disabled={isBusy}
                        aria-invalid={Boolean(error)}
                        placeholder="you@burgeri.kz"
                        onChange={(event) => setEmail(event.target.value)}
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="sign-in-name">
                        Name{" "}
                        <span className="text-muted-foreground">
                          (optional)
                        </span>
                      </FieldLabel>
                      <Input
                        id="sign-in-name"
                        type="text"
                        autoComplete="name"
                        value={name}
                        disabled={isBusy}
                        placeholder="Aigerim Satbek"
                        onChange={(event) => setName(event.target.value)}
                      />
                      <FieldDescription>
                        Used only when this email is new to Burgeri Ops.
                      </FieldDescription>
                    </Field>
                    <Button type="submit" disabled={isBusy}>
                      {isSendingOtp ? (
                        <IconLoader2
                          className="animate-spin"
                          data-icon="inline-start"
                        />
                      ) : (
                        <IconMail data-icon="inline-start" />
                      )}
                      Send code
                    </Button>
                  </FieldGroup>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp}>
                  <FieldGroup>
                    <Field data-invalid={Boolean(error)}>
                      <FieldLabel htmlFor="sign-in-otp">Email code</FieldLabel>
                      <Input
                        id="sign-in-otp"
                        type="text"
                        autoComplete="one-time-code"
                        inputMode="numeric"
                        maxLength={6}
                        value={otp}
                        disabled={isBusy}
                        aria-invalid={Boolean(error)}
                        className="font-heading text-lg tracking-[0.18em]"
                        placeholder="000000"
                        onChange={(event) =>
                          setOtp(
                            event.target.value.replace(/\D/g, "").slice(0, 6)
                          )
                        }
                      />
                      <FieldDescription>{email}</FieldDescription>
                      {error && <FieldError>{error}</FieldError>}
                    </Field>
                    <Button type="submit" disabled={isBusy}>
                      {isVerifyingOtp ? (
                        <IconLoader2
                          className="animate-spin"
                          data-icon="inline-start"
                        />
                      ) : (
                        <IconShieldCheck data-icon="inline-start" />
                      )}
                      Continue
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={isBusy}
                      onClick={() => {
                        setStep("email")
                        setOtp("")
                        setError(null)
                        setNotice(null)
                      }}
                    >
                      Use a different email
                    </Button>
                  </FieldGroup>
                </form>
              )}

              <FieldSeparator>or</FieldSeparator>

              <Button
                type="button"
                variant="outline"
                disabled={isBusy}
                onClick={handleGoogleSignIn}
              >
                {isGooglePending ? (
                  <IconLoader2
                    className="animate-spin"
                    data-icon="inline-start"
                  />
                ) : (
                  <img
                    src={googleLogoUrl}
                    alt=""
                    aria-hidden="true"
                    data-icon="inline-start"
                    className="size-4"
                  />
                )}
                Continue with Google
              </Button>
            </CardContent>

            <CardFooter className="border-t">
              <p className="text-sm leading-6 text-muted-foreground">
                By continuing, use this account only for your own restaurant
                write-off submissions and reviews.
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
