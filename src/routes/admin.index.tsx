import { IconLoader2, IconUserPlus } from "@tabler/icons-react"
import { createFileRoute, useRouter } from "@tanstack/react-router"
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

export const Route = createFileRoute("/admin/")({
  loader: () => getStaff(),
  component: AdminStaffPage,
})

function AdminStaffPage() {
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
    setNotice("Учётная запись сотрудника создана.")
    await router.invalidate()
    setStaff((await getStaff()).staff)
  }

  async function handleSetPassword(userId: string) {
    if (passwordValue.length < 8) {
      setError("Пароль должен содержать не менее 8 символов.")
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
    setNotice("Пароль обновлён.")
    await router.invalidate()
    setStaff((await getStaff()).staff)
  }

  return (
    <>
      <section className="border-b pb-6">
        <h2 className="font-heading text-2xl font-semibold">
          Персонал и пароли
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Создавайте учётные записи сотрудников, сбрасывайте пароли и назначайте
          права ревьюера.
        </p>
      </section>

      {error && (
        <Alert variant="destructive" className="mt-6">
          <AlertTitle>Что-то пошло не так</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {notice && (
        <Alert className="mt-6">
          <AlertTitle>Готово</AlertTitle>
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      )}

      <section className="mt-6 rounded-2xl border bg-card p-5">
        <div className="flex items-center gap-2">
          <IconUserPlus className="text-primary" />
          <h3 className="font-heading text-lg font-semibold">
            Создать учётную запись сотрудника
          </h3>
        </div>
        <form
          className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          onSubmit={handleCreate}
        >
          <LabelledInput label="Имя" name="name" placeholder="Айгерим Сатбек" />
          <LabelledInput
            label="Табельный номер"
            name="employeeId"
            placeholder="EMP-1001"
            autoCapitalize="characters"
          />
          <LabelledInput
            label="Пароль"
            name="password"
            type="password"
            placeholder="Не менее 8 символов"
          />
          <label className="grid min-w-0 gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              Точка продаж по умолчанию
            </span>
            <select
              name="defaultPointOfSaleId"
              defaultValue=""
              className="h-9 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
            >
              <option value="">Не указана</option>
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
              Создать сотрудника
            </Button>
          </div>
        </form>
      </section>

      <div className="mt-6 overflow-x-auto rounded-2xl border">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b bg-muted/40">
            <tr>
              <th className="px-4 py-3 font-medium">Имя</th>
              <th className="px-4 py-3 font-medium">Вход</th>
              <th className="px-4 py-3 font-medium">Роль</th>
              <th className="px-4 py-3 font-medium">Пароль</th>
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
                    {member.employeeId ?? "Нет табельного номера"} ·{" "}
                    {member.hasLogin ? "Пароль установлен" : "Пароль не задан"}
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
                        placeholder="Новый пароль"
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
                          Сохранить
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setPasswordOpenId(null)
                            setPasswordValue("")
                          }}
                        >
                          Отмена
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
                      {member.hasLogin ? "Сбросить пароль" : "Задать пароль"}
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

function LabelledInput({
  label,
  ...props
}: { label: string } & React.ComponentProps<typeof Input>) {
  return (
    <label className="grid min-w-0 gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <Input required className="w-full min-w-0" {...props} />
    </label>
  )
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ru-KZ", { dateStyle: "medium" }).format(
    new Date(value)
  )
}
