create table if not exists public.six_tournament_deadline_overrides (
  id uuid primary key default gen_random_uuid(),
  tournament text not null check (char_length(tournament) <= 40),
  area text not null check (char_length(area) <= 80),
  prefecture text not null check (char_length(prefecture) <= 80),
  entry_deadline date,
  draw_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tournament, area, prefecture)
);

create index if not exists six_tournament_deadline_overrides_lookup_idx
on public.six_tournament_deadline_overrides (tournament, area, prefecture);

drop trigger if exists six_tournament_deadline_overrides_set_updated_at on public.six_tournament_deadline_overrides;
create trigger six_tournament_deadline_overrides_set_updated_at
before update on public.six_tournament_deadline_overrides
for each row
execute function public.set_updated_at();

alter table public.six_tournament_deadline_overrides enable row level security;

drop policy if exists "six_tournament_deadline_overrides_read_all" on public.six_tournament_deadline_overrides;
create policy "six_tournament_deadline_overrides_read_all"
on public.six_tournament_deadline_overrides
for select
using (true);
