import { createFileRoute, Outlet } from "@tanstack/react-router";

/**
 * Layout for /account — routes render inside the Outlet.
 *
 *   /account          → account.index.tsx  (profile overview)
 *   /account/upgrade  → account.upgrade.tsx (upgrade form)
 */
export const Route = createFileRoute("/account")({
  component: () => <Outlet />,
});