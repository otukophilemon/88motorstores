import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";

/**
 * Notification server functions.
 *
 * Two kinds of notifications share one table:
 *
 *   1. Thread reply notifications  — user_id + post_id + reply_id set,
 *      target_user_id null. Sent to every participant in a thread.
 *
 *   2. Admin notifications         — target_user_id set, user_id and post_id
 *      null. Sent to every user with role='admin' when a seller submits a
 *      listing, a buyer requests an intro, etc.
 *
 * Reads return both kinds for the current user (as a participant OR as a
 * target). Writes go through either notifyThreadParticipants (from
 * clubs/server.ts) or notifyAdmins (from listings/enquiries/account servers).
 */

// ─── Types ──────────────────────────────────────────────────────────────

export type Notification = {
  id: string;
  kind: string;
  postId: string | null;
  replyId: string | null;
  actorName: string;
  threadTitle: string;
  clubSlug: string | null;
  link: string | null;
  message: string | null;
  createdAt: string;
  readAt: string | null;
};

export type UnreadCount = { count: number };

export type AdminNotificationKind =
  | "listing_new"
  | "enquiry_new"
  | "contact_new"
  | "upgrade_new";

// ─── Helpers ────────────────────────────────────────────────────────────

function nid() {
  return `notif_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

function iso(v: string | Date): string {
  return typeof v === "string" ? v : v.toISOString();
}

function isoOrNull(v: string | Date | null | undefined): string | null {
  if (v == null) return null;
  return typeof v === "string" ? v : v.toISOString();
}

type Row = {
  id: string;
  kind: string;
  post_id: string | null;
  reply_id: string | null;
  actor_name: string;
  thread_title: string;
  club_slug: string | null;
  link: string | null;
  message: string | null;
  created_at: string | Date;
  read_at: string | Date | null;
};

function toNotification(r: Row): Notification {
  return {
    id: r.id,
    kind: r.kind,
    postId: r.post_id,
    replyId: r.reply_id,
    actorName: r.actor_name,
    threadTitle: r.thread_title,
    clubSlug: r.club_slug,
    link: r.link,
    message: r.message,
    createdAt: iso(r.created_at),
    readAt: isoOrNull(r.read_at),
  };
}

// ─── getMyNotifications ─────────────────────────────────────────────────

export const getMyNotifications = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<Notification[]> => {
    const sql = await getSql();
    const rows = await sql<Row>`
      select
        id, kind, post_id, reply_id, actor_name, thread_title, club_slug,
        link, message, created_at, read_at
      from notifications
      where user_id = ${context.userId}
         or target_user_id = ${context.userId}
      order by created_at desc
      limit 100
    `;
    return rows.map(toNotification);
  });

// ─── getUnreadCount ─────────────────────────────────────────────────────

export const getUnreadCount = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<UnreadCount> => {
    const sql = await getSql();
    const rows = await sql<{ count: string | number }>`
      select count(*) as count from notifications
      where (user_id = ${context.userId} or target_user_id = ${context.userId})
        and read_at is null
    `;
    return { count: Number(rows[0]?.count ?? 0) };
  });

// ─── markNotificationRead ───────────────────────────────────────────────

export const markNotificationRead = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { id: string }) => {
    if (!data?.id || typeof data.id !== "string") throw new Error("Missing id.");
    return { id: data.id };
  })
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    const sql = await getSql();
    await sql`
      update notifications
      set read_at = now()
      where id = ${data.id}
        and (user_id = ${context.userId} or target_user_id = ${context.userId})
        and read_at is null
    `;
    return { ok: true };
  });

// ─── markAllNotificationsRead ───────────────────────────────────────────

export const markAllNotificationsRead = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<{ ok: boolean }> => {
    const sql = await getSql();
    await sql`
      update notifications
      set read_at = now()
      where (user_id = ${context.userId} or target_user_id = ${context.userId})
        and read_at is null
    `;
    return { ok: true };
  });

// ─── notifyThreadParticipants ───────────────────────────────────────────

/**
 * Create notifications for everyone who participated in a thread, EXCEPT
 * the person who just replied.
 */
export async function notifyThreadParticipants(args: {
  postId: string;
  replyId: string;
  actorUserId: string;
  actorName: string;
  threadTitle: string;
  clubSlug: string;
}): Promise<void> {
  const sql = await getSql();
  const rows = await sql<{ user_id: string }>`
    select distinct user_id from (
      select user_id from posts where id = ${args.postId}
      union
      select user_id from replies where post_id = ${args.postId}
    ) t
    where user_id is not null and user_id <> ${args.actorUserId}
  `;

  if (rows.length === 0) return;

  for (const row of rows) {
    const id = nid();
    await sql`
      insert into notifications (
        id, user_id, kind, post_id, reply_id, actor_name, thread_title, club_slug
      ) values (
        ${id}, ${row.user_id}, 'reply', ${args.postId}, ${args.replyId},
        ${args.actorName}, ${args.threadTitle}, ${args.clubSlug}
      )
    `;
  }
}

// ─── notifyAdmins ───────────────────────────────────────────────────────

/**
 * Create one notification row for each admin user.
 *
 * Admin notifications set target_user_id (the recipient) and leave
 * user_id + post_id null. A `link` points to /desk or a specific section.
 * `message` is a short human-readable summary.
 *
 * Wrapped in try/catch at call sites so a notification failure never
 * blocks the primary action (listing submit, enquiry, etc.).
 */
export async function notifyAdmins(args: {
  kind: AdminNotificationKind;
  message: string;
  link: string;
}): Promise<void> {
  const sql = await getSql();

  const admins = await sql<{ id: string }>`
    select id from "user" where role = 'admin'
  `;
  if (admins.length === 0) return;

  const now = new Date().toISOString();
  for (const admin of admins) {
    const id = nid();
    await sql`
      insert into notifications (
        id, user_id, target_user_id, kind, post_id, reply_id,
        actor_name, thread_title, club_slug, link, message, created_at
      ) values (
        ${id}, null, ${admin.id}, ${args.kind}, null, null,
        'System', '', null, ${args.link}, ${args.message}, ${now}
      )
    `;
  }
}