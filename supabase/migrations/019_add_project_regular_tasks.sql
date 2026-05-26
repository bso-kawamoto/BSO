create table if not exists public.project_regular_tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  assignee_id uuid references public.employees(id) on delete set null,
  title text not null check (char_length(title) <= 120),
  memo text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists project_regular_tasks_project_id_idx on public.project_regular_tasks (project_id);
create index if not exists project_regular_tasks_assignee_id_idx on public.project_regular_tasks (assignee_id);
create index if not exists project_regular_tasks_is_active_idx on public.project_regular_tasks (is_active);

drop trigger if exists project_regular_tasks_set_updated_at on public.project_regular_tasks;
create trigger project_regular_tasks_set_updated_at
before update on public.project_regular_tasks
for each row
execute function public.set_updated_at();

create table if not exists public.project_regular_task_checks (
  id uuid primary key default gen_random_uuid(),
  regular_task_id uuid not null references public.project_regular_tasks(id) on delete cascade,
  week_start_date date not null,
  checked_by_id uuid references public.employees(id) on delete set null,
  checked_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (regular_task_id, week_start_date)
);

create index if not exists project_regular_task_checks_regular_task_id_idx on public.project_regular_task_checks (regular_task_id);
create index if not exists project_regular_task_checks_week_start_date_idx on public.project_regular_task_checks (week_start_date);

alter table public.project_regular_tasks enable row level security;
alter table public.project_regular_task_checks enable row level security;

drop policy if exists "project_regular_tasks_read_all" on public.project_regular_tasks;
create policy "project_regular_tasks_read_all"
on public.project_regular_tasks
for select
using (true);

drop policy if exists "project_regular_task_checks_read_all" on public.project_regular_task_checks;
create policy "project_regular_task_checks_read_all"
on public.project_regular_task_checks
for select
using (true);
