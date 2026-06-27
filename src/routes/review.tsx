import {
  IconChartBar,
  IconHistory,
  IconListCheck,
  IconUsersGroup,
} from "@tabler/icons-react"
import { Link, Outlet, createFileRoute } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"

import { cn } from "@/lib/utils"

const getReviewerNav = createServerFn({ method: "GET" }).handler(async () => {
  const { requireReviewer } = await import("@/lib/user-context.server")
  const context = await requireReviewer("/review/write-offs")
  return { role: context.profile.role }
})

export const Route = createFileRoute("/review")({
  loader: () => getReviewerNav(),
  component: ReviewLayout,
})

const tabs = [
  { to: "/review/write-offs", label: "Очередь", icon: IconListCheck },
  { to: "/review/history", label: "История", icon: IconHistory },
  { to: "/review/analytics", label: "Аналитика", icon: IconChartBar },
] as const

function ReviewLayout() {
  const { role } = Route.useLoaderData()

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="border-b pb-6">
        <div>
          <p className="text-sm font-medium text-primary">
            Рабочее место ревьюера
          </p>
          <h1 className="mt-2 font-heading text-4xl font-semibold text-balance">
            Контроль списаний
          </h1>
          <p className="mt-3 max-w-2xl leading-7 text-muted-foreground">
            Проверяйте доказательства, одобряйте обоснованные списания и
            отправляйте одобренные акты в iiko.
          </p>
        </div>
      </section>

      <nav className="mt-6 flex flex-wrap gap-1">
        {tabs.map((tab) => (
          <Link
            key={tab.to}
            to={tab.to}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
            )}
            activeProps={{
              className:
                "border-primary bg-primary text-primary-foreground hover:bg-primary",
            }}
            inactiveProps={{ className: "text-muted-foreground" }}
          >
            <tab.icon className="size-4" />
            {tab.label}
          </Link>
        ))}
        {role === "admin" && (
          <Link
            to="/admin"
            className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
          >
            <IconUsersGroup className="size-4" />
            Администрирование
          </Link>
        )}
      </nav>

      <div className="mt-8">
        <Outlet />
      </div>
    </div>
  )
}
