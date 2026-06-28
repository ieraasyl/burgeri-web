import { IconArrowLeft, IconBook2, IconUsersGroup } from "@tabler/icons-react"
import { Link, Outlet, createFileRoute } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"

import { cn } from "@/lib/utils"

const requireAdminAccess = createServerFn({ method: "GET" }).handler(
  async () => {
    const { requireAdmin } = await import("@/lib/user-context.server")
    await requireAdmin("/admin")
    return { ok: true }
  }
)

export const Route = createFileRoute("/admin")({
  beforeLoad: () => requireAdminAccess(),
  component: AdminLayout,
})

const tabs = [
  { to: "/admin", label: "Персонал", icon: IconUsersGroup, exact: true },
  { to: "/admin/catalog", label: "Справочники", icon: IconBook2, exact: false },
] as const

function AdminLayout() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        to="/review/write-offs"
        className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <IconArrowLeft className="size-4" />
        Рабочее место ревьюера
      </Link>

      <section className="mt-4 border-b pb-6">
        <p className="text-sm font-medium text-primary">Администрирование</p>
        <h1 className="mt-2 font-heading text-4xl font-semibold text-balance">
          Управление системой
        </h1>
        <p className="mt-3 max-w-2xl leading-7 text-muted-foreground">
          Настраивайте персонал, точки продаж и каталог продуктов для мобильного
          приложения.
        </p>
      </section>

      <nav className="mt-6 inline-flex w-fit max-w-full flex-wrap gap-1 rounded-full bg-muted p-1">
        {tabs.map((tab) => (
          <Link
            key={tab.to}
            to={tab.to}
            activeOptions={{ exact: tab.exact }}
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            )}
            activeProps={{
              className: "bg-background text-foreground shadow-sm",
            }}
          >
            <tab.icon className="size-4" />
            {tab.label}
          </Link>
        ))}
      </nav>

      <div className="mt-8">
        <Outlet />
      </div>
    </div>
  )
}
