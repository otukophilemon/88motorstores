import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";

/**
 * General live chat — a single shared room for all signed-in users.
 *
 * Reads are public (signed-in not required to read). Writes require auth.
 * The client polls `listChatMessages` every few seconds to simulate real-time.
 *
 * Soft delete: messages have deleted_at. Rows with deleted_at set are
 * excluded from all reads.
 */

// ─── Types ──────────────────────────────────────────────────────────────

export type ChatMediaItem = {
  url: string;
  type: "image" | "video";
};

export type ChatMessage = {
  id: string;
  userId: string;
  authorName: string;
  body: string | null;
  media: ChatMediaItem[];
  replyToId: string | null;
  createdAt: string;
};

export type CreateChatMessageInput = {
  body?: string;
  media: ChatMediaItem[];
  replyToId?: string;
};

export type CreateChatMessageResult =
  | { ok: true; message: ChatMessage }
  | { ok: false; error: string };

// ─── Helpers ────────────────────────────────────────────────────────────

function nid() {
  return `cm_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

function iso(v: string | Date): string {
  return typeof v === "string" ? v : v.toISOString();
}

function normalizeMedia(raw: unknown): ChatMediaItem[] {
  if (!Array.isArray(raw)) return [];
  const out: ChatMediaItem[] = [];
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

// ─── Row type ───────────────────────────────────────────────────────────

type ChatRow = {
  id: string;
  user_id: string;
  author_name: string;
  body: string | null;
  media: unknown;
  reply_to_id: string | null;
  created_at: string | Date;
};

function toChatMessage(r: ChatRow): ChatMessage {
  return {
    id: r.id,
    userId: r.user_id,
    authorName: r.author_name,
    body: r.body,
    media: normalizeMedia(r.media),
    replyToId: r.reply_to_id,
    createdAt: iso(r.created_at),
  };
}

// ─── listChatMessages ───────────────────────────────────────────────────

export const listChatMessages = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { limit?: number; before?: string; after?: string }) => {
    const limit = Number(data?.limit ?? 50);
    return {
      limit: Number.isFinite(limit) && limit > 0 ? Math.min(limit, 100) : 50,
      before: typeof data?.before === "string" ? data.before : undefined,
      after: typeof data?.after === "string" ? data.after : undefined,
    };
  })
  .handler(async ({ data }): Promise<ChatMessage[]> => {
    const sql = await getSql();

    const where: string[] = ["deleted_at is null"];
    const params: unknown[] = [];
    let paramIdx = 1;

    if (data.after) {
      where.push(`created_at > $${paramIdx++}`);
      params.push(data.after);
    }
    if (data.before) {
      where.push(`created_at < $${paramIdx++}`);
      params.push(data.before);
    }
    params.push(data.limit);

    const query = `
      select id, user_id, author_name, body, media, reply_to_id, created_at
      from chat_messages
      where ${where.join(" and ")}
      order by created_at desc
      limit $${paramIdx}
    `;

    const rows = await sql.query<ChatRow>(query, params);
    // Reverse so caller receives oldest-first.
    return rows.map(toChatMessage).reverse();
  });

// ─── createChatMessage ──────────────────────────────────────────────────

export const createChatMessage = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: CreateChatMessageInput) => {
    if (!data || typeof data !== "object") throw new Error("Invalid payload.");
    const body = data.body ? String(data.body).trim() : "";
    const media = normalizeMedia(data.media);
    if (!body && media.length === 0) {
      throw new Error("Message must have text or media.");
    }
    if (body.length > 2000) throw new Error("Message too long (max 2000).");
    if (media.length > 4) throw new Error("Up to 4 items per message.");
    return {
      body: body || undefined,
      media,
      replyToId:
        typeof data.replyToId === "string" && data.replyToId.trim()
          ? data.replyToId.trim()
          : undefined,
    } satisfies CreateChatMessageInput;
  })
  .handler(async ({ data, context }): Promise<CreateChatMessageResult> => {
    try {
      const sql = await getSql();
      const id = nid();
      const now = new Date().toISOString();

      const userRows = await sql<{ name: string }>`
        select name from "user" where id = ${context.userId} limit 1
      `;
      const authorName = userRows[0]?.name ?? "Member";

      await sql`
        insert into chat_messages (
          id, user_id, author_name, body, media, reply_to_id, created_at
        ) values (
          ${id}, ${context.userId}, ${authorName},
          ${data.body ?? null},
          ${JSON.stringify(data.media)}::jsonb,
          ${data.replyToId ?? null},
          ${now}
        )
      `;

      return {
        ok: true,
        message: {
          id,
          userId: context.userId,
          authorName,
          body: data.body ?? null,
          media: data.media,
          replyToId: data.replyToId ?? null,
          createdAt: now,
        },
      };
    } catch (err) {
      console.error("[createChatMessage] failed:", err);
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Could not send message.",
      };
    }
  });

// ─── deleteChatMessage ──────────────────────────────────────────────────

export const deleteChatMessage = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { id: string }) => {
    if (!data?.id || typeof data.id !== "string") throw new Error("Missing id.");
    return { id: data.id };
  })
  .handler(async ({ data, context }): Promise<{ ok: boolean; error?: string }> => {
    try {
      const sql = await getSql();
      const rows = await sql<{ user_id: string; role: string }>`
        select cm.user_id, u.role
        from chat_messages cm
        inner join "user" u on u.id = ${context.userId}
        where cm.id = ${data.id} and cm.deleted_at is null
        limit 1
      `;
      if (!rows[0]) return { ok: false, error: "Message not found." };

      const isOwner = rows[0].user_id === context.userId;
      const isAdmin = rows[0].role === "admin";
      if (!isOwner && !isAdmin) {
        return { ok: false, error: "You can only delete your own messages." };
      }

      await sql`
        update chat_messages set deleted_at = now()
        where id = ${data.id}
      `;
      return { ok: true };
    } catch (err) {
      console.error("[deleteChatMessage] failed:", err);
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Could not delete.",
      };
    }
  });