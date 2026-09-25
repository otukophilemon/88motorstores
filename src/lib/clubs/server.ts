import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { notifyThreadParticipants } from "@/lib/notifications/server";

/**
 * Club server functions — threads and replies.
 *
 * Reads are public. Writes require a signed-in user. Polling on the client
 * (every 5s) simulates real-time by refetching threads/replies.
 */

// ─── Types ───────────────────────────────────────────────────────────────

export type ClubPost = {
  id: string;
  clubSlug: string;
  userId: string;
  authorName: string;
  title: string | null;
  body: string;
  pinned: boolean;
  replyCount: number;
  eventAt: string | null;
  eventLocation: string | null;
  createdAt: string;
};

export type ClubReply = {
  id: string;
  postId: string;
  userId: string;
  authorName: string;
  body: string;
  createdAt: string;
};

// ─── Helpers ─────────────────────────────────────────────────────────────

function nid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

function iso(v: string | Date): string {
  return typeof v === "string" ? v : v.toISOString();
}

function isoOrNull(v: string | Date | null | undefined): string | null {
  if (v == null) return null;
  return typeof v === "string" ? v : v.toISOString();
}

// ─── getClubThreads ──────────────────────────────────────────────────────

type ThreadRow = {
  id: string;
  club_slug: string | null;
  user_id: string;
  author_name: string;
  title: string | null;
  body: string;
  pinned: boolean;
  created_at: string | Date;
  event_at: string | Date | null;
  event_location: string | null;
  reply_count: string | number;
};

export const getClubThreads = createServerFn({ method: "POST" })
  .validator((data: { clubSlug: string }) => {
    if (!data?.clubSlug || typeof data.clubSlug !== "string") {
      throw new Error("Missing clubSlug.");
    }
    return { clubSlug: data.clubSlug };
  })
  .handler(async ({ data }): Promise<ClubPost[]> => {
    const sql = await getSql();
    const rows = await sql<ThreadRow>`
      select
        p.id, p.club_slug, p.user_id, p.author_name, p.title, p.body,
        p.pinned, p.created_at, p.event_at, p.event_location,
        (select count(*) from replies r where r.post_id = p.id) as reply_count
      from posts p
      where p.club_slug = ${data.clubSlug}
      order by
        case when p.event_at is not null and p.event_at >= now() then 0 else 1 end,
        p.event_at asc nulls last,
        p.pinned desc,
        p.created_at desc
      limit 100
    `;
    return rows.map((r) => ({
      id: r.id,
      clubSlug: r.club_slug ?? "",
      userId: r.user_id,
      authorName: r.author_name,
      title: r.title,
      body: r.body,
      pinned: r.pinned,
      replyCount: Number(r.reply_count),
      eventAt: isoOrNull(r.event_at),
      eventLocation: r.event_location,
      createdAt: iso(r.created_at),
    }));
  });

// ─── getThread ──────────────────────────────────────────────────────────

export const getThread = createServerFn({ method: "POST" })
  .validator((data: { id: string }) => {
    if (!data?.id || typeof data.id !== "string") throw new Error("Missing thread id.");
    return { id: data.id };
  })
  .handler(async ({ data }): Promise<ClubPost | null> => {
    const sql = await getSql();
    const rows = await sql<ThreadRow>`
      select
        p.id, p.club_slug, p.user_id, p.author_name, p.title, p.body,
        p.pinned, p.created_at, p.event_at, p.event_location,
        (select count(*) from replies r where r.post_id = p.id) as reply_count
      from posts p
      where p.id = ${data.id}
      limit 1
    `;
    const r = rows[0];
    if (!r) return null;
    return {
      id: r.id,
      clubSlug: r.club_slug ?? "",
      userId: r.user_id,
      authorName: r.author_name,
      title: r.title,
      body: r.body,
      pinned: r.pinned,
      replyCount: Number(r.reply_count),
      eventAt: isoOrNull(r.event_at),
      eventLocation: r.event_location,
      createdAt: iso(r.created_at),
    };
  });

// ─── createClubPost ──────────────────────────────────────────────────────

export type CreatePostInput = {
  clubSlug: string;
  authorName: string;
  title: string;
  body: string;
  eventAt?: string;
  eventLocation?: string;
};

export type CreatePostResult =
  | { ok: true; post: ClubPost }
  | { ok: false; error: string };

