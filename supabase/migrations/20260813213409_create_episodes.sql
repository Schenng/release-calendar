-- V3: episodes table — named banked episodes with an optional Mon/Thu
-- release-date assignment, owned per user.

create table public.episodes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  release_date date,
  created_at timestamptz not null default now()
);

alter table public.episodes enable row level security;

create policy "Users manage own episodes"
  on public.episodes
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- One episode per release date per user (unassigned episodes are unlimited).
create unique index episodes_user_release_date_key
  on public.episodes (user_id, release_date)
  where release_date is not null;
