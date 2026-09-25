import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";

/**
 * Public enquiry submission (server-only).
 *
 * Buyers do NOT need an account — any visitor can request an introduction.
 * The enquiry lands on the desk with status='new'. Admin (desk) reads these
 * via src/lib/listings/admin-server.ts (getEnquiries, markEnquiryIntroduced).
 *
 * Privacy note: buyer contact info (name, phone, city) is stored in the DB but
 * is only readable via admin-only server functions. Public pages never return it.
 */

export type CreateEnquiryInput = {
  listingId?: string;      // optional — some enquiries may be "general"
  listingTitle: string;    // snapshot of the listing title at submit time
  buyerName: string;
  buyerPhone: string;
  buyerCity?: string;
  message?: string;
};

export type CreateEnquiryResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

function nid() {
  return `enq_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

export const createEnquiry = createServerFn({ method: "POST" })
  .validator((data: CreateEnquiryInput) => {
    if (!data || typeof data !== "object") throw new Error("Invalid payload");
    const listingTitle = String(data.listingTitle ?? "").trim();
    const buyerName = String(data.buyerName ?? "").trim();
    const buyerPhone = String(data.buyerPhone ?? "").trim();

    if (!listingTitle) throw new Error("Missing listing reference.");
    if (!buyerName) throw new Error("Your name is required.");
    if (!buyerPhone) throw new Error("Your WhatsApp number is required.");

    return {
      listingId: data.listingId ? String(data.listingId).trim() : undefined,
      listingTitle,
      buyerName,
      buyerPhone,
      buyerCity: data.buyerCity ? String(data.buyerCity).trim() : undefined,
      message: data.message ? String(data.message).trim() : undefined,
    } satisfies CreateEnquiryInput;
  })
  .handler(async ({ data }): Promise<CreateEnquiryResult> => {
    try {
      const sql = await getSql();
      const id = nid();
      await sql`
        insert into enquiries (
          id, listing_id, listing_title,
          buyer_name, buyer_phone, buyer_city, message, status
        ) values (
          ${id}, ${data.listingId ?? null}, ${data.listingTitle},
          ${data.buyerName}, ${data.buyerPhone}, ${data.buyerCity ?? null},
          ${data.message ?? null}, 'new'
        )
      `;
      return { ok: true, id };
    } catch (err) {
      console.error("[createEnquiry] failed:", err);
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Could not submit enquiry.",
      };
    }
  });