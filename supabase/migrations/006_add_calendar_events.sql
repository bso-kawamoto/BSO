create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete set null,
  assignee_id uuid references public.employees(id) on delete set null,
  title text not null check (char_length(title) <= 120),
  event_date date not null,
  start_time time,
  end_time time,
  location text,
  memo text,
  owner text not null default '未割当',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists calendar_events_event_date_idx on public.calendar_events (event_date);
create index if not exists calendar_events_project_id_idx on public.calendar_events (project_id);
create index if not exists calendar_events_assignee_id_idx on public.calendar_events (assignee_id);

drop trigger if exists calendar_events_set_updated_at on public.calendar_events;
create trigger calendar_events_set_updated_at
before update on public.calendar_events
for each row
execute function public.set_updated_at();

alter table public.calendar_events enable row level security;

drop policy if exists "calendar_events_read_all" on public.calendar_events;
create policy "calendar_events_read_all"
on public.calendar_events
for select
using (true);

drop policy if exists "calendar_events_insert_all" on public.calendar_events;
create policy "calendar_events_insert_all"
on public.calendar_events
for insert
with check (true);

drop policy if exists "calendar_events_update_all" on public.calendar_events;
create policy "calendar_events_update_all"
on public.calendar_events
for update
using (true)
with check (true);

drop policy if exists "calendar_events_delete_all" on public.calendar_events;
create policy "calendar_events_delete_all"
on public.calendar_events
for delete
using (true);
