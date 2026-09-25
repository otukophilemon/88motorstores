import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";

/**
 * Seller listing submission (server-only).
 *
 * Called from the Sell page. Requires a signed-in seller (authMiddleware).
 * Inserts the listing with published=false — nothing appears on the public
 * Cars/Parts pages until the operator publishes it from /desk.
 */

export type CreateListingInput = {
  kind: "car" | "part";
  title: string;
  make: string;
  model: string;
  year?: number;
  price: number;
  location: string;
  status: "Available" | "Reserved" | "Sold";
  description: string;
  // Car-specific
  fuel?: "Petrol" | "Diesel" | "Hybrid";
  transmission?: "Automatic" | "Manual";
  body?: string;
  mileage?: number;
  // Part-specific
  category?: string;
  condition?: string;
  fitment?: string;
  brand?: string;
  oem?: string;
  stock?: number;
  // Seller contact (kept private — only visible at /desk)
  sellerName: string;
  sellerPhone: string;
  sellerEmail?: string;
};

export type CreateListingResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

function nid() {
  return `lst_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

export const createListing = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: CreateListingInput) => {
    if (!data || typeof data !== "object") {
      throw new Error("Invalid payload");
    }
    const title = String(data.title ?? "").trim();
    const location = String(data.location ?? "").trim();
    const sellerName = String(data.sellerName ?? "").trim();
    const sellerPhone = String(data.sellerPhone ?? "").trim();
    const price = Number(data.price);

    if (!title) throw new Error("Title is required.");
    if (!location) throw new Error("Location is required.");
    if (!sellerName) throw new Error("Seller name is required.");
    if (!sellerPhone) throw new Error("Seller WhatsApp is required.");
    if (!Number.isFinite(price) || price <= 0) throw new Error("A valid price is required.");

    return {
      kind: data.kind === "part" ? "part" : "car",
      title,
      make: String(data.make ?? "").trim(),
      model: String(data.model ?? "").trim(),
      year: data.year != null && Number.isFinite(Number(data.year)) ? Number(data.year) : undefined,
      price,
      location,
      status:
        data.status === "Sold" || data.status === "Reserved" ? data.status : "Available",
      description: String(data.description ?? "").trim(),
      fuel: data.fuel,
      transmission: data.transmission,
      body: data.body ? String(data.body).trim() : undefined,
      mileage: data.mileage != null && Number.isFinite(Number(data.mileage)) ? Number(data.mileage) : undefined,
      category: data.category ? String(data.category).trim() : undefined,
      condition: data.condition ? String(data.condition).trim() : undefined,
      fitment: data.fitment ? String(data.fitment).trim() : undefined,
      brand: data.brand ? String(data.brand).trim() : undefined,
      oem: data.oem ? String(data.oem).trim() : undefined,
      stock: data.stock != null && Number.isFinite(Number(data.stock)) ? Number(data.stock) : undefined,
      sellerName,
      sellerPhone,
      sellerEmail: data.sellerEmail ? String(data.sellerEmail).trim() : undefined,
    } satisfies CreateListingInput;
  })
  .handler(async ({ data, context }): Promise<CreateListingResult> => {
    try {
      const sql = await getSql();
      const id = nid();
      await sql`
        insert into listings (
          id, kind, title, make, model, year, price, location, status,
          description, fuel, transmission, body, mileage,
          category, condition, fitment, brand, oem, stock,
          seller_name, seller_phone, seller_email, user_id, published
        ) values (
          ${id}, ${data.kind}, ${data.title}, ${data.make}, ${data.model},
          ${data.year ?? null}, ${data.price}, ${data.location}, ${data.status},
          ${data.description}, ${data.fuel ?? null}, ${data.transmission ?? null},
          ${data.body ?? null}, ${data.mileage ?? null},
          ${data.category ?? null}, ${data.condition ?? null}, ${data.fitment ?? null},
          ${data.brand ?? null}, ${data.oem ?? null}, ${data.stock ?? null},
          ${data.sellerName}, ${data.sellerPhone}, ${data.sellerEmail ?? null},
          ${context.userId}, false
        )
      `;
      return { ok: true, id };
    } catch (err) {
      console.error("[createListing] failed:", err);
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Could not save listing.",
      };
    }
  });