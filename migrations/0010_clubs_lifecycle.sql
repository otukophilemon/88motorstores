alter table clubs
  add column if not exists deleted_at timestamptz;
alter table clubs
  add column if not exists purge_after timestamptz;
alter table clubs
  add column if not exists rules text[] not null default '{}';
create index if not exists clubs_deleted_at_idx
  on clubs (deleted_at)
  where deleted_at is not null;
create index if not exists clubs_purge_after_idx
  on clubs (purge_after)
  where purge_after is not null;
update club_members set role = 'admin' where role = 'owner';
update club_members set role = 'member' where role not in ('admin', 'member');
alter table club_members drop constraint if exists club_members_role_check;
alter table club_members
  add constraint club_members_role_check
    check (role in ('admin', 'member'));
alter table club_members alter column role set default 'member';
create index if not exists club_members_club_role_idx
  on club_members (club_id, role);
create index if not exists club_members_user_idx
  on club_members (user_id);