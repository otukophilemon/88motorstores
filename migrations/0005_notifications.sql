-- Notifications: track replies so users can be alerted about activity.
--
-- One row per (recipient, reply). read_at = NULL means unread.
-- Kind is extensible — 'reply' today, could be 'mention', 'reaction', etc.

create table if not exists notifications (
  id            text primary key,
  user_id       text not null references "user" ("id") on delete cascade,
  kind          text not null default 'reply',
  post_id       text not null references posts (id) on delete cascade,
  reply_id      text references replies (id) on delete cascade,
  actor_name    text not null,
  thread_title  text not null,
  club_slug     text,
  created_at    timestamptz not null default now(),
  read_at       timestamptz
);

create index if not exists notifications_user_unread_idx
  on notifications (user_id, created_at desc)
  where read_at is null;

create index if not exists notifications_user_all_idx
  on notifications (user_id, created_at desc);

create index if not exists notifications_post_idx
  on notifications (post_id);