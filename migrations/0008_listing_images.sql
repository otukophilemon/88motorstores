-- Add an images array to listings.
alter table listings
  add column if not exists images jsonb not null default '[]'::jsonb;
create index if not exists listings_images_gin_idx
  on listings using gin (images);