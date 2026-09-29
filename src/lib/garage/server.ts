import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/verify.server";

/**
 * Garage social feed server functions.
 *
 * Reads (listPosts, getPost, listComments) are PUBLIC — anyone can browse.
 * Writes (createPost, updatePost, deletePost, createComment, etc.) require auth.
 *
 * myReaction is only populated when the caller is signed in; otherwise null.
 */

export type MediaItem = {
  url: string;
  type: "image" | "video";
};

export type GaragePost = {
  id: string;
  userId: string;
  authorName: string;
  title: string | null;
  body: string | null;
  media: MediaItem[];
  createdAt: string;
  updatedAt: string;
  commentCount: number;
  reactionCount: number;
  myReaction: string | null;
};

export type GarageComment = {
  id: string;
  postId: string;
  userId: string;
  authorName: string;
  body: string;
  media: MediaItem[];
  createdAt: string;
  updatedAt: string;
  reactionCount: number;
  myReaction: string | null;
};

export type CreatePostInput = {
  title?: string;
  body?: string;
  media: MediaItem[];
};

export type CreatePostResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

export type CreateCommentInput = {
  postId: string;
  body: string;
  media: MediaItem[];
};

export type CreateCommentResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

// ─── Helpers ────────────────────────────────────────────────────────────

function nid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

function iso(v: string | Date): string {
  return typeof v === "string" ? v : v.toISOString();
}

function normalizeMedia(raw: unknown): MediaItem[] {
  if (!Array.isArray(raw)) return [];
  const out: MediaItem[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const url = typeof (item as { url?: unknown }).url === "string"
      ? (item as { url: string }).url
      : null;
    const type = (item as { type?: unknown }).type;
    if (!url) continue;
    if (type !== "image" && type !== "video") continue;
    out.push({ url, type });
  }
  return out;
}

// ─── Row types ──────────────────────────────────────────────────────────

type PostRow = {
  id: string;
  user_id: string;
  author_name: string;
  title: string | null;
  body: string | null;
  media: unknown;
  created_at: string | Date;
  updated_at: string | Date;
  comment_count: string | number;
  reaction_count: string | number;
  my_reaction: string | null;
};

function toPost(r: PostRow): GaragePost {
  return {
    id: r.id,
    userId: r.user_id,
    authorName: r.author_name,
    title: r.title,
    body: r.body,
    media: normalizeMedia(r.media),
    createdAt: iso(r.created_at),
    updatedAt: iso(r.updated_at),
    commentCount: Number(r.comment_count ?? 0),
    reactionCount: Number(r.reaction_count ?? 0),
    myReaction: r.my_reaction,
  };
}

type CommentRow = {
  id: string;
  post_id: string;
  user_id: string;
  author_name: string;
  body: string;
  media: unknown;
  created_at: string | Date;
  updated_at: string | Date;
  reaction_count: string | number;
  my_reaction: string | null;
};

function toComment(r: CommentRow): GarageComment {
  return {
    id: r.id,
    postId: r.post_id,
    userId: r.user_id,
    authorName: r.author_name,
    body: r.body,
    media: normalizeMedia(r.media),
    createdAt: iso(r.created_at),
    updatedAt: iso(r.updated_at),
    reactionCount: Number(r.reaction_count ?? 0),
    myReaction: r.my_reaction,
  };
}

// ─── createPost ─────────────────────────────────────────────────────────

export const createPost = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: CreatePostInput) => {
    if (!data || typeof data !== "object") throw new Error("Invalid payload.");
    const title = data.title ? String(data.title).trim() : "";
    const body = data.body ? String(data.body).trim() : "";
    const media = normalizeMedia(data.media);

    if (!title && !body && media.length === 0) {
      throw new Error("Post must have a title, a message, or media.");
    }
    if (title.length > 120) throw new Error("Title is too long (max 120).");
    if (body.length > 5000) throw new Error("Message is too long (max 5000).");
    if (media.length > 6) throw new Error("Up to 6 items of media per post.");

    return {
      title: title || undefined,
      body: body || undefined,
      media,
    } satisfies CreatePostInput;
  })
  .handler(async ({ data, context }): Promise<CreatePostResult> => {
    try {
      const sql = await getSql();
      const id = nid("gp");
      const now = new Date().toISOString();

      const userRows = await sql<{ name: string }>`
        select name from "user" where id = ${context.userId} limit 1
      `;
      const authorName = userRows[0]?.name ?? "Member";

      await sql`
        insert into garage_posts (
          id, user_id, author_name, title, body, media, created_at, updated_at
        ) values (
          ${id}, ${context.userId}, ${authorName},
          ${data.title ?? null}, ${data.body ?? null},
          ${JSON.stringify(data.media)}::jsonb,
          ${now}, ${now}
        )
      `;
      return { ok: true, id };
    } catch (err) {
      console.error("[createPost] failed:", err);
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Could not create post.",
      };
    }
  });

// ─── listPosts (PUBLIC) ─────────────────────────────────────────────────

