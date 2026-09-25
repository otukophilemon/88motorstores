import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";

/**
 * Public listing server functions.
 *
 * No auth required — buyers browse without an account. Only PUBLISHED listings
 * are returned. Seller contact info is NEVER included in these payloads —
 * only the desk (via admin-server.ts) sees seller phone/email.
 */

export type PublicListing = {
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
  sellerName: string;    // visible to buyers — "Listed by John M."
  createdAt: string;
};

type Row = {
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
  created_at: string | Date;
};

function toPublicListing(r: Row): PublicListing {
  return {
    id: r.id,
    kind: r.kind === "part" ? "part" : "car",
    title: r.title,
    make: r.make,
    model: r.model,
    year: r.year,
    price: Number(r.price),
    location: r.location,
    status: r.status as PublicListing["status"],
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
    createdAt: typeof r.created_at === "string" ? r.created_at : r.created_at.toISOString(),
  };
}

export const getPublishedCars = createServerFn({ method: "GET" }).handler(
  async (): Promise<PublicListing[]> => {
    const sql = await getSql();
    const rows = await sql<Row>`
      select
        id, kind, title, make, model, year, price, location, status, description,
        fuel, transmission, body, mileage,
        category, condition, fitment, brand, oem, stock,
        seller_name, created_at
      from listings
      where published = true and kind = 'car'
      order by created_at desc
    `;
    return rows.map(toPublicListing);
  },
);

export const getPublishedParts = createServerFn({ method: "GET" }).handler(
  async (): Promise<PublicListing[]> => {
    const sql = await getSql();
    const rows = await sql<Row>`
      select
        id, kind, title, make, model, year, price, location, status, description,
        fuel, transmission, body, mileage,
        category, condition, fitment, brand, oem, stock,
        seller_name, created_at
      from listings
      where published = true and kind = 'part'
      order by created_at desc
    `;
    return rows.map(toPublicListing);
  },
);

export const getPublishedListing = createServerFn({ method: "POST" })
  .validator((data: { id: string }) => {
    if (!data?.id || typeof data.id !== "string") throw new Error("Missing listing id.");
    return { id: data.id };
  })
  .handler(async ({ data }): Promise<PublicListing | null> => {
    const sql = await getSql();
    const rows = await sql<Row>`
      select
        id, kind, title, make, model, year, price, location, status, description,
        fuel, transmission, body, mileage,
        category, condition, fitment, brand, oem, stock,
        seller_name, created_at
      from listings
      where id = ${data.id} and published = true
      limit 1
    `;
    const row = rows[0];
    return row ? toPublicListing(row) : null;
  });