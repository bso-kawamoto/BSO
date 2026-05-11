create table if not exists public.regular_tasks (
  id uuid primary key default gen_random_uuid(),
  assignee_id uuid not null references public.employees(id) on delete cascade,
  title text not null check (char_length(title) <= 120),
  memo text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists regular_tasks_assignee_id_idx on public.regular_tasks (assignee_id);
create index if not exists regular_tasks_is_active_idx on public.regular_tasks (is_active);

drop trigger if exists regular_tasks_set_updated_at on public.regular_tasks;
create trigger regular_tasks_set_updated_at
before update on public.regular_tasks
for each row
execute function public.set_updated_at();

alter table public.regular_tasks enable row level security;

drop policy if exists "regular_tasks_read_all" on public.regular_tasks;
create policy "regular_tasks_read_all"
on public.regular_tasks
for select
using (true);
