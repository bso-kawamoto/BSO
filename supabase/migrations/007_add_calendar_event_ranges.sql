alter table public.calendar_events
  add column if not exists end_date date,
  add column if not exists is_all_day boolean not null default false;

create index if not exists calendar_events_end_date_idx on public.calendar_events (end_date);

alter table public.calendar_events
  drop constraint if exists calendar_events_end_date_check;

alter table public.calendar_events
  add constraint calendar_events_end_date_check
  check (end_date is null or end_date >= event_date);
