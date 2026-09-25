import { createFileRoute, Outlet } from "@tanstack/react-router";

/**
 * Layout route for /nations/$slug — renders the Outlet.
 *
 * The actual club page is at /nations/$slug (index) → nations.$slug.index.tsx.
 * The thread page is at /nations/$slug/$threadId → nations.$slug.$threadId.tsx.
 */
export const Route = createFileRoute("/nations/$slug")({
  component: () => <Outlet />,
});