import { createFileRoute, Outlet } from "@tanstack/react-router";

/**
 * Layout route for /garage — renders the Outlet.
 *
 *   /garage       → garage.index.tsx  (the feed)
 *   /garage/$id   → garage.$id.tsx    (post detail)
 */
export const Route = createFileRoute("/garage")({
  component: () => <Outlet />,
});