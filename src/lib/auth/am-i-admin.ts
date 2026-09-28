import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "./middleware";

/**
 * Return whether the current caller is an admin.
 *
 * Small, cheap endpoint used by the header nav to decide whether to render
 * the "Desk" link. Uses authMiddleware so unauthenticated callers get a 401
 * (which the client interprets as "not admin").
 */

export type AmIAdminResult = { isAdmin: boolean };

export const amIAdmin = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<AmIAdminResult> => {
    const sql = await getSql();
    const rows = await sql<{ role: string | null }>`
      select role from "user" where id = ${context.userId} limit 1
    `;
    return { isAdmin: rows[0]?.role === "admin" };
  });