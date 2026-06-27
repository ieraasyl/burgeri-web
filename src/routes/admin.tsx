import { IconArrowLeft, IconLoader2 } from "@tabler/icons-react"
import { Link, createFileRoute } from "@tanstack/react-router"
import { createServerFn, useServerFn } from "@tanstack/react-start"
import { useState } from "react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { setStaffRole } from "@/lib/actions"
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
  const updateRole = useServerFn(setStaffRole)
  const [staff, setStaff] = useState(initial.staff)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [error, setError] = useState("")

  async function handleRoleChange(userId: string, role: UserRole) {
    const previous = staff
    setError("")
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
          Staff & roles
        </h1>
        <p className="mt-3 max-w-2xl leading-7 text-muted-foreground">
          Grant reviewer access to the people who approve write-offs. Everyone
          else can submit from their restaurant.
        </p>
      </section>

      {error && (
        <Alert variant="destructive" className="mt-6">
          <AlertTitle>Could not update the role</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="mt-6 overflow-x-auto rounded-2xl border">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b bg-muted/40">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Joined</th>
              <th className="px-4 py-3 font-medium">Role</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((member) => (
              <tr
                key={member.id}
                className="border-b last:border-0 hover:bg-muted/20"
              >
                <td className="px-4 py-3 font-medium">{member.name}</td>
                <td className="px-4 py-3 break-all text-muted-foreground">
                  {member.email}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {formatDate(member.createdAt)}
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-KZ", { dateStyle: "medium" }).format(
    new Date(value)
  )
}
