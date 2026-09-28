-- Phase 5a: Seller types, profiles, and graduation tracking.
--
-- Introduces a three-tier seller model:
--   private  → default for everyone
--   dealer   → upgraded, admin-approved
--   yard     → upgraded, admin-approved (may become a distinct tier later)
--
-- Graduation criteria (auto-suggest): 4+ months active + 8+ completed deals.
-- Upgrade can also be self-initiated (from settings) or admin-invited.
--
-- All upgrade paths require admin approval before the "verified" badge shows.

-- ── user: seller type, profile, and graduation state ─────────────────────

alter table "user"
  add column if not exists seller_type text not null default 'private'
    check (seller_type in ('private', 'dealer', 'yard'));

alter table "user"
  add column if not exists seller_slug text;

alter table "user"
  add column if not exists seller_bio text;

alter table "user"
  add column if not exists seller_city text;

alter table "user"
  add column if not exists seller_verified boolean not null default false;

alter table "user"
  add column if not exists seller_verified_at timestamptz;

-- null | 'pending' | 'approved' | 'rejected'
alter table "user"
  add column if not exists seller_upgrade_status text;

alter table "user"
  add column if not exists seller_upgraded_at timestamptz;

alter table "user"
  add column if not exists completed_deals integer not null default 0;

-- Ensure slugs are unique when present (Postgres allows multiple NULLs).
create unique index if not exists user_seller_slug_unique
  on "user" (seller_slug)
  where seller_slug is not null;

create index if not exists user_seller_type_idx
  on "user" (seller_type)
  where seller_type <> 'private';

-- ── listings: mark when a deal is closed ─────────────────────────────────

alter table listings
  add column if not exists sold_at timestamptz;

create index if not exists listings_sold_at_idx
  on listings (sold_at)
  where sold_at is not null;