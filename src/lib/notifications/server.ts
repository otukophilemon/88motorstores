import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";

/**
 * Notification server functions.
 *
 * Every function uses authMiddleware — notifications are strictly per-user.
 * A user can only see/modify their OWN notifications.
 *
 * Reading notifications is cheap. Creating them happens server-side when
 * someone replies to a thread (see notifyThreadParticipants below), which
 * is called from clubs/server.ts on createReply.
 */

// ─── Types ──────────────────────────────────────────────────────────────

export type Notification = {
  id: string;
  kind: string;
  postId: string;
  replyId: string | null;
  actorName: string;
  threadTitle: string;
  clubSlug: string | null;
  createdAt: string;
  readAt: string | null;
};

export type UnreadCount = {
  count: number;
};

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
  post_id: string;
  reply_id: string | null;
  actor_name: string;
  thread_title: string;
  club_slug: string | null;
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
      select id, kind, post_id, reply_id, actor_name, thread_title, club_slug,
             created_at, read_at
      from notifications
      where user_id = ${context.userId}
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
      where user_id = ${context.userId} and read_at is null
    `;
    return { count: Number(rows[0]?.count ?? 0) };
  });

// ─── markRead (single) ──────────────────────────────────────────────────

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
      where id = ${data.id} and user_id = ${context.userId} and read_at is null
    `;
    return { ok: true };
  });

// ─── markAllRead ────────────────────────────────────────────────────────

export const markAllNotificationsRead = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<{ ok: boolean }> => {
    const sql = await getSql();
    await sql`
      update notifications
      set read_at = now()
      where user_id = ${context.userId} and read_at is null
    `;
    return { ok: true };
  });

// ─── notifyThreadParticipants ───────────────────────────────────────────

/**
 * Create notifications for everyone who participated in a thread, EXCEPT
 * the person who just replied. Called from clubs/server.ts after a reply
 * is inserted.
 *
 * Recipients are the union of:
 *   - the thread author (posts.user_id)
 *   - everyone who has ever replied to this thread (replies.user_id)
 *
 * De-duplicated, then filtered to exclude the actor.
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