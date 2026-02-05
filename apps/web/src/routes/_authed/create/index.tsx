import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authed/create/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/_authed/create/"!</div>
}