export const listPosts = createServerFn({ method: "POST" })
  .validator((data: { limit?: number; before?: string }) => {
    const limit = Number(data?.limit ?? 20);
    return {
      limit: Number.isFinite(limit) && limit > 0 ? Math.min(limit, 50) : 20,
      before: typeof data?.before === "string" ? data.before : undefined,
    };
  })
  .handler(async ({ data }): Promise<GaragePost[]> => {
    const sessionUser = await getSessionUser();
    const myId = sessionUser?.id ?? null;
    const sql = await getSql();

    const rows = await sql<PostRow>`
      select
        p.id, p.user_id, p.author_name, p.title, p.body, p.media,
        p.created_at, p.updated_at,
        (select count(*) from garage_comments c
          where c.post_id = p.id and c.deleted_at is null) as comment_count,
        (select count(*) from reactions r
          where r.target_type = 'garage_post' and r.target_id = p.id) as reaction_count,
        (select emoji from reactions r
          where r.target_type = 'garage_post' and r.target_id = p.id
            and r.user_id = ${myId}
          limit 1) as my_reaction
      from garage_posts p
      where p.deleted_at is null
        and (${data.before ?? null}::timestamptz is null or p.created_at < ${data.before ?? null}::timestamptz)
      order by p.created_at desc
      limit ${data.limit}
    `;
    return rows.map(toPost);
  });

// ─── getPost (PUBLIC) ───────────────────────────────────────────────────

export const getPost = createServerFn({ method: "POST" })
  .validator((data: { id: string }) => {
    if (!data?.id || typeof data.id !== "string") throw new Error("Missing id.");
    return { id: data.id };
  })
  .handler(async ({ data }): Promise<GaragePost | null> => {
    const sessionUser = await getSessionUser();
    const myId = sessionUser?.id ?? null;
    const sql = await getSql();

    const rows = await sql<PostRow>`
      select
        p.id, p.user_id, p.author_name, p.title, p.body, p.media,
        p.created_at, p.updated_at,
        (select count(*) from garage_comments c
          where c.post_id = p.id and c.deleted_at is null) as comment_count,
        (select count(*) from reactions r
          where r.target_type = 'garage_post' and r.target_id = p.id) as reaction_count,
        (select emoji from reactions r
          where r.target_type = 'garage_post' and r.target_id = p.id
            and r.user_id = ${myId}
          limit 1) as my_reaction
      from garage_posts p
      where p.id = ${data.id} and p.deleted_at is null
      limit 1
    `;
    const r = rows[0];
    return r ? toPost(r) : null;
  });

// ─── updatePost ─────────────────────────────────────────────────────────

export const updatePost = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { id: string; title?: string; body?: string; media?: MediaItem[] }) => {
    if (!data?.id || typeof data.id !== "string") throw new Error("Missing id.");
    return {
      id: data.id,
      title: data.title ? String(data.title).trim() : undefined,
      body: data.body ? String(data.body).trim() : undefined,
      media: Array.isArray(data.media) ? normalizeMedia(data.media) : undefined,
    };
  })
  .handler(async ({ data, context }): Promise<{ ok: boolean; error?: string }> => {
    try {
      const sql = await getSql();

      const rows = await sql<{ user_id: string }>`
        select user_id from garage_posts where id = ${data.id} and deleted_at is null limit 1
      `;
      if (!rows[0]) return { ok: false, error: "Post not found." };
      if (rows[0].user_id !== context.userId) {
        return { ok: false, error: "You can only edit your own posts." };
      }

      const now = new Date().toISOString();
      await sql`
        update garage_posts set
          title = ${data.title ?? null},
          body = ${data.body ?? null},
          media = ${data.media ? JSON.stringify(data.media) : null}::jsonb,
          updated_at = ${now}
        where id = ${data.id}
      `;
      return { ok: true };
    } catch (err) {
      console.error("[updatePost] failed:", err);
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Could not update.",
      };
    }
  });

// ─── deletePost ─────────────────────────────────────────────────────────

export const deletePost = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { id: string }) => {
    if (!data?.id || typeof data.id !== "string") throw new Error("Missing id.");
    return { id: data.id };
  })
  .handler(async ({ data, context }): Promise<{ ok: boolean; error?: string }> => {
    try {
      const sql = await getSql();

      const rows = await sql<{ user_id: string; role: string }>`
        select gp.user_id, u.role
        from garage_posts gp
        inner join "user" u on u.id = ${context.userId}
        where gp.id = ${data.id} and gp.deleted_at is null
        limit 1
      `;
      if (!rows[0]) return { ok: false, error: "Post not found." };

      const isOwner = rows[0].user_id === context.userId;
      const isAdmin = rows[0].role === "admin";
      if (!isOwner && !isAdmin) {
        return { ok: false, error: "You can only delete your own posts." };
      }

      await sql`
        update garage_posts set deleted_at = now()
        where id = ${data.id}
      `;
      return { ok: true };
    } catch (err) {
      console.error("[deletePost] failed:", err);
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Could not delete.",
      };
    }
  });

