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
    createdAt: typeof r.created_at === "string" ? r.created_at : r.created_at.toISOString(),
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
    createdAt: typeof r.created_at === "string" ? r.created_at : r.created_at.toISOString(),
    introducedAt:
      r.introduced_at == null
        ? null
        : typeof r.introduced_at === "string"
          ? r.introduced_at
          : r.introduced_at.toISOString(),
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