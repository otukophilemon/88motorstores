-- Garage post types + accepted answers + live chat.

alter table garage_posts
  add column if not exists post_type text not null default 'showcase'
    check (post_type in ('showcase', 'question', 'tip'));

create index if not exists garage_posts_type_created_idx
  on garage_posts (post_type, created_at desc)
  where deleted_at is null;

alter table garage_comments
  add column if not exists is_accepted boolean not null default false;

create unique index if not exists garage_comments_one_accepted_per_post_idx
  on garage_comments (post_id)
  where is_accepted = true;

create table if not exists chat_messages (
  id           text primary key,
  user_id      text not null references "user" ("id") on delete cascade,
  author_name  text not null,
  body         text,
  media        jsonb not null default '[]'::jsonb,
  reply_to_id  text references chat_messages (id) on delete set null,
  created_at   timestamptz not null default now(),
  deleted_at   timestamptz
);

create index if not exists chat_messages_created_at_idx
  on chat_messages (created_at desc)
  where deleted_at is null;

create index if not exists chat_messages_user_idx
  on chat_messages (user_id);