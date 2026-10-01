import { useEffect, useState } from "react";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { useHydrated } from "@/lib/use-hydrated";
import { getMyRole, type AppRole } from "@/lib/auth/role";

/**
 * Client-side role hook.
 *
 * Returns `null` while loading OR before hydration, then the user's role
 * ("user" | "admin" | "owner"). Signed out -> `null`.
 *
 * Used for UI gating only (e.g. show Desk in the header). Actual access
 * control lives in server functions.
 *
 * NOTE: returns `null` before hydration so SSR and first client paint match.
 * Callers should treat `null` as "not yet known" and render the neutral
 * (non-admin) fallback until it resolves.
 */
export function useMyRole(): AppRole | null {
  const hydrated = useHydrated();
  const user = useCurrentUser();
  const [role, setRole] = useState<AppRole | null>(null);

  useEffect(() => {
    if (!hydrated) return;
    if (!user) {
      setRole(null);
      return;
    }
    let alive = true;
    void getMyRole()
      .then((r) => {
        if (alive) setRole(r);
      })
      .catch(() => {
        if (alive) setRole("user");
      });
    return () => {
      alive = false;
    };
  }, [hydrated, user?.id]);

  return role;
}

/** Convenience — true when the current user is admin or owner. */
export function useIsAdmin(): boolean {
  const role = useMyRole();
  return role === "admin" || role === "owner";
}