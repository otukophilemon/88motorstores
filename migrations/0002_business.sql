-- 88Motor Stores — business schema
--
-- Guest-first marketplace: buyers and sellers do NOT need accounts.
-- Sellers submit listings directly; the desk (admin) manages intros.
-- Accounts are optional and only needed for clubs, posts, and admin access.
--
-- All per-user tables use `user_id text` referencing "user"("id") — matching
-- the auth schema's TEXT primary key (not UUID).

-- ============================================================
-- LISTINGS — cars and parts, submitted by guests or users
-- ============================================================
create table if not exists listings (
  id              text primary key,
  kind            text not null check (kind in ('car', 'part')),
  title           text not null,
  make            text,
  model           text,
  year            integer,
  price           bigint not null,
  location        text not null,
  status          text not null default 'Available'
                    check (status in ('Available', 'Reserved', 'Sold')),
  description     text,
  -- Car-specific
  fuel            text check (fuel in ('Petrol', 'Diesel', 'Hybrid')),
  transmission    text check (transmission in ('Automatic', 'Manual')),
  body            text,
  mileage         integer,
  -- Part-specific
  category        text,
  condition       text,
  fitment         text,
  brand           text,
  oem             text,
  stock           integer,
  -- Seller contact (visible to admin/desk only — never to buyers)
  seller_name     text not null,
  seller_phone    text not null,
  seller_email    text,
  -- Optional link if the seller has an account
  user_id         text references "user" ("id") on delete set null,
  -- Moderation
  published       boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists listings_kind_idx on listings (kind);
create index if not exists listings_status_idx on listings (status);
create index if not exists listings_published_idx on listings (published);
create index if not exists listings_created_at_idx on listings (created_at desc);
create index if not exists listings_user_id_idx on listings (user_id);

-- ============================================================
-- ENQUIRIES — buyer requests "request an introduction"
-- ============================================================
create table if not exists enquiries (
  id              text primary key,
  listing_id      text references listings (id) on delete set null,
  listing_title   text not null,               -- snapshot in case listing is deleted
  buyer_name      text not null,
  buyer_phone     text not null,
  buyer_city      text,
  message         text,
  status          text not null default 'new'
                    check (status in ('new', 'introduced', 'closed')),
  created_at      timestamptz not null default now(),
  introduced_at   timestamptz
);

create index if not exists enquiries_status_idx on enquiries (status);
create index if not exists enquiries_listing_id_idx on enquiries (listing_id);
create index if not exists enquiries_created_at_idx on enquiries (created_at desc);

-- ============================================================
-- CLUBS — car communities (Subaru STI Club, etc.)
-- ============================================================
create table if not exists clubs (
  id              text primary key,
  slug            text not null unique,
  name            text not null,
  tagline         text,
  make            text,                         -- optional: "Subaru", "Toyota"
  about           text,
  cover           text,                         -- image URL
  created_by      text references "user" ("id") on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists clubs_slug_idx on clubs (slug);
create index if not exists clubs_make_idx on clubs (make);

-- ============================================================
-- CLUB MEMBERS — who belongs to which club
-- ============================================================
create table if not exists club_members (
  club_id         text not null references clubs (id) on delete cascade,
  user_id         text not null references "user" ("id") on delete cascade,
  role            text not null default 'member'
                    check (role in ('member', 'moderator', 'owner')),
  joined_at       timestamptz not null default now(),
  primary key (club_id, user_id)
);

create index if not exists club_members_user_id_idx on club_members (user_id);

-- ============================================================
-- POSTS — threads in clubs OR general chat (club_id null)
-- ============================================================
create table if not exists posts (
  id              text primary key,
  club_id         text references clubs (id) on delete cascade,
  user_id         text not null references "user" ("id") on delete cascade,
  author_name     text not null,               -- snapshot for display
  title           text,
  body            text not null,
  pinned          boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists posts_club_id_idx on posts (club_id);
create index if not exists posts_user_id_idx on posts (user_id);
create index if not exists posts_created_at_idx on posts (created_at desc);
create index if not exists posts_pinned_idx on posts (pinned) where pinned = true;

-- ============================================================
-- REPLIES — responses to posts
-- ============================================================
create table if not exists replies (
  id              text primary key,
  post_id         text not null references posts (id) on delete cascade,
  user_id         text not null references "user" ("id") on delete cascade,
  author_name     text not null,
  body            text not null,
  created_at      timestamptz not null default now()
);

create index if not exists replies_post_id_idx on replies (post_id);
create index if not exists replies_created_at_idx on replies (created_at desc);

-- ============================================================
-- ADMIN ROLE — add a role column to the user table
-- ============================================================
alter table "user" add column if not exists role text not null default 'user'
  check (role in ('user', 'admin'));

create index if not exists user_role_idx on "user" (role);