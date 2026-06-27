import { Outlet, createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/opportunities")({
  component: OpportunitiesLayout,
})

function OpportunitiesLayout() {
  return <Outlet />
}
