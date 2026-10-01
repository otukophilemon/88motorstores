import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";

/**
 * Garage social feed server functions.
 *
 * Posts and comments require auth. All reads are public.
 * Media is stored as JSON: [{ url, type: 'image' | 'video' }].
 *
 * Post types: 'showcase' (default), 'question', 'tip'.
 * Questions support marking one comment as the accepted answer.
 *
 * Soft-delete: posts and comments have deleted_at. Rows with deleted_at set
 * are excluded from all reads.
 */

// ─── Types ──────────────────────────────────────────────────────────────

export type MediaItem = {
  url: string;
  type: "image" | "video";
};

export type PostType = "showcase" | "question" | "tip";

export type GaragePost = {
  id: string;
  userId: string;
  authorName: string;
  title: string | null;
  body: string | null;
  media: MediaItem[];
  postType: PostType;
  createdAt: string;
  updatedAt: string;
  commentCount: number;
  reactionCount: number;
  myReaction: string | null;
  hasAcceptedAnswer: boolean;
};

export type GarageComment = {
  id: string;
  postId: string;
  userId: string;
  authorName: string;
  body: string;
  media: MediaItem[];
  isAccepted: boolean;
  createdAt: string;
  updatedAt: string;
  reactionCount: number;
  myReaction: string | null;
};

export type CreatePostInput = {
  title?: string;
  body?: string;
  media: MediaItem[];
  postType?: PostType;
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
    const url =
      typeof (item as { url?: unknown }).url === "string"
        ? (item as { url: string }).url
        : null;
    const type = (item as { type?: unknown }).type;
    if (!url) continue;
    if (type !== "image" && type !== "video") continue;
    out.push({ url, type });
  }
  return out;
}

function normalizePostType(raw: unknown): PostType {
  if (raw === "question" || raw === "tip") return raw;
  return "showcase";
}

// ─── Row types ──────────────────────────────────────────────────────────

type PostRow = {
  id: string;
  user_id: string;
  author_name: string;
  title: string | null;
  body: string | null;
  media: unknown;
  post_type: string;
  created_at: string | Date;
  updated_at: string | Date;
  comment_count: string | number;
  reaction_count: string | number;
  my_reaction: string | null;
  has_accepted_answer: boolean;
};

function toPost(r: PostRow): GaragePost {
  return {
    id: r.id,
    userId: r.user_id,
    authorName: r.author_name,
    title: r.title,
    body: r.body,
    media: normalizeMedia(r.media),
    postType: normalizePostType(r.post_type),
    createdAt: iso(r.created_at),
    updatedAt: iso(r.updated_at),
    commentCount: Number(r.comment_count ?? 0),
    reactionCount: Number(r.reaction_count ?? 0),
    myReaction: r.my_reaction,
    hasAcceptedAnswer: Boolean(r.has_accepted_answer),
  };
}

type CommentRow = {
  id: string;
  post_id: string;
  user_id: string;
  author_name: string;
  body: string;
  media: unknown;
  is_accepted: boolean;
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
    isAccepted: Boolean(r.is_accepted),
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
    const postType = normalizePostType(data.postType);

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
      postType,
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
          id, user_id, author_name, title, body, media, post_type,
          created_at, updated_at
        ) values (
          ${id}, ${context.userId}, ${authorName},
          ${data.title ?? null}, ${data.body ?? null},
          ${JSON.stringify(data.media)}::jsonb,
          ${data.postType ?? "showcase"},
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

// ─── listPosts ──────────────────────────────────────────────────────────

export const listPosts = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (data: { limit?: number; before?: string; postType?: PostType | "all" }) => {
      const limit = Number(data?.limit ?? 20);
      return {
        limit: Number.isFinite(limit) && limit > 0 ? Math.min(limit, 50) : 20,
        before: typeof data?.before === "string" ? data.before : undefined,
        postType:
          data?.postType === "question" ||
          data?.postType === "tip" ||
          data?.postType === "showcase"
            ? data.postType
            : ("all" as const),
      };
    },
  )
  .handler(async ({ data, context }): Promise<GaragePost[]> => {
    const sql = await getSql();

    // Build the WHERE clause with explicit placeholders. Avoids empty
    // template fragments (which confuse the driver) and keeps all values
    // parameterized.
    const where: string[] = ["p.deleted_at is null"];
    const params: unknown[] = [context.userId]; // $1 — used in my_reaction subquery
    let paramIdx = 2;

    if (data.postType !== "all") {
      where.push(`p.post_type = $${paramIdx++}`);
      params.push(data.postType);
    }
    if (data.before) {
      where.push(`p.created_at < $${paramIdx++}`);
      params.push(data.before);
    }
    params.push(data.limit); // last param — limit

    const query = `
      select
        p.id, p.user_id, p.author_name, p.title, p.body, p.media,
        p.post_type, p.created_at, p.updated_at,
        (select count(*) from garage_comments c
          where c.post_id = p.id and c.deleted_at is null) as comment_count,
        (select count(*) from reactions r
          where r.target_type = 'garage_post' and r.target_id = p.id) as reaction_count,
        (select emoji from reactions r
          where r.target_type = 'garage_post' and r.target_id = p.id
            and r.user_id = $1
          limit 1) as my_reaction,
        exists (
          select 1 from garage_comments c
          where c.post_id = p.id and c.is_accepted = true and c.deleted_at is null
        ) as has_accepted_answer
      from garage_posts p
      where ${where.join(" and ")}
      order by p.created_at desc
      limit $${paramIdx}
    `;

    const rows = await sql.query<PostRow>(query, params);
    return rows.map(toPost);
  });

