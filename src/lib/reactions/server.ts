import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";

/**
 * Unified reactions — one system for garage posts, garage comments,
 * club threads, and club replies.
 *
 * One row per (target_type, target_id, user_id). Toggling the same emoji
 * removes the reaction; picking a different emoji replaces it.
 */

export const REACTION_EMOJIS = [
  "👍",
  "❤️",
  "😂",
  "😮",
  "😢",
  "😡",
  "🙏",
] as const;
export type ReactionEmoji = (typeof REACTION_EMOJIS)[number];

export const TARGET_TYPES = [
  "garage_post",
  "garage_comment",
  "thread",
  "reply",
] as const;
export type ReactionTargetType = (typeof TARGET_TYPES)[number];

export type ReactionSummary = {
  counts: Record<string, number>; // emoji → count
  total: number;
  myReaction: string | null;
};

function nid() {
  return `rea_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

// ─── toggleReaction ─────────────────────────────────────────────────────

export const toggleReaction = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { targetType: ReactionTargetType; targetId: string; emoji: ReactionEmoji }) => {
    if (!data || typeof data !== "object") throw new Error("Invalid payload.");
    if (!TARGET_TYPES.includes(data.targetType)) {
      throw new Error("Invalid target type.");
    }
    if (!data.targetId || typeof data.targetId !== "string") {
      throw new Error("Missing target id.");
    }
    if (!REACTION_EMOJIS.includes(data.emoji)) {
      throw new Error("Invalid emoji.");
    }
    return {
      targetType: data.targetType,
      targetId: data.targetId,
      emoji: data.emoji,
    };
  })
  .handler(async ({ data, context }): Promise<{ ok: boolean; error?: string }> => {
    try {
      const sql = await getSql();

      // Is there an existing reaction from this user for this target?
      const existing = await sql<{ id: string; emoji: string }>`
        select id, emoji from reactions
        where target_type = ${data.targetType}
          and target_id = ${data.targetId}
          and user_id = ${context.userId}
        limit 1
      `;

      if (existing.length > 0) {
        const current = existing[0];
        if (current.emoji === data.emoji) {
          // Same emoji → remove (toggle off).
          await sql`delete from reactions where id = ${current.id}`;
        } else {
          // Different emoji → replace.
          await sql`
            update reactions set emoji = ${data.emoji}, created_at = now()
            where id = ${current.id}
          `;
        }
        return { ok: true };
      }

      // No existing reaction — insert.
      const id = nid();
      await sql`
        insert into reactions (id, target_type, target_id, user_id, emoji)
        values (${id}, ${data.targetType}, ${data.targetId}, ${context.userId}, ${data.emoji})
      `;
      return { ok: true };
    } catch (err) {
      console.error("[toggleReaction] failed:", err);
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Could not react.",
      };
    }
  });

// ─── getReactions ───────────────────────────────────────────────────────

export const getReactions = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { targetType: ReactionTargetType; targetId: string }) => {
    if (!data || typeof data !== "object") throw new Error("Invalid payload.");
    if (!TARGET_TYPES.includes(data.targetType)) {
      throw new Error("Invalid target type.");
    }
    if (!data.targetId || typeof data.targetId !== "string") {
      throw new Error("Missing target id.");
    }
    return { targetType: data.targetType, targetId: data.targetId };
  })
  .handler(async ({ data, context }): Promise<ReactionSummary> => {
    const sql = await getSql();
    const rows = await sql<{ emoji: string; user_id: string }>`
      select emoji, user_id from reactions
      where target_type = ${data.targetType} and target_id = ${data.targetId}
    `;

    const counts: Record<string, number> = {};
    let myReaction: string | null = null;
    let total = 0;
    for (const r of rows) {
      counts[r.emoji] = (counts[r.emoji] ?? 0) + 1;
      total += 1;
      if (r.user_id === context.userId) myReaction = r.emoji;
    }

    return { counts, total, myReaction };
  });

// ─── getReactionsBulk ───────────────────────────────────────────────────

/**
 * Fetch reactions for many targets of the same type at once.
 * Returns a map: target_id → { counts, total, myReaction }.
 *
 * Used by list views (garage feed, club threads list) to avoid N+1 queries.
 */
export const getReactionsBulk = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { targetType: ReactionTargetType; targetIds: string[] }) => {
    if (!data || typeof data !== "object") throw new Error("Invalid payload.");
    if (!TARGET_TYPES.includes(data.targetType)) {
      throw new Error("Invalid target type.");
    }
    if (!Array.isArray(data.targetIds)) throw new Error("targetIds must be an array.");
    const ids = data.targetIds
      .map((x) => String(x).trim())
      .filter(Boolean)
      .slice(0, 100);
    return { targetType: data.targetType, targetIds: ids };
  })
  .handler(async ({ data, context }): Promise<Record<string, ReactionSummary>> => {
    if (data.targetIds.length === 0) return {};
    const sql = await getSql();

    // Use `in` — pg driver needs an array for ANY.
    const rows = await sql<{ target_id: string; emoji: string; user_id: string }>`
      select target_id, emoji, user_id from reactions
      where target_type = ${data.targetType}
        and target_id = any(${data.targetIds}::text[])
    `;

    const out: Record<string, ReactionSummary> = {};
    for (const id of data.targetIds) {
      out[id] = { counts: {}, total: 0, myReaction: null };
    }
    for (const r of rows) {
      const bucket = out[r.target_id];
      if (!bucket) continue;
      bucket.counts[r.emoji] = (bucket.counts[r.emoji] ?? 0) + 1;
      bucket.total += 1;
      if (r.user_id === context.userId) bucket.myReaction = r.emoji;
    }
    return out;
  });