import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";

export type SellerType = "private" | "dealer" | "yard";

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
  sellerName: string;
  sellerType: SellerType;
  sellerSlug: string | null;
  sellerVerified: boolean;
  images: string[];
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
  seller_type: string | null;
  seller_slug: string | null;
  seller_verified: boolean | null;
  images: unknown;
  created_at: string | Date;
};

function toSellerType(v: string | null): SellerType {
  if (v === "dealer" || v === "yard") return v;
  return "private";
}

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
    sellerType: toSellerType(r.seller_type),
    sellerSlug: r.seller_slug,
    sellerVerified: Boolean(r.seller_verified),
    images: Array.isArray(r.images) ? (r.images as string[]) : [],
    createdAt:
      typeof r.created_at === "string" ? r.created_at : r.created_at.toISOString(),
  };
}

export const getPublishedCars = createServerFn({ method: "GET" }).handler(
  async (): Promise<PublicListing[]> => {
    const sql = await getSql();
    const rows = await sql<Row>`
      select
        l.id, l.kind, l.title, l.make, l.model, l.year, l.price, l.location,
        l.status, l.description, l.fuel, l.transmission, l.body, l.mileage,
        l.category, l.condition, l.fitment, l.brand, l.oem, l.stock,
        l.seller_name, l.images, l.created_at,
        u.seller_type     as seller_type,
        u.seller_slug     as seller_slug,
        u.seller_verified as seller_verified
      from listings l
      left join "user" u on u.id = l.user_id
      where l.published = true and l.kind = 'car'
      order by l.created_at desc
    `;
    return rows.map(toPublicListing);
  },
);

export const getPublishedParts = createServerFn({ method: "GET" }).handler(
  async (): Promise<PublicListing[]> => {
    const sql = await getSql();
    const rows = await sql<Row>`
      select
        l.id, l.kind, l.title, l.make, l.model, l.year, l.price, l.location,
        l.status, l.description, l.fuel, l.transmission, l.body, l.mileage,
        l.category, l.condition, l.fitment, l.brand, l.oem, l.stock,
        l.seller_name, l.images, l.created_at,
        u.seller_type     as seller_type,
        u.seller_slug     as seller_slug,
        u.seller_verified as seller_verified
      from listings l
      left join "user" u on u.id = l.user_id
      where l.published = true and l.kind = 'part'
      order by l.created_at desc
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
        l.id, l.kind, l.title, l.make, l.model, l.year, l.price, l.location,
        l.status, l.description, l.fuel, l.transmission, l.body, l.mileage,
        l.category, l.condition, l.fitment, l.brand, l.oem, l.stock,
        l.seller_name, l.images, l.created_at,
        u.seller_type     as seller_type,
        u.seller_slug     as seller_slug,
        u.seller_verified as seller_verified
      from listings l
      left join "user" u on u.id = l.user_id
      where l.id = ${data.id} and l.published = true
      limit 1
    `;
    const row = rows[0];
    return row ? toPublicListing(row) : null;
  });

export type SellerProfile = {
  id: string;
  slug: string;
  displayName: string;
  sellerType: SellerType;
  bio: string | null;
  city: string | null;
  verified: boolean;
  verifiedAt: string | null;
  memberSince: string;
  completedDeals: number;
};

type SellerRow = {
  id: string;
  seller_slug: string | null;
  name: string;
  seller_type: string;
  seller_bio: string | null;
  seller_city: string | null;
  seller_verified: boolean;
  seller_verified_at: string | Date | null;
  createdAt: string | Date;
  completed_deals: number;
};

export const getSellerProfile = createServerFn({ method: "POST" })
  .validator((data: { slug: string }) => {
    if (!data?.slug || typeof data.slug !== "string") {
      throw new Error("Missing slug.");
    }
    return { slug: data.slug };
  })
  .handler(async ({ data }): Promise<SellerProfile | null> => {
    const sql = await getSql();
    const rows = await sql<SellerRow>`
      select
        id, seller_slug, name, seller_type, seller_bio, seller_city,
        seller_verified, seller_verified_at, "createdAt", completed_deals
      from "user"
      where seller_slug = ${data.slug}
        and seller_type in ('dealer', 'yard')
      limit 1
    `;
    const r = rows[0];
    if (!r) return null;
    return {
      id: r.id,
      slug: r.seller_slug ?? "",
      displayName: r.name,
      sellerType: toSellerType(r.seller_type),
      bio: r.seller_bio,
      city: r.seller_city,
      verified: r.seller_verified,
      verifiedAt:
        r.seller_verified_at == null
          ? null
          : typeof r.seller_verified_at === "string"
            ? r.seller_verified_at
            : r.seller_verified_at.toISOString(),
      memberSince:
        typeof r.createdAt === "string" ? r.createdAt : r.createdAt.toISOString(),
      completedDeals: r.completed_deals,
    };
  });

