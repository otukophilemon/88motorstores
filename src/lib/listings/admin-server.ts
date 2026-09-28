import { createServerFn } from "@tanstack/react-start";
import { adminMiddleware } from "@/lib/auth/admin-middleware";
import { getSql } from "@/lib/db";

/**
 * Desk (admin) server functions.
 *
 * Every function here uses adminMiddleware — only signed-in users with
 * role='admin' can call them. Non-admins get 403; signed-out users get 401.
 */

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

export type AdminListing = {
  id: string;
  kind: "car" | "part";
  title: string;
  make: string | null;
  model: string | null;
  year: number | null;
  price: number;
  location: string;
  status: "Available" | "Reserved" | "Sold";
  description: string | null;
  fuel: string | null;
  transmission: string | null;
  body: string | null;
  mileage: number | null;
  category: string | null;
  condition: string | null;
  fitment: string | null;
  brand: string | null;
  oem: string | null;
  stock: number | null;
  sellerName: string;
  sellerPhone: string;
  sellerEmail: string | null;
  userId: string | null;
  published: boolean;
  soldAt: string | null;
  images: string[];
  createdAt: string;
};

export type AdminEnquiry = {
  id: string;
  listingId: string | null;
  listingTitle: string;
  buyerName: string;
  buyerPhone: string;
  buyerCity: string | null;
  message: string | null;
  status: "new" | "introduced" | "closed";
  createdAt: string;
  introducedAt: string | null;
};

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

function iso(v: string | Date): string {
  return typeof v === "string" ? v : v.toISOString();
}

function isoOrNull(v: string | Date | null | undefined): string | null {
  if (v == null) return null;
  return typeof v === "string" ? v : v.toISOString();
}

// ────────────────────────────────────────────────────────────────────────────
// Row → typed object mappers
// ────────────────────────────────────────────────────────────────────────────

type ListingRow = {
  id: string;
  kind: string;
  title: string;
  make: string | null;
  model: string | null;
  year: number | null;
  price: string | number;
  location: string;
  status: string;
  description: string | null;
  fuel: string | null;
  transmission: string | null;
  body: string | null;
  mileage: number | null;
  category: string | null;
  condition: string | null;
  fitment: string | null;
  brand: string | null;
  oem: string | null;
  stock: number | null;
  seller_name: string;
  seller_phone: string;
  seller_email: string | null;
  user_id: string | null;
  published: boolean;
  sold_at: string | Date | null;
  images: unknown;
  created_at: string | Date;
};

function toAdminListing(r: ListingRow): AdminListing {
  return {
    id: r.id,
    kind: r.kind === "part" ? "part" : "car",
    title: r.title,
    make: r.make,
    model: r.model,
    year: r.year,
    price: Number(r.price),
    location: r.location,
    status: r.status as AdminListing["status"],
    description: r.description,
    fuel: r.fuel,
    transmission: r.transmission,
    body: r.body,
    mileage: r.mileage,
    category: r.category,
    condition: r.condition,
    fitment: r.fitment,
    brand: r.brand,
    oem: r.oem,
    stock: r.stock,
    sellerName: r.seller_name,
    sellerPhone: r.seller_phone,
    sellerEmail: r.seller_email,
    userId: r.user_id,
    published: r.published,
    soldAt: isoOrNull(r.sold_at),
    images: Array.isArray(r.images) ? (r.images as string[]) : [],
    createdAt: iso(r.created_at),
  };
}

type EnquiryRow = {
  id: string;
  listing_id: string | null;
  listing_title: string;
  buyer_name: string;
  buyer_phone: string;
  buyer_city: string | null;
  message: string | null;
  status: string;
  created_at: string | Date;
  introduced_at: string | Date | null;
};