export const createClubPost = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: CreatePostInput) => {
    if (!data || typeof data !== "object") throw new Error("Invalid payload.");
    const clubSlug = String(data.clubSlug ?? "").trim();
    const authorName = String(data.authorName ?? "").trim();
    const title = String(data.title ?? "").trim();
    const body = String(data.body ?? "").trim();
    const eventAt = data.eventAt ? String(data.eventAt).trim() : "";
    const eventLocation = data.eventLocation ? String(data.eventLocation).trim() : "";

    if (!clubSlug) throw new Error("Missing club slug.");
    if (!authorName) throw new Error("Your display name is required.");
    if (!title) throw new Error("A thread title is required.");
    if (!body) throw new Error("Your message is required.");

    let normalizedEventAt: string | undefined;
    if (eventAt) {
      const d = new Date(eventAt);
      if (Number.isNaN(d.getTime())) throw new Error("Invalid event date.");
      normalizedEventAt = d.toISOString();
    }

    return {
      clubSlug,
      authorName,
      title,
      body,
      eventAt: normalizedEventAt,
      eventLocation: eventLocation || undefined,
    } satisfies CreatePostInput;
  })
  .handler(async ({ data, context }): Promise<CreatePostResult> => {
    try {
      const sql = await getSql();
      const id = nid("thr");
      const now = new Date().toISOString();
      await sql`
        insert into posts (
          id, club_slug, user_id, author_name, title, body, pinned,
          event_at, event_location, created_at, updated_at
        ) values (
          ${id}, ${data.clubSlug}, ${context.userId}, ${data.authorName},
          ${data.title}, ${data.body}, false,
          ${data.eventAt ?? null}, ${data.eventLocation ?? null},
          ${now}, ${now}
        )
      `;
      return {
        ok: true,
        post: {
          id,
          clubSlug: data.clubSlug,
          userId: context.userId,
          authorName: data.authorName,
          title: data.title,
          body: data.body,
          pinned: false,
          replyCount: 0,
          eventAt: data.eventAt ?? null,
          eventLocation: data.eventLocation ?? null,
          createdAt: now,
        },
      };
    } catch (err) {
      console.error("[createClubPost] failed:", err);
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Could not post to the club.",
      };
    }
  });

// ─── getReplies ──────────────────────────────────────────────────────────

type ReplyRow = {
  id: string;
  post_id: string;
  user_id: string;
  author_name: string;
  body: string;
  created_at: string | Date;
};

export const getReplies = createServerFn({ method: "POST" })
  .validator((data: { postId: string }) => {
    if (!data?.postId || typeof data.postId !== "string") {
      throw new Error("Missing postId.");
    }
    return { postId: data.postId };
  })
  .handler(async ({ data }): Promise<ClubReply[]> => {
    const sql = await getSql();
    const rows = await sql<ReplyRow>`
      select id, post_id, user_id, author_name, body, created_at
      from replies
      where post_id = ${data.postId}
      order by created_at asc
      limit 500
    `;
    return rows.map((r) => ({
      id: r.id,
      postId: r.post_id,
      userId: r.user_id,
      authorName: r.author_name,
      body: r.body,
      createdAt: iso(r.created_at),
    }));
  });

// ─── createReply ─────────────────────────────────────────────────────────

export type CreateReplyInput = {
  postId: string;
  authorName: string;
  body: string;
};

export type CreateReplyResult =
  | { ok: true; reply: ClubReply }
  | { ok: false; error: string };

export const createReply = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: CreateReplyInput) => {
    if (!data || typeof data !== "object") throw new Error("Invalid payload.");
    const postId = String(data.postId ?? "").trim();
    const authorName = String(data.authorName ?? "").trim();
    const body = String(data.body ?? "").trim();
    if (!postId) throw new Error("Missing thread id.");
    if (!authorName) throw new Error("Your display name is required.");
    if (!body) throw new Error("Your message is required.");
    return { postId, authorName, body } satisfies CreateReplyInput;
  })
  .handler(async ({ data, context }): Promise<CreateReplyResult> => {
    try {
      const sql = await getSql();
      const id = nid("rep");
      const now = new Date().toISOString();

      await sql`
        insert into replies (id, post_id, user_id, author_name, body, created_at)
        values (${id}, ${data.postId}, ${context.userId}, ${data.authorName}, ${data.body}, ${now})
      `;

      // Dispatch notifications to every other participant in the thread.
      // Wrapped so a notification failure never blocks the reply itself.
      try {
        const threadRows = await sql<{
          title: string | null;
          club_slug: string | null;
        }>`
          select title, club_slug from posts where id = ${data.postId} limit 1
        `;
        const threadRow = threadRows[0];
        if (threadRow) {
          await notifyThreadParticipants({
            postId: data.postId,
            replyId: id,
            actorUserId: context.userId,
            actorName: data.authorName,
            threadTitle: threadRow.title ?? "a thread",
            clubSlug: threadRow.club_slug ?? "",
          });
        }
      } catch (notifyErr) {
        console.error("[createReply] notification dispatch failed:", notifyErr);
      }

      return {
        ok: true,
        reply: {
          id,
          postId: data.postId,
          userId: context.userId,
          authorName: data.authorName,
          body: data.body,
          createdAt: now,
        },
      };
    } catch (err) {
      console.error("[createReply] failed:", err);
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Could not post your reply.",
      };
    }
  });