-- Add club_slug to posts.
--
-- Demo clubs (from catalog.ts) are identified by slug, not by a DB UUID.
-- Linking posts by slug now lets club posts work without migrating the
-- clubs table first. When clubs are later migrated to the DB, we can add
-- a proper FK while keeping club_slug as a denormalized convenience.

alter table posts
  add column if not exists club_slug text;

create index if not exists posts_club_slug_idx on posts (club_slug);
create index if not exists posts_created_at_idx on posts (created_at desc);