function toAdminEnquiry(r: EnquiryRow): AdminEnquiry {
  return {
    id: r.id,
    listingId: r.listing_id,
    listingTitle: r.listing_title,
    buyerName: r.buyer_name,
    buyerPhone: r.buyer_phone,
    buyerCity: r.buyer_city,
    message: r.message,
    status: r.status as AdminEnquiry["status"],
    createdAt: iso(r.created_at),
    introducedAt: isoOrNull(r.introduced_at),
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Listings
// ────────────────────────────────────────────────────────────────────────────

export const getPendingListings = createServerFn({ method: "GET" })
  .middleware([adminMiddleware])
  .handler(async (): Promise<AdminListing[]> => {
    const sql = await getSql();
    const rows = await sql<ListingRow>`
      select * from listings
      where published = false
      order by created_at desc
    `;
    return rows.map(toAdminListing);
  });

export const getPublishedListings = createServerFn({ method: "GET" })
  .middleware([adminMiddleware])
  .handler(async (): Promise<AdminListing[]> => {
    const sql = await getSql();
    const rows = await sql<ListingRow>`
      select * from listings
      where published = true
      order by created_at desc
    `;
    return rows.map(toAdminListing);
  });

export const publishListing = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator((data: { id: string }) => {
    if (!data?.id || typeof data.id !== "string") throw new Error("Missing listing id.");
    return { id: data.id };
  })
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    const sql = await getSql();
    await sql`
      update listings set published = true, updated_at = now()
      where id = ${data.id}
    `;
    return { ok: true };
  });

export const unpublishListing = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator((data: { id: string }) => {
    if (!data?.id || typeof data.id !== "string") throw new Error("Missing listing id.");
    return { id: data.id };
  })
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    const sql = await getSql();
    await sql`
      update listings set published = false, updated_at = now()
      where id = ${data.id}
    `;
    return { ok: true };
  });

export const deleteListing = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator((data: { id: string }) => {
    if (!data?.id || typeof data.id !== "string") throw new Error("Missing listing id.");
    return { id: data.id };
  })
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    const sql = await getSql();
    await sql`delete from listings where id = ${data.id}`;
    return { ok: true };
  });

export const markListingSold = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator((data: { id: string }) => {
    if (!data?.id || typeof data.id !== "string") throw new Error("Missing listing id.");
    return { id: data.id };
  })
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    try {
      const sql = await getSql();

      const rows = await sql<{
        user_id: string | null;
        sold_at: string | Date | null;
      }>`
        select user_id, sold_at from listings where id = ${data.id} limit 1
      `;
      const listing = rows[0];
      if (!listing) return { ok: false, error: "Listing not found." };
      if (listing.sold_at) return { ok: false, error: "Already marked as sold." };

      await sql`
        update listings set
          status = 'Sold',
          sold_at = now(),
          updated_at = now()
        where id = ${data.id}
      `;

      if (listing.user_id) {
        await sql`
          update "user" set completed_deals = completed_deals + 1
          where id = ${listing.user_id}
        `;
      }

      return { ok: true };
    } catch (err) {
      console.error("[markListingSold] failed:", err);
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Could not mark sold.",
      };
    }
  });

// ────────────────────────────────────────────────────────────────────────────
// Enquiries
// ────────────────────────────────────────────────────────────────────────────

export const getEnquiries = createServerFn({ method: "GET" })
  .middleware([adminMiddleware])
  .handler(async (): Promise<AdminEnquiry[]> => {
    const sql = await getSql();
    const rows = await sql<EnquiryRow>`
      select * from enquiries
      order by created_at desc
    `;
    return rows.map(toAdminEnquiry);
  });

export const markEnquiryIntroduced = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator((data: { id: string }) => {
    if (!data?.id || typeof data.id !== "string") throw new Error("Missing enquiry id.");
    return { id: data.id };
  })
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    const sql = await getSql();
    await sql`
      update enquiries
      set status = 'introduced', introduced_at = now()
      where id = ${data.id}
    `;
    return { ok: true };
  });

// ────────────────────────────────────────────────────────────────────────────
// Yard applications
// ────────────────────────────────────────────────────────────────────────────

