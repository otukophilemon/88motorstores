import { createMiddleware } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { requireUserId } from "./verify.server";

/**
 * Admin middleware for server functions — requires a signed-in user whose
 * `role` in the "user" table is 'admin'.
 *
 * Chain AFTER nothing — this middleware calls requireUserId itself, so call
 * sites use `.middleware([adminMiddleware])` instead of `authMiddleware`.
 *
 * Throws:
 * - `UnauthorizedError` (401) if not signed in
 * - `ForbiddenError` (403) if signed in but not an admin
 *
 * Provides on context:
 * - `userId` — the verified admin's id
 * - `role` — always "admin" on the success path
 */
export class ForbiddenError extends Error {
  readonly status = 403;
  constructor() {
    super("Forbidden");
    this.name = "ForbiddenError";
  }
}

export const adminMiddleware = createMiddleware({ type: "function" })
  .client(async ({ next }) => {
    // Live preview (partitioned iframe): forward the bearer token to the server.
    const { getBearerToken } = await import("./client");
    return next({ sendContext: { bearerToken: getBearerToken() ?? undefined } });
  })
  .server(async ({ next, context }) => {
    const { assertSameSiteRequest } = await import("./isolation.server");
    assertSameSiteRequest();

    const userId = await requireUserId(context.bearerToken);

    const sql = await getSql();
    const rows = await sql<{ role: string }>`
      select role from "user" where id = ${userId}
    `;

    const role = rows[0]?.role;
    if (role !== "admin") {
      throw new ForbiddenError();
    }

    return next({ context: { userId, role: "admin" as const } });
  });