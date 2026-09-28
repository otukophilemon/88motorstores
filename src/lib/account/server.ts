import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";

/**
 * Account server functions — seller profile, upgrade request.
 *
 * All require auth. Reads/writes scoped to the calling user (context.userId).
 */

export type SellerType = "private" | "dealer" | "yard";
export type UpgradeStatus = "pending" | "approved" | "rejected" | null;

export type MyAccount = {
  id: string;
  name: string;
  email: string;
  sellerType: SellerType;
  sellerSlug: string | null;
  sellerBusinessName: string | null;
  sellerBio: string | null;
  sellerCity: string | null;
  sellerVerified: boolean;
  sellerVerifiedAt: string | null;
  upgradeStatus: UpgradeStatus;
  memberSince: string;
  completedDeals: number;
};

// ─── Helpers ─────────────────────────────────────────────────────────────

function iso(v: string | Date): string {
  return typeof v === "string" ? v : v.toISOString();
}

function isoOrNull(v: string | Date | null | undefined): string | null {
  if (v == null) return null;
  return typeof v === "string" ? v : v.toISOString();
}

function toSellerType(v: string): SellerType {
  if (v === "dealer" || v === "yard") return v;
  return "private";
}

function toUpgradeStatus(v: string | null): UpgradeStatus {
  if (v === "pending" || v === "approved" || v === "rejected") return v;
  return null;
}

// ─── getMyAccount ────────────────────────────────────────────────────────

type AccountRow = {
  id: string;
  name: string;
  email: string;
  seller_type: string;
  seller_slug: string | null;
  seller_business_name: string | null;
  seller_bio: string | null;
  seller_city: string | null;
  seller_verified: boolean;
  seller_verified_at: string | Date | null;
  seller_upgrade_status: string | null;
  createdAt: string | Date;      // ← changed
  completed_deals: number;
};

export const getMyAccount = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<MyAccount | null> => {
    const sql = await getSql();
        const rows = await sql<AccountRow>`
      select
        id, name, email, seller_type, seller_slug, seller_business_name,
        seller_bio, seller_city, seller_verified, seller_verified_at,
        seller_upgrade_status, "createdAt", completed_deals
      from "user"
      where id = ${context.userId}
      limit 1
    `;
    const r = rows[0];
    if (!r) return null;
    return {
      id: r.id,
      name: r.name,
      email: r.email,
      sellerType: toSellerType(r.seller_type),
      sellerSlug: r.seller_slug,
      sellerBusinessName: r.seller_business_name,
      sellerBio: r.seller_bio,
      sellerCity: r.seller_city,
      sellerVerified: r.seller_verified,
      sellerVerifiedAt: isoOrNull(r.seller_verified_at),
      upgradeStatus: toUpgradeStatus(r.seller_upgrade_status),
      memberSince: iso(r.createdAt),
      completedDeals: r.completed_deals,
    };
  });

// ─── submitUpgradeRequest ────────────────────────────────────────────────

export type SubmitUpgradeInput = {
  businessName: string;
  desiredSlug: string;
  city: string;
  bio: string;
  type: "dealer" | "yard";
};

export type SubmitUpgradeResult =
  | { ok: true }
  | { ok: false; error: string };

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

export const submitUpgradeRequest = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: SubmitUpgradeInput) => {
    if (!data || typeof data !== "object") throw new Error("Invalid payload.");
    const businessName = String(data.businessName ?? "").trim();
    const desiredSlug = String(data.desiredSlug ?? "").trim();
    const city = String(data.city ?? "").trim();
    const bio = String(data.bio ?? "").trim();
    const type = data.type === "dealer" ? "dealer" : "yard";

    if (!businessName) throw new Error("Business name is required.");
    if (!city) throw new Error("City is required.");
    if (!bio) throw new Error("A short bio is required.");
    if (bio.length < 20) throw new Error("Bio should be at least 20 characters.");

    const slug = slugify(desiredSlug || businessName);
    if (!slug) throw new Error("Could not generate a valid URL slug.");
    if (slug.length < 3) throw new Error("Slug must be at least 3 characters.");

    return { businessName, desiredSlug: slug, city, bio, type };
  })
  .handler(async ({ data, context }): Promise<SubmitUpgradeResult> => {
    try {
      const sql = await getSql();

      // Check the user's current state.
      const currentRows = await sql<{
        seller_type: string;
        seller_upgrade_status: string | null;
      }>`
        select seller_type, seller_upgrade_status
        from "user" where id = ${context.userId} limit 1
      `;
      const current = currentRows[0];
      if (!current) {
        return { ok: false, error: "Account not found." };
      }
      if (current.seller_type !== "private") {
        return { ok: false, error: "You're already a dealer or yard." };
      }
      if (current.seller_upgrade_status === "pending") {
        return { ok: false, error: "You already have a pending request." };
      }

      // Check slug availability.
      const slugTaken = await sql<{ id: string }>`
        select id from "user"
        where seller_slug = ${data.desiredSlug}
        limit 1
      `;
      if (slugTaken.length > 0) {
        return {
          ok: false,
          error: `The URL "/yards/${data.desiredSlug}" is taken. Try a different slug.`,
        };
      }

      // Save the request. We store proposed values on the user row but DON'T
      // flip seller_type yet — that happens on admin approval at /desk.
      await sql`
        update "user" set
          seller_business_name = ${data.businessName},
          seller_bio = ${data.bio},
          seller_city = ${data.city},
          seller_slug = ${data.desiredSlug},
          seller_upgrade_status = 'pending'
        where id = ${context.userId}
      `;

      return { ok: true };
    } catch (err) {
      console.error("[submitUpgradeRequest] failed:", err);
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Could not submit request.",
      };
    }
  });