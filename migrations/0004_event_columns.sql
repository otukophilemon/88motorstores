-- Add event scheduling columns to posts.
--
-- Threads can optionally carry an event: a date/time and a location.
-- Club pages surface upcoming events in a "Coming up" section.
-- Both columns are nullable — most threads are just discussions.

alter table posts
  add column if not exists event_at timestamptz;

alter table posts
  add column if not exists event_location text;

create index if not exists posts_event_at_idx on posts (event_at)
  where event_at is not null;