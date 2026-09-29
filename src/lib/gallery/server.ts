import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";

/**
 * Gallery server functions — public reads only.
 *
 * The gallery is a VIEW over media that already exists in other tables:
 *   - cars / parts   → listings.images
 *   - garage posts   → garage_posts.media
 *   - club threads   → posts.media        (per club)
 *   - club replies   → replies.media      (per club)
 *
 * No writes here — media is created elsewhere and surfaces automatically.
 */

export type GallerySource = "car" | "part" | "garage";

export type GalleryItem = {
  id: string;
  source: GallerySource;
  sourceId: string;
  title: string | null;
  authorName: string;
  location: string | null;
  price: number | null;
  media: string;
  mediaType: "image" | "video";
  href: string;
  createdAt: string;
  clubSlug?: string;
};

// ─── Helpers ────────────────────────────────────────────────────────────

function iso(v: string | Date): string {
  return typeof v === "string" ? v : v.toISOString();
}

function normalizeMedia(
  raw: unknown,
): { url: string; type: "image" | "video" }[] {
  if (!Array.isArray(raw)) return [];
  const out: { url: string; type: "image" | "video" }[] = [];
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

// ─── listGalleryItems ───────────────────────────────────────────────────

export const listGalleryItems = createServerFn({ method: "POST" })
  .validator((data: { source?: GallerySource | "all"; limit?: number }) => {
    const source =
      data?.source === "car" ||
      data?.source === "part" ||
      data?.source === "garage"
        ? data.source
        : "all";
    const limit = Number(data?.limit ?? 60);
    return {
      source,
      limit: Number.isFinite(limit) && limit > 0 ? Math.min(limit, 200) : 60,
    };
  })
  .handler(async ({ data }): Promise<GalleryItem[]> => {
    const sql = await getSql();
    const items: GalleryItem[] = [];

    const wantCars = data.source === "all" || data.source === "car";
    const wantParts = data.source === "all" || data.source === "part";
    const wantGarage = data.source === "all" || data.source === "garage";

    if (wantCars || wantParts) {
      const kindFilter =
        wantCars && wantParts ? null : wantCars ? "car" : "part";
      const rows = await sql<{
        id: string;
        kind: string;
        title: string;
        location: string;
        price: string | number;
        seller_name: string;
        images: unknown;
        created_at: string | Date;
      }>`
        select id, kind, title, location, price, seller_name, images, created_at
        from listings
        where published = true
          and (${kindFilter}::text is null or kind = ${kindFilter})
          and jsonb_array_length(images) > 0
        order by created_at desc
        limit ${data.limit}
      `;
      for (const r of rows) {
        const media = normalizeMedia(r.images);
        const first = media[0];
        if (!first) continue;
        const kind: GallerySource = r.kind === "part" ? "part" : "car";
        items.push({
          id: `${kind}:${r.id}`,
          source: kind,
          sourceId: r.id,
          title: r.title,
          authorName: r.seller_name,
          location: r.location,
          price: Number(r.price),
          media: first.url,
          mediaType: first.type,
          href: kind === "car" ? `/cars/${r.id}` : `/parts/${r.id}`,
          createdAt: iso(r.created_at),
        });
      }
    }

    if (wantGarage) {
      const rows = await sql<{
        id: string;
        author_name: string;
        title: string | null;
        media: unknown;
        created_at: string | Date;
      }>`
        select id, author_name, title, media, created_at
        from garage_posts
        where deleted_at is null and jsonb_array_length(media) > 0
        order by created_at desc
        limit ${data.limit}
      `;
      for (const r of rows) {
        const media = normalizeMedia(r.media);
        const first = media[0];
        if (!first) continue;
        items.push({
          id: `garage:${r.id}`,
          source: "garage",
          sourceId: r.id,
          title: r.title,
          authorName: r.author_name,
          location: null,
          price: null,
          media: first.url,
          mediaType: first.type,
          href: `/garage/${r.id}`,
          createdAt: iso(r.created_at),
        });
      }
    }

    items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    return items.slice(0, data.limit);
  });

// ─── listClubGalleryItems ───────────────────────────────────────────────

export const listClubGalleryItems = createServerFn({ method: "POST" })
  .validator((data: { clubSlug: string; limit?: number }) => {
    if (!data?.clubSlug || typeof data.clubSlug !== "string") {
      throw new Error("Missing clubSlug.");
    }
    const limit = Number(data?.limit ?? 60);
    return {
      clubSlug: data.clubSlug,
      limit: Number.isFinite(limit) && limit > 0 ? Math.min(limit, 200) : 60,
    };
  })
  .handler(async ({ data }): Promise<GalleryItem[]> => {
    const sql = await getSql();
    const items: GalleryItem[] = [];

    const threads = await sql<{
      id: string;
      author_name: string;
      title: string | null;
      media: unknown;
      created_at: string | Date;
    }>`
      select p.id, p.author_name, p.title, p.media, p.created_at
      from posts p
      where p.club_slug = ${data.clubSlug}
        and jsonb_array_length(p.media) > 0
      order by p.created_at desc
      limit ${data.limit}
    `;
    for (const r of threads) {
      const media = normalizeMedia(r.media);
      const first = media[0];
      if (!first) continue;
      items.push({
        id: `thread:${r.id}`,
        source: "garage",
        sourceId: r.id,
        title: r.title,
        authorName: r.author_name,
        location: null,
        price: null,
        media: first.url,
        mediaType: first.type,
        href: `/nations/${data.clubSlug}/${r.id}`,
        createdAt: iso(r.created_at),
        clubSlug: data.clubSlug,
      });
    }

    const replies = await sql<{
      id: string;
      post_id: string;
      author_name: string;
      media: unknown;
      created_at: string | Date;
    }>`
      select r.id, r.post_id, r.author_name, r.media, r.created_at
      from replies r
      inner join posts p on p.id = r.post_id
      where p.club_slug = ${data.clubSlug}
        and jsonb_array_length(r.media) > 0
      order by r.created_at desc
      limit ${data.limit}
    `;
    for (const r of replies) {
      const media = normalizeMedia(r.media);
      const first = media[0];
      if (!first) continue;
      items.push({
        id: `reply:${r.id}`,
        source: "garage",
        sourceId: r.id,
        title: null,
        authorName: r.author_name,
        location: null,
        price: null,
        media: first.url,
        mediaType: first.type,
        href: `/nations/${data.clubSlug}/${r.post_id}`,
        createdAt: iso(r.created_at),
        clubSlug: data.clubSlug,
      });
    }

    items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    return items.slice(0, data.limit);
  });