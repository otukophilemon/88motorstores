-- Extend notifications to support admin/system notifications.
alter table notifications
  alter column user_id drop not null;
alter table notifications
  alter column post_id drop not null;
alter table notifications
  add column if not exists target_user_id text
    references "user" ("id") on delete cascade;
alter table notifications
  add column if not exists link text;
alter table notifications
  add column if not exists message text;
create index if not exists notifications_target_unread_idx
  on notifications (target_user_id, created_at desc)
  where target_user_id is not null and read_at is null;
create index if not exists notifications_target_all_idx
  on notifications (target_user_id, created_at desc)
  where target_user_id is not null;