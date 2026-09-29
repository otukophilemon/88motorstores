-- Garage social feed, unified reactions, and media on club threads/replies.
--
-- Adds:
--   1. garage_posts     — social feed posts (text + media)
--   2. garage_comments  — flat comments on garage posts
--   3. reactions        — one row per (user, target) covering garage posts,
--                         garage comments, club threads, and club replies
--   4. media columns on posts + replies (club threads and replies get images/videos)

-- ── Garage posts ─────────────────────────────────────────────────────────

create table if not exists garage_posts (
  id           text primary key,
  user_id      text not null references "user" ("id") on delete cascade,
  author_name  text not null,
  title        text,
  body         text,
  media        jsonb not null default '[]'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz
);

create index if not exists garage_posts_created_at_idx
  on garage_posts (created_at desc)
  where deleted_at is null;

create index if not exists garage_posts_user_idx
  on garage_posts (user_id);

-- ── Garage comments ──────────────────────────────────────────────────────

create table if not exists garage_comments (
  id           text primary key,
  post_id      text not null references garage_posts (id) on delete cascade,
  user_id      text not null references "user" ("id") on delete cascade,
  author_name  text not null,
  body         text not null,
  media        jsonb not null default '[]'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz
);

create index if not exists garage_comments_post_idx
  on garage_comments (post_id, created_at)
  where deleted_at is null;

create index if not exists garage_comments_user_idx
  on garage_comments (user_id);

-- ── Unified reactions ────────────────────────────────────────────────────
--
-- target_type is one of:
--   'garage_post'    → target_id = garage_posts.id
--   'garage_comment' → target_id = garage_comments.id
--   'thread'         → target_id = posts.id
--   'reply'          → target_id = replies.id
--
-- One row per (target_type, target_id, user_id) — clicking another emoji
-- updates the existing row (last reaction wins).

create table if not exists reactions (
  id           text primary key,
  target_type  text not null
                 check (target_type in ('garage_post', 'garage_comment', 'thread', 'reply')),
  target_id    text not null,
  user_id      text not null references "user" ("id") on delete cascade,
  emoji        text not null
                 check (emoji in ('👍', '❤️', '😂', '😮', '😢', '😡')),
  created_at   timestamptz not null default now(),
  unique (target_type, target_id, user_id)
);

create index if not exists reactions_target_idx
  on reactions (target_type, target_id);

create index if not exists reactions_user_idx
  on reactions (user_id);

-- ── Club threads and replies get media ───────────────────────────────────

alter table posts
  add column if not exists media jsonb not null default '[]'::jsonb;

alter table replies
  add column if not exists media jsonb not null default '[]'::jsonb;