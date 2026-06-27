import { IconArrowLeft, IconLoader2, IconUserPlus } from "@tabler/icons-react"
import { Link, createFileRoute, useRouter } from "@tanstack/react-router"
import { createServerFn, useServerFn } from "@tanstack/react-start"
import { useState } from "react"
import type { FormEvent } from "react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  createEmployee,
  setEmployeePassword,
  setStaffRole,
} from "@/lib/actions"
import { userRoleLabels } from "@/lib/write-offs"
import type { UserRole } from "@/lib/write-offs"

const roleOptions = Object.keys(userRoleLabels) as UserRole[]

const getStaff = createServerFn({ method: "GET" }).handler(async () => {
  const { getStaffDirectoryData } = await import("@/lib/write-offs.server")
  return getStaffDirectoryData()
})

export const Route = createFileRoute("/admin")({
  loader: () => getStaff(),
  component: AdminPage,
})

function AdminPage() {
  const initial = Route.useLoaderData()
  const router = useRouter()
  const updateRole = useServerFn(setStaffRole)
  const createEmployeeFn = useServerFn(createEmployee)
  const setPasswordFn = useServerFn(setEmployeePassword)

  const [staff, setStaff] = useState(initial.staff)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")

  const [creating, setCreating] = useState(false)
  const [passwordOpenId, setPasswordOpenId] = useState<string | null>(null)
  const [passwordValue, setPasswordValue] = useState("")
  const [passwordSaving, setPasswordSaving] = useState(false)

  async function handleRoleChange(userId: string, role: UserRole) {
    const previous = staff
    setError("")
    setNotice("")
    setPendingId(userId)
    setStaff((current) =>
      current.map((row) => (row.id === userId ? { ...row, role } : row))
    )
    const result = await updateRole({ data: { userId, role } })
    setPendingId(null)
    if (!result.ok) {
      setStaff(previous)
      setError(result.message)
    }
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    setError("")
    setNotice("")
    setCreating(true)
    const result = await createEmployeeFn({
      data: {
        name: String(data.get("name")),
        employeeId: String(data.get("employeeId")),
        password: String(data.get("password")),
        defaultPointOfSaleId: String(data.get("defaultPointOfSaleId") || ""),
      },
    })
    setCreating(false)
    if (!result.ok) {
      setError(result.message)
      return
    }
    form.reset()
    setNotice("Employee login created.")
    await router.invalidate()
    setStaff((await getStaff()).staff)
  }

  async function handleSetPassword(userId: string) {
    if (passwordValue.length < 8) {
      setError("Password must be at least 8 characters.")
      return
    }
    setError("")
    setNotice("")
    setPasswordSaving(true)
    const result = await setPasswordFn({
      data: { userId, password: passwordValue },
    })
    setPasswordSaving(false)
    if (!result.ok) {
      setError(result.message)
      return
    }
    setPasswordOpenId(null)
    setPasswordValue("")
    setNotice("Password updated.")
    await router.invalidate()
    setStaff((await getStaff()).staff)
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        to="/review/write-offs"
        className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <IconArrowLeft className="size-4" />
        Reviewer workspace
      </Link>

      <section className="mt-4 border-b pb-6">
        <p className="text-sm font-medium text-primary">Admin</p>
        <h1 className="mt-2 font-heading text-4xl font-semibold text-balance">
          Staff & password logins
        </h1>
        <p className="mt-3 max-w-2xl leading-7 text-muted-foreground">
          Create employee accounts, reset staff passwords, and grant reviewer
          access.
        </p>
      </section>

      {error && (
        <Alert variant="destructive" className="mt-6">
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {notice && (
        <Alert className="mt-6">
          <AlertTitle>Done</AlertTitle>
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      )}

      <section className="mt-6 rounded-2xl border bg-card p-5">
        <div className="flex items-center gap-2">
          <IconUserPlus className="text-primary" />
          <h2 className="font-heading text-lg font-semibold">
            Create employee login
          </h2>
        </div>
        <form
          className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          onSubmit={handleCreate}
        >
          <LabelledInput
            label="Name"
            name="name"
            placeholder="Aigerim Satbek"
          />
          <LabelledInput
            label="Табельный номер"
            name="employeeId"
            placeholder="EMP-1001"
            autoCapitalize="characters"
          />
          <LabelledInput
            label="Password"
            name="password"
            type="password"
            placeholder="At least 8 characters"
          />
          <label className="grid gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              Default point of sale
            </span>
            <select
              name="defaultPointOfSaleId"
              defaultValue=""
              className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
            >
              <option value="">Not set</option>
              {initial.pointsOfSale.map((pos) => (
                <option key={pos.id} value={pos.id}>
                  {pos.name}
                </option>
              ))}
            </select>
          </label>
          <div className="sm:col-span-2 lg:col-span-4">
            <Button type="submit" disabled={creating}>
              {creating ? (
                <IconLoader2
                  className="animate-spin"
                  data-icon="inline-start"
                />
              ) : (
                <IconUserPlus data-icon="inline-start" />
              )}
              Create employee
            </Button>
          </div>
        </form>
      </section>

      <div className="mt-6 overflow-x-auto rounded-2xl border">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b bg-muted/40">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Login</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Password</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((member) => (
              <tr
                key={member.id}
                className="border-b align-top last:border-0 hover:bg-muted/20"
              >
                <td className="px-4 py-3">
                  <p className="font-medium">{member.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(member.createdAt)}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <p>{member.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {member.employeeId ?? "No employee id"} ·{" "}
                    {member.hasLogin ? "Password active" : "No password"}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <select
                      value={member.role}
                      disabled={pendingId === member.id}
                      onChange={(event) =>
                        handleRoleChange(
                          member.id,
                          event.target.value as UserRole
                        )
                      }
                      className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
                    >
                      {roleOptions.map((role) => (
                        <option key={role} value={role}>
                          {userRoleLabels[role]}
                        </option>
                      ))}
                    </select>
                    {pendingId === member.id && (
                      <IconLoader2 className="size-4 animate-spin text-muted-foreground" />
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  {passwordOpenId === member.id ? (
                    <div className="flex flex-col gap-2">
                      <Input
                        type="password"
                        value={passwordValue}
                        autoFocus
                        placeholder="New password"
                        onChange={(event) =>
                          setPasswordValue(event.target.value)
                        }
                        className="h-9 w-44"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          disabled={passwordSaving}
                          onClick={() => handleSetPassword(member.id)}
                        >
                          {passwordSaving ? (
                            <IconLoader2 className="animate-spin" />
                          ) : null}
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setPasswordOpenId(null)
                            setPasswordValue("")
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setPasswordOpenId(member.id)
                        setPasswordValue("")
                      }}
                    >
                      {member.hasLogin ? "Reset password" : "Set password"}
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function LabelledInput({
  label,
  ...props
}: { label: string } & React.ComponentProps<typeof Input>) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <Input required {...props} />
    </label>
  )
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-KZ", { dateStyle: "medium" }).format(
    new Date(value)
  )
}
