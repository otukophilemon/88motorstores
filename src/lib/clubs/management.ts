import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { notifyAdmins } from "@/lib/notifications/server";

/**
 * Club management server functions.
 *
 * Reads are public (listClubs, getClub, getClubMembers).
 * Writes require auth. Membership rules are enforced in code, not just the UI.
 *
 * Roles inside a club:
 *   owner  — the creator. Can delete club, promote/demote admins, remove members.
 *   admin  — up to 5 others appointed by the owner. Can remove members.
 *   member — joined. Can post threads and replies.
 *
 * Site admins (user.role = 'admin') can also delete any club.
 */

// ─── Types ───────────────────────────────────────────────────────────────

export type ClubRole = "owner" | "admin" | "member";

export type Club = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  about: string | null;
  cover: string | null;
  rules: string[];
  createdBy: string | null;
  createdAt: string;
  memberCount: number;
};

export type ClubMember = {
  userId: string;
  name: string;
  email: string;
  role: ClubRole;
  joinedAt: string;
};

// ─── Helpers ─────────────────────────────────────────────────────────────

function nid() {
  return `club_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

function iso(v: string | Date): string {
  return typeof v === "string" ? v : v.toISOString();
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

async function findFreeSlug(base: string): Promise<string> {
  const sql = await getSql();
  const root = slugify(base) || "club";
  let candidate = root;
  let n = 2;
  // Loop until we find a free slug (max 100 tries to be safe).
  for (let i = 0; i < 100; i += 1) {
    const rows = await sql<{ id: string }>`
      select id from clubs where slug = ${candidate} limit 1
    `;
    if (rows.length === 0) return candidate;
    candidate = `${root}-${n}`;
    n += 1;
  }
  // Fallback — add a random suffix.
  return `${root}-${Math.random().toString(36).slice(2, 6)}`;
}

// ─── Row types ────────────────────────────────────────────────────────────

type ClubRow = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  about: string | null;
  cover: string | null;
  rules: string[] | null;
  created_by: string | null;
  created_at: string | Date;
  member_count: string | number;
};

function toClub(r: ClubRow): Club {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    tagline: r.tagline,
    about: r.about,
    cover: r.cover,
    rules: Array.isArray(r.rules) ? r.rules : [],
    createdBy: r.created_by,
    createdAt: iso(r.created_at),
    memberCount: Number(r.member_count ?? 0),
  };
}

// ─── listClubs ────────────────────────────────────────────────────────────

export const listClubs = createServerFn({ method: "GET" }).handler(
  async (): Promise<Club[]> => {
    const sql = await getSql();
    const rows = await sql<ClubRow>`
      select
        c.id, c.slug, c.name, c.tagline, c.about, c.cover, c.rules,
        c.created_by, c.created_at,
        (select count(*) from club_members m where m.club_id = c.id) as member_count
      from clubs c
      where c.deleted_at is null
      order by
        (select count(*) from club_members m where m.club_id = c.id) desc,
        c.created_at desc
      limit 200
    `;
    return rows.map(toClub);
  },
);

// ─── getClub ──────────────────────────────────────────────────────────────

export const getClub = createServerFn({ method: "POST" })
  .validator((data: { slug: string }) => {
    if (!data?.slug || typeof data.slug !== "string") {
      throw new Error("Missing slug.");
    }
    return { slug: data.slug };
  })
  .handler(async ({ data }): Promise<Club | null> => {
    const sql = await getSql();
    const rows = await sql<ClubRow>`
      select
        c.id, c.slug, c.name, c.tagline, c.about, c.cover, c.rules,
        c.created_by, c.created_at,
        (select count(*) from club_members m where m.club_id = c.id) as member_count
      from clubs c
      where c.slug = ${data.slug} and c.deleted_at is null
      limit 1
    `;
    const r = rows[0];
    return r ? toClub(r) : null;
  });

// ─── getClubMembers ───────────────────────────────────────────────────────

type MemberRow = {
  user_id: string;
  name: string;
  email: string;
  role: string;
  joined_at: string | Date;
};

export const getClubMembers = createServerFn({ method: "POST" })
  .validator((data: { clubId: string }) => {
    if (!data?.clubId || typeof data.clubId !== "string") {
      throw new Error("Missing clubId.");
    }
    return { clubId: data.clubId };
  })
  .handler(async ({ data }): Promise<ClubMember[]> => {
    const sql = await getSql();
    const rows = await sql<MemberRow>`
      select m.user_id, u.name, u.email, m.role, m.joined_at
      from club_members m
      inner join "user" u on u.id = m.user_id
      where m.club_id = ${data.clubId}
      order by
        case m.role when 'owner' then 0 when 'admin' then 1 else 2 end,
        m.joined_at asc
      limit 500
    `;
    return rows.map((r) => ({
      userId: r.user_id,
      name: r.name,
      email: r.email,
      role: r.role as ClubRole,
      joinedAt: iso(r.joined_at),
    }));
  });

// ─── createClub ───────────────────────────────────────────────────────────

export type CreateClubInput = {
  name: string;
  tagline: string;
  about: string;
  cover: string; // blob URL — required
  rules: string[]; // optional array of rules
};

export type CreateClubResult =
  | { ok: true; slug: string; id: string }
  | { ok: false; error: string };

export const createClub = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: CreateClubInput) => {
    if (!data || typeof data !== "object") throw new Error("Invalid payload.");
    const name = String(data.name ?? "").trim();
    const tagline = String(data.tagline ?? "").trim();
    const about = String(data.about ?? "").trim();
    const cover = String(data.cover ?? "").trim();
    const rules = Array.isArray(data.rules)
      ? data.rules.map((r) => String(r).trim()).filter(Boolean).slice(0, 10)
      : [];

    if (!name) throw new Error("Club name is required.");
    if (name.length < 3) throw new Error("Name should be at least 3 characters.");
    if (name.length > 60) throw new Error("Name should be 60 characters or fewer.");
    if (!tagline) throw new Error("Tagline is required.");
    if (!about) throw new Error("A short description is required.");
    if (about.length < 20) throw new Error("Description should be at least 20 characters.");
    if (!cover) throw new Error("A cover image is required.");

    return { name, tagline, about, cover, rules };
  })
  .handler(async ({ data, context }): Promise<CreateClubResult> => {
    try {
      const sql = await getSql();

      const slug = await findFreeSlug(data.name);
      const clubId = nid();
      const now = new Date().toISOString();

      await sql`
        insert into clubs (
          id, slug, name, tagline, about, cover, rules, created_by, created_at, updated_at
        ) values (
          ${clubId}, ${slug}, ${data.name}, ${data.tagline}, ${data.about},
          ${data.cover}, ${data.rules}, ${context.userId}, ${now}, ${now}
        )
      `;

      // Creator joins as 'owner'.
      await sql`
        insert into club_members (club_id, user_id, role, joined_at)
        values (${clubId}, ${context.userId}, 'owner', ${now})
      `;

      // Notify admins.
      try {
        await notifyAdmins({
          kind: "listing_new", // reuse an existing kind or add "club_new"
          message: `New club created: ${data.name}`,
          link: `/nations/${slug}`,
        });
      } catch (notifyErr) {
        console.error("[createClub] notification failed:", notifyErr);
      }

      return { ok: true, slug, id: clubId };
    } catch (err) {
      console.error("[createClub] failed:", err);
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Could not create club.",
      };
    }
  });

// ─── joinClub ─────────────────────────────────────────────────────────────

export const joinClub = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { clubId: string }) => {
    if (!data?.clubId || typeof data.clubId !== "string") {
      throw new Error("Missing clubId.");
    }
    return { clubId: data.clubId };
  })
  .handler(async ({ data, context }): Promise<{ ok: boolean; error?: string }> => {
    try {
      const sql = await getSql();
      const now = new Date().toISOString();
      await sql`
        insert into club_members (club_id, user_id, role, joined_at)
        values (${data.clubId}, ${context.userId}, 'member', ${now})
        on conflict (club_id, user_id) do nothing
      `;
      return { ok: true };
    } catch (err) {
      console.error("[joinClub] failed:", err);
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Could not join club.",
      };
    }
  });

// ─── leaveClub ────────────────────────────────────────────────────────────

export const leaveClub = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { clubId: string }) => {
    if (!data?.clubId || typeof data.clubId !== "string") {
      throw new Error("Missing clubId.");
    }
    return { clubId: data.clubId };
  })
  .handler(async ({ data, context }): Promise<{ ok: boolean; error?: string }> => {
    try {
      const sql = await getSql();
      // Owner cannot leave — they must delete or transfer first.
      const rows = await sql<{ role: string }>`
        select role from club_members
        where club_id = ${data.clubId} and user_id = ${context.userId} limit 1
      `;
      if (rows[0]?.role === "owner") {
        return { ok: false, error: "As the owner, you can't leave. Delete the club instead." };
      }
      await sql`
        delete from club_members
        where club_id = ${data.clubId} and user_id = ${context.userId}
      `;
      return { ok: true };
    } catch (err) {
      console.error("[leaveClub] failed:", err);
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Could not leave club.",
      };
    }
  });

// ─── deleteClub ───────────────────────────────────────────────────────────

export const deleteClub = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { clubId: string }) => {
    if (!data?.clubId || typeof data.clubId !== "string") {
      throw new Error("Missing clubId.");
    }
    return { clubId: data.clubId };
  })
  .handler(async ({ data, context }): Promise<{ ok: boolean; error?: string }> => {
    try {
      const sql = await getSql();

      // Caller must be the owner OR a site admin.
      const ownerRows = await sql<{ created_by: string | null }>`
        select created_by from clubs where id = ${data.clubId} limit 1
      `;
      if (!ownerRows[0]) return { ok: false, error: "Club not found." };

      const userRows = await sql<{ role: string }>`
        select role from "user" where id = ${context.userId} limit 1
      `;
      const isSiteAdmin = userRows[0]?.role === "admin";
      const isOwner = ownerRows[0].created_by === context.userId;

      if (!isSiteAdmin && !isOwner) {
        return { ok: false, error: "Only the club owner can delete this club." };
      }

      const now = new Date();
      const purge = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      await sql`
        update clubs set
          deleted_at = ${now.toISOString()},
          purge_after = ${purge.toISOString()}
        where id = ${data.clubId} and deleted_at is null
      `;

      return { ok: true };
    } catch (err) {
      console.error("[deleteClub] failed:", err);
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Could not delete club.",
      };
    }
  });

// ─── promoteToAdmin ───────────────────────────────────────────────────────

export const promoteToAdmin = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { clubId: string; userId: string }) => {
    if (!data?.clubId || typeof data.clubId !== "string") throw new Error("Missing clubId.");
    if (!data?.userId || typeof data.userId !== "string") throw new Error("Missing userId.");
    return { clubId: data.clubId, userId: data.userId };
  })
  .handler(async ({ data, context }): Promise<{ ok: boolean; error?: string }> => {
    try {
      const sql = await getSql();

      // Caller must be the owner.
      const rows = await sql<{ role: string }>`
        select role from club_members
        where club_id = ${data.clubId} and user_id = ${context.userId} limit 1
      `;
      if (rows[0]?.role !== "owner") {
        return { ok: false, error: "Only the owner can promote admins." };
      }

      // Enforce max 5 admins (excludes owner).
      const count = await sql<{ c: string | number }>`
        select count(*) as c from club_members
        where club_id = ${data.clubId} and role = 'admin'
      `;
      if (Number(count[0]?.c ?? 0) >= 5) {
        return { ok: false, error: "Maximum of 5 admins already reached." };
      }

      await sql`
        update club_members set role = 'admin'
        where club_id = ${data.clubId} and user_id = ${data.userId} and role = 'member'
      `;
      return { ok: true };
    } catch (err) {
      console.error("[promoteToAdmin] failed:", err);
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Could not promote.",
      };
    }
  });

// ─── demoteFromAdmin ──────────────────────────────────────────────────────

export const demoteFromAdmin = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { clubId: string; userId: string }) => {
    if (!data?.clubId || typeof data.clubId !== "string") throw new Error("Missing clubId.");
    if (!data?.userId || typeof data.userId !== "string") throw new Error("Missing userId.");
    return { clubId: data.clubId, userId: data.userId };
  })
  .handler(async ({ data, context }): Promise<{ ok: boolean; error?: string }> => {
    try {
      const sql = await getSql();

      const rows = await sql<{ role: string }>`
        select role from club_members
        where club_id = ${data.clubId} and user_id = ${context.userId} limit 1
      `;
      if (rows[0]?.role !== "owner") {
        return { ok: false, error: "Only the owner can demote admins." };
      }

      await sql`
        update club_members set role = 'member'
        where club_id = ${data.clubId} and user_id = ${data.userId} and role = 'admin'
      `;
      return { ok: true };
    } catch (err) {
      console.error("[demoteFromAdmin] failed:", err);
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Could not demote.",
      };
    }
  });

// ─── removeMember ─────────────────────────────────────────────────────────

export const removeMember = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { clubId: string; userId: string }) => {
    if (!data?.clubId || typeof data.clubId !== "string") throw new Error("Missing clubId.");
    if (!data?.userId || typeof data.userId !== "string") throw new Error("Missing userId.");
    return { clubId: data.clubId, userId: data.userId };
  })
  .handler(async ({ data, context }): Promise<{ ok: boolean; error?: string }> => {
    try {
      const sql = await getSql();

      // Caller must be owner or admin.
      const caller = await sql<{ role: string }>`
        select role from club_members
        where club_id = ${data.clubId} and user_id = ${context.userId} limit 1
      `;
      if (!["owner", "admin"].includes(caller[0]?.role ?? "")) {
        return { ok: false, error: "Only owners and admins can remove members." };
      }

      // Cannot remove the owner.
      const target = await sql<{ role: string }>`
        select role from club_members
        where club_id = ${data.clubId} and user_id = ${data.userId} limit 1
      `;
      if (target[0]?.role === "owner") {
        return { ok: false, error: "The owner can't be removed." };
      }

      // Admins can't remove other admins (only the owner can).
      if (target[0]?.role === "admin" && caller[0]?.role !== "owner") {
        return { ok: false, error: "Only the owner can remove admins." };
      }

      await sql`
        delete from club_members
        where club_id = ${data.clubId} and user_id = ${data.userId}
      `;
      return { ok: true };
    } catch (err) {
      console.error("[removeMember] failed:", err);
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Could not remove member.",
      };
    }
  });

// ─── getMyClubs ───────────────────────────────────────────────────────────

export const getMyClubs = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<(Club & { myRole: ClubRole })[]> => {
    const sql = await getSql();
    const rows = await sql<ClubRow & { my_role: string }>`
      select
        c.id, c.slug, c.name, c.tagline, c.about, c.cover, c.rules,
        c.created_by, c.created_at,
        (select count(*) from club_members m2 where m2.club_id = c.id) as member_count,
        m.role as my_role
      from clubs c
      inner join club_members m on m.club_id = c.id and m.user_id = ${context.userId}
      where c.deleted_at is null
      order by m.joined_at desc
      limit 100
    `;
    return rows.map((r) => ({
      ...toClub(r),
      myRole: r.my_role as ClubRole,
    }));
  });