export type YardApplication = {
  userId: string;
  name: string;
  email: string;
  businessName: string | null;
  city: string | null;
  bio: string | null;
  slug: string | null;
  completedDeals: number;
  memberSince: string;
};

type YardRow = {
  id: string;
  name: string;
  email: string;
  seller_business_name: string | null;
  seller_city: string | null;
  seller_bio: string | null;
  seller_slug: string | null;
  completed_deals: number;
  createdAt: string | Date;
};

export const getPendingYardApplications = createServerFn({ method: "GET" })
  .middleware([adminMiddleware])
  .handler(async (): Promise<YardApplication[]> => {
    const sql = await getSql();
    const rows = await sql<YardRow>`
      select
        id, name, email, seller_business_name, seller_city, seller_bio,
        seller_slug, completed_deals, "createdAt"
      from "user"
      where seller_upgrade_status = 'pending'
      order by "createdAt" asc
    `;
    return rows.map((r) => ({
      userId: r.id,
      name: r.name,
      email: r.email,
      businessName: r.seller_business_name,
      city: r.seller_city,
      bio: r.seller_bio,
      slug: r.seller_slug,
      completedDeals: r.completed_deals,
      memberSince:
        typeof r.createdAt === "string" ? r.createdAt : r.createdAt.toISOString(),
    }));
  });

export const approveYardApplication = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator((data: { userId: string; type: "dealer" | "yard" }) => {
    if (!data?.userId || typeof data.userId !== "string") {
      throw new Error("Missing userId.");
    }
    const type = data.type === "yard" ? "yard" : "dealer";
    return { userId: data.userId, type };
  })
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    try {
      const sql = await getSql();
      await sql`
        update "user" set
          seller_type = ${data.type},
          seller_verified = true,
          seller_verified_at = now(),
          seller_upgrade_status = 'approved',
          seller_upgraded_at = now()
        where id = ${data.userId}
          and seller_upgrade_status = 'pending'
      `;
      return { ok: true };
    } catch (err) {
      console.error("[approveYardApplication] failed:", err);
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Could not approve.",
      };
    }
  });

export const rejectYardApplication = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator((data: { userId: string }) => {
    if (!data?.userId || typeof data.userId !== "string") {
      throw new Error("Missing userId.");
    }
    return { userId: data.userId };
  })
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    try {
      const sql = await getSql();
      await sql`
        update "user" set
          seller_upgrade_status = 'rejected',
          seller_slug = null
        where id = ${data.userId}
          and seller_upgrade_status = 'pending'
      `;
      return { ok: true };
    } catch (err) {
      console.error("[rejectYardApplication] failed:", err);
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Could not reject.",
      };
    }
  });

// ────────────────────────────────────────────────────────────────────────────
// Graduation candidates (private sellers ready to become dealers)
// ────────────────────────────────────────────────────────────────────────────

export type GraduationCandidate = {
  userId: string;
  name: string;
  email: string;
  completedDeals: number;
  memberSince: string;
  monthsActive: number;
};

export const getGraduationCandidates = createServerFn({ method: "GET" })
  .middleware([adminMiddleware])
  .handler(async (): Promise<GraduationCandidate[]> => {
    const sql = await getSql();
    const rows = await sql<{
      id: string;
      name: string;
      email: string;
      completed_deals: number;
      createdAt: string | Date;
    }>`
      select id, name, email, completed_deals, "createdAt"
      from "user"
      where seller_type = 'private'
        and seller_upgrade_status is null
        and completed_deals >= 8
        and "createdAt" <= now() - interval '4 months'
      order by completed_deals desc
      limit 50
    `;
    const now = Date.now();
    return rows.map((r) => {
      const created =
        typeof r.createdAt === "string" ? new Date(r.createdAt) : r.createdAt;
      const months = Math.floor((now - created.getTime()) / (1000 * 60 * 60 * 24 * 30));
      return {
        userId: r.id,
        name: r.name,
        email: r.email,
        completedDeals: r.completed_deals,
        memberSince: created.toISOString(),
        monthsActive: months,
      };
    });
  });