// ─── getPost ────────────────────────────────────────────────────────────

export const getPost = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { id: string }) => {
    if (!data?.id || typeof data.id !== "string") throw new Error("Missing id.");
    return { id: data.id };
  })
  .handler(async ({ data, context }): Promise<GaragePost | null> => {
    const sql = await getSql();
    const query = `
      select
        p.id, p.user_id, p.author_name, p.title, p.body, p.media,
        p.post_type, p.created_at, p.updated_at,
        (select count(*) from garage_comments c
          where c.post_id = p.id and c.deleted_at is null) as comment_count,
        (select count(*) from reactions r
          where r.target_type = 'garage_post' and r.target_id = p.id) as reaction_count,
        (select emoji from reactions r
          where r.target_type = 'garage_post' and r.target_id = p.id
            and r.user_id = $1
          limit 1) as my_reaction,
        exists (
          select 1 from garage_comments c
          where c.post_id = p.id and c.is_accepted = true and c.deleted_at is null
        ) as has_accepted_answer
      from garage_posts p
      where p.id = $2 and p.deleted_at is null
      limit 1
    `;
    const rows = await sql.query<PostRow>(query, [context.userId, data.id]);
    const r = rows[0];
    return r ? toPost(r) : null;
  });

// ─── updatePost ─────────────────────────────────────────────────────────

export const updatePost = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (data: { id: string; title?: string; body?: string; media?: MediaItem[] }) => {
      if (!data?.id || typeof data.id !== "string") throw new Error("Missing id.");
      return {
        id: data.id,
        title: data.title ? String(data.title).trim() : undefined,
        body: data.body ? String(data.body).trim() : undefined,
        media: Array.isArray(data.media) ? normalizeMedia(data.media) : undefined,
      };
    },
  )
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
    if (!data.postId || typeof data.postId !== "string")
      throw new Error("Missing postId.");
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

// ─── listComments ───────────────────────────────────────────────────────

export const listComments = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { postId: string }) => {
    if (!data?.postId || typeof data.postId !== "string") {
      throw new Error("Missing postId.");
    }
    return { postId: data.postId };
  })
  .handler(async ({ data, context }): Promise<GarageComment[]> => {
    const sql = await getSql();
    const query = `
      select
        c.id, c.post_id, c.user_id, c.author_name, c.body, c.media,
        c.is_accepted, c.created_at, c.updated_at,
        (select count(*) from reactions r
          where r.target_type = 'garage_comment' and r.target_id = c.id) as reaction_count,
        (select emoji from reactions r
          where r.target_type = 'garage_comment' and r.target_id = c.id
            and r.user_id = $1
          limit 1) as my_reaction
      from garage_comments c
      where c.post_id = $2 and c.deleted_at is null
      order by c.is_accepted desc, c.created_at asc
      limit 200
    `;
    const rows = await sql.query<CommentRow>(query, [context.userId, data.postId]);
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

// ─── acceptAnswer ───────────────────────────────────────────────────────

export const acceptAnswer = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { commentId: string; accepted: boolean }) => {
    if (!data?.commentId || typeof data.commentId !== "string") {
      throw new Error("Missing commentId.");
    }
    return {
      commentId: data.commentId,
      accepted: Boolean(data.accepted),
    };
  })
  .handler(async ({ data, context }): Promise<{ ok: boolean; error?: string }> => {
    try {
      const sql = await getSql();

      const rows = await sql<{ post_id: string; post_user_id: string }>`
        select c.post_id, p.user_id as post_user_id
        from garage_comments c
        inner join garage_posts p on p.id = c.post_id
        where c.id = ${data.commentId} and c.deleted_at is null and p.deleted_at is null
        limit 1
      `;
      if (!rows[0]) return { ok: false, error: "Comment not found." };
      if (rows[0].post_user_id !== context.userId) {
        return {
          ok: false,
          error: "Only the question author can accept an answer.",
        };
      }

      if (data.accepted) {
        await sql`
          update garage_comments set is_accepted = false
          where post_id = ${rows[0].post_id} and is_accepted = true and id != ${data.commentId}
        `;
        await sql`
          update garage_comments set is_accepted = true
          where id = ${data.commentId}
        `;
      } else {
        await sql`
          update garage_comments set is_accepted = false
          where id = ${data.commentId}
        `;
      }

      return { ok: true };
    } catch (err) {
      console.error("[acceptAnswer] failed:", err);
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Could not update answer.",
      };
    }
  });