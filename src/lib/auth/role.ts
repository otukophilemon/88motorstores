import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";

/**
 * Fetch the signed-in user's role from the DB.
 *
 * Better Auth's session does not carry the `role` column by default — it's on
 * the `user` table but not surfaced in the session payload. This server function
 * reads it directly so the client can gate UI (e.g. showing Desk in the header).
 *
 * Named `role.ts`, NOT `role.server.ts` — `createServerFn` already keeps the
 * body server-side; the `.server` suffix would trigger TanStack's import
 * protection and break client imports.
 */
export type AppRole = "user" | "admin" | "owner";

export const getMyRole = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<AppRole> => {
    const sql = await getSql();
    const rows = await sql<{ role: string | null }>`
      select role from "user" where id = ${context.userId} limit 1
    `;
    const r = rows[0]?.role;
    if (r === "admin" || r === "owner") return r;
    return "user";
  });