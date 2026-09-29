-- Allow 'owner' as a distinct role so club creators can be distinguished
-- from promoted admins (only owners can delete the club).

alter table club_members
  drop constraint if exists club_members_role_check;

alter table club_members
  add constraint club_members_role_check
    check (role in ('owner', 'admin', 'member'));

-- Promote the original creator to 'owner' in any existing clubs.
update club_members cm
  set role = 'owner'
  from clubs c
  where cm.club_id = c.id
    and cm.user_id = c.created_by
    and cm.role = 'admin';

create index if not exists club_members_club_role_idx
  on club_members (club_id, role);