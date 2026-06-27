import { Outlet, createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/review/write-offs")({
  component: () => <Outlet />,
})