// ─── createComment ──────────────────────────────────────────────────────

export const createComment = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: CreateCommentInput) => {
    if (!data || typeof data !== "object") throw new Error("Invalid payload.");
    if (!data.postId || typeof data.postId !== "string") throw new Error("Missing postId.");
    const body = String(data.body ?? "").trim();
    const media = normalizeMedia(data.media);
    if (!body && media.length === 0) {
      throw new Error("Comment must have text or media.");
    }
    if (body.length > 2000) throw new Error("Comment too long (max 2000).");
    if (media.length > 4) throw new Error("Up to 4 items per comment.");
    return { postId: data.postId, body, media } satisfies CreateCommentInput;
  })
  .handler(async ({ data, context }): Promise<CreateCommentResult> => {
    try {
      const sql = await getSql();
      const id = nid("gc");
      const now = new Date().toISOString();

      const userRows = await sql<{ name: string }>`
        select name from "user" where id = ${context.userId} limit 1
      `;
      const authorName = userRows[0]?.name ?? "Member";

      await sql`
        insert into garage_comments (
          id, post_id, user_id, author_name, body, media, created_at, updated_at
        ) values (
          ${id}, ${data.postId}, ${context.userId}, ${authorName},
          ${data.body}, ${JSON.stringify(data.media)}::jsonb, ${now}, ${now}
        )
      `;
      return { ok: true, id };
    } catch (err) {
      console.error("[createComment] failed:", err);
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Could not post comment.",
      };
    }
  });

// ─── listComments (PUBLIC) ──────────────────────────────────────────────

export const listComments = createServerFn({ method: "POST" })
  .validator((data: { postId: string }) => {
    if (!data?.postId || typeof data.postId !== "string") {
      throw new Error("Missing postId.");
    }
    return { postId: data.postId };
  })
  .handler(async ({ data }): Promise<GarageComment[]> => {
    const sessionUser = await getSessionUser();
    const myId = sessionUser?.id ?? null;
    const sql = await getSql();

    const rows = await sql<CommentRow>`
      select
        c.id, c.post_id, c.user_id, c.author_name, c.body, c.media,
        c.created_at, c.updated_at,
        (select count(*) from reactions r
          where r.target_type = 'garage_comment' and r.target_id = c.id) as reaction_count,
        (select emoji from reactions r
          where r.target_type = 'garage_comment' and r.target_id = c.id
            and r.user_id = ${myId}
          limit 1) as my_reaction
      from garage_comments c
      where c.post_id = ${data.postId} and c.deleted_at is null
      order by c.created_at asc
      limit 200
    `;
    return rows.map(toComment);
  });

// ─── updateComment ──────────────────────────────────────────────────────

export const updateComment = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { id: string; body: string }) => {
    if (!data?.id || typeof data.id !== "string") throw new Error("Missing id.");
    const body = String(data.body ?? "").trim();
    if (!body) throw new Error("Comment cannot be empty.");
    if (body.length > 2000) throw new Error("Comment too long.");
    return { id: data.id, body };
  })
  .handler(async ({ data, context }): Promise<{ ok: boolean; error?: string }> => {
    try {
      const sql = await getSql();

      const rows = await sql<{ user_id: string }>`
        select user_id from garage_comments
        where id = ${data.id} and deleted_at is null limit 1
      `;
      if (!rows[0]) return { ok: false, error: "Comment not found." };
      if (rows[0].user_id !== context.userId) {
        return { ok: false, error: "You can only edit your own comments." };
      }

      await sql`
        update garage_comments set
          body = ${data.body},
          updated_at = now()
        where id = ${data.id}
      `;
      return { ok: true };
    } catch (err) {
      console.error("[updateComment] failed:", err);
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Could not update.",
      };
    }
  });

// ─── deleteComment ──────────────────────────────────────────────────────

export const deleteComment = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { id: string }) => {
    if (!data?.id || typeof data.id !== "string") throw new Error("Missing id.");
    return { id: data.id };
  })
  .handler(async ({ data, context }): Promise<{ ok: boolean; error?: string }> => {
    try {
      const sql = await getSql();

      const rows = await sql<{ user_id: string; role: string }>`
        select gc.user_id, u.role
        from garage_comments gc
        inner join "user" u on u.id = ${context.userId}
        where gc.id = ${data.id} and gc.deleted_at is null
        limit 1
      `;
      if (!rows[0]) return { ok: false, error: "Comment not found." };

      const isOwner = rows[0].user_id === context.userId;
      const isAdmin = rows[0].role === "admin";
      if (!isOwner && !isAdmin) {
        return { ok: false, error: "You can only delete your own comments." };
      }

      await sql`
        update garage_comments set deleted_at = now()
        where id = ${data.id}
      `;
      return { ok: true };
    } catch (err) {
      console.error("[deleteComment] failed:", err);
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Could not delete.",
      };
    }
  });