export const getListingsBySeller = createServerFn({ method: "POST" })
  .validator((data: { slug: string }) => {
    if (!data?.slug || typeof data.slug !== "string") {
      throw new Error("Missing slug.");
    }
    return { slug: data.slug };
  })
  .handler(async ({ data }): Promise<PublicListing[]> => {
    const sql = await getSql();
    const rows = await sql<Row>`
      select
        l.id, l.kind, l.title, l.make, l.model, l.year, l.price, l.location,
        l.status, l.description, l.fuel, l.transmission, l.body, l.mileage,
        l.category, l.condition, l.fitment, l.brand, l.oem, l.stock,
        l.seller_name, l.images, l.created_at,
        u.seller_type     as seller_type,
        u.seller_slug     as seller_slug,
        u.seller_verified as seller_verified
      from listings l
      inner join "user" u on u.id = l.user_id
      where u.seller_slug = ${data.slug}
        and l.published = true
      order by l.created_at desc
    `;
    return rows.map(toPublicListing);
  });

export const getPrivateMixedListings = createServerFn({ method: "POST" })
  .validator((data: { limit?: number }) => {
    const limit = Number(data?.limit ?? 6);
    return { limit: Number.isFinite(limit) && limit > 0 ? Math.min(limit, 20) : 6 };
  })
  .handler(async ({ data }): Promise<PublicListing[]> => {
    const sql = await getSql();
    const rows = await sql<Row>`
      select
        l.id, l.kind, l.title, l.make, l.model, l.year, l.price, l.location,
        l.status, l.description, l.fuel, l.transmission, l.body, l.mileage,
        l.category, l.condition, l.fitment, l.brand, l.oem, l.stock,
        l.seller_name, l.images, l.created_at,
        u.seller_type     as seller_type,
        u.seller_slug     as seller_slug,
        u.seller_verified as seller_verified
      from listings l
      left join "user" u on u.id = l.user_id
      where l.published = true
        and (u.seller_type is null or u.seller_type = 'private')
      order by random()
      limit ${data.limit}
    `;
    return rows.map(toPublicListing);
  });

export const getYardMixedListings = createServerFn({ method: "POST" })
  .validator((data: { limit?: number }) => {
    const limit = Number(data?.limit ?? 6);
    return { limit: Number.isFinite(limit) && limit > 0 ? Math.min(limit, 20) : 6 };
  })
  .handler(async ({ data }): Promise<PublicListing[]> => {
    const sql = await getSql();
    const rows = await sql<Row>`
      select
        l.id, l.kind, l.title, l.make, l.model, l.year, l.price, l.location,
        l.status, l.description, l.fuel, l.transmission, l.body, l.mileage,
        l.category, l.condition, l.fitment, l.brand, l.oem, l.stock,
        l.seller_name, l.images, l.created_at,
        u.seller_type     as seller_type,
        u.seller_slug     as seller_slug,
        u.seller_verified as seller_verified
      from listings l
      inner join "user" u on u.id = l.user_id
      where l.published = true
        and u.seller_type in ('yard', 'dealer')
      order by random()
      limit ${data.limit}
    `;
    return rows.map(toPublicListing);
  });

export const getPrivateCars = createServerFn({ method: "POST" })
  .validator((data: { limit?: number }) => {
    const limit = Number(data?.limit ?? 4);
    return { limit: Number.isFinite(limit) && limit > 0 ? Math.min(limit, 12) : 4 };
  })
  .handler(async ({ data }): Promise<PublicListing[]> => {
    const sql = await getSql();
    const rows = await sql<Row>`
      select
        l.id, l.kind, l.title, l.make, l.model, l.year, l.price, l.location,
        l.status, l.description, l.fuel, l.transmission, l.body, l.mileage,
        l.category, l.condition, l.fitment, l.brand, l.oem, l.stock,
        l.seller_name, l.images, l.created_at,
        u.seller_type     as seller_type,
        u.seller_slug     as seller_slug,
        u.seller_verified as seller_verified
      from listings l
      left join "user" u on u.id = l.user_id
      where l.published = true
        and l.kind = 'car'
        and (u.seller_type is null or u.seller_type = 'private')
      order by l.created_at desc
      limit ${data.limit}
    `;
    return rows.map(toPublicListing);
  });

export const getYardCars = createServerFn({ method: "POST" })
  .validator((data: { limit?: number }) => {
    const limit = Number(data?.limit ?? 4);
    return { limit: Number.isFinite(limit) && limit > 0 ? Math.min(limit, 12) : 4 };
  })
  .handler(async ({ data }): Promise<PublicListing[]> => {
    const sql = await getSql();
    const rows = await sql<Row>`
      select
        l.id, l.kind, l.title, l.make, l.model, l.year, l.price, l.location,
        l.status, l.description, l.fuel, l.transmission, l.body, l.mileage,
        l.category, l.condition, l.fitment, l.brand, l.oem, l.stock,
        l.seller_name, l.images, l.created_at,
        u.seller_type     as seller_type,
        u.seller_slug     as seller_slug,
        u.seller_verified as seller_verified
      from listings l
      inner join "user" u on u.id = l.user_id
      where l.published = true
        and l.kind = 'car'
        and u.seller_type in ('yard', 'dealer')
      order by l.created_at desc
      limit ${data.limit}
    `;
    return rows.map(toPublicListing);
  });

export const getPrivateParts = createServerFn({ method: "POST" })
  .validator((data: { limit?: number }) => {
    const limit = Number(data?.limit ?? 4);
    return { limit: Number.isFinite(limit) && limit > 0 ? Math.min(limit, 12) : 4 };
  })
  .handler(async ({ data }): Promise<PublicListing[]> => {
    const sql = await getSql();
    const rows = await sql<Row>`
      select
        l.id, l.kind, l.title, l.make, l.model, l.year, l.price, l.location,
        l.status, l.description, l.fuel, l.transmission, l.body, l.mileage,
        l.category, l.condition, l.fitment, l.brand, l.oem, l.stock,
        l.seller_name, l.images, l.created_at,
        u.seller_type     as seller_type,
        u.seller_slug     as seller_slug,
        u.seller_verified as seller_verified
      from listings l
      left join "user" u on u.id = l.user_id
      where l.published = true
        and l.kind = 'part'
        and (u.seller_type is null or u.seller_type = 'private')
      order by l.created_at desc
      limit ${data.limit}
    `;
    return rows.map(toPublicListing);
  });

export const getYardParts = createServerFn({ method: "POST" })
  .validator((data: { limit?: number }) => {
    const limit = Number(data?.limit ?? 4);
    return { limit: Number.isFinite(limit) && limit > 0 ? Math.min(limit, 12) : 4 };
  })
  .handler(async ({ data }): Promise<PublicListing[]> => {
    const sql = await getSql();
    const rows = await sql<Row>`
      select
        l.id, l.kind, l.title, l.make, l.model, l.year, l.price, l.location,
        l.status, l.description, l.fuel, l.transmission, l.body, l.mileage,
        l.category, l.condition, l.fitment, l.brand, l.oem, l.stock,
        l.seller_name, l.images, l.created_at,
        u.seller_type     as seller_type,
        u.seller_slug     as seller_slug,
        u.seller_verified as seller_verified
      from listings l
      inner join "user" u on u.id = l.user_id
      where l.published = true
        and l.kind = 'part'
        and u.seller_type in ('yard', 'dealer')
      order by l.created_at desc
      limit ${data.limit}
    `;
    return rows.map(toPublicListing);
  });

export type MarketplaceStats = {
  privateSellers: number;
  yards: number;
  cities: number;
  listings: number;
};

export const getMarketplaceStats = createServerFn({ method: "GET" }).handler(
  async (): Promise<MarketplaceStats> => {
    const sql = await getSql();

    const sellers = await sql<{ private_count: string; yard_count: string }>`
      select
        count(distinct case when u.seller_type is null or u.seller_type = 'private' then u.id end) as private_count,
        count(distinct case when u.seller_type in ('yard', 'dealer') then u.id end) as yard_count
      from "user" u
      inner join listings l on l.user_id = u.id
      where l.published = true
    `;

    const cities = await sql<{ count: string }>`
      select count(distinct lower(trim(split_part(location, ',', 1)))) as count
      from listings
      where published = true and location is not null and location <> ''
    `;

    const listings = await sql<{ count: string }>`
      select count(*) as count from listings where published = true
    `;

    return {
      privateSellers: Number(sellers[0]?.private_count ?? 0),
      yards: Number(sellers[0]?.yard_count ?? 0),
      cities: Number(cities[0]?.count ?? 0),
      listings: Number(listings[0]?.count ?? 0),
    };
  },
);