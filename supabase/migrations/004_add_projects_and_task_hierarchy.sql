create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) <= 120),
  description text,
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists projects_due_date_idx on public.projects (due_date);

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at
before update on public.projects
for each row
execute function public.set_updated_at();

alter table public.projects enable row level security;

drop policy if exists "projects_read_all" on public.projects;
create policy "projects_read_all"
on public.projects
for select
using (true);

drop policy if exists "projects_insert_all" on public.projects;
create policy "projects_insert_all"
on public.projects
for insert
with check (true);

drop policy if exists "projects_update_all" on public.projects;
create policy "projects_update_all"
on public.projects
for update
using (true)
with check (true);

drop policy if exists "projects_delete_all" on public.projects;
create policy "projects_delete_all"
on public.projects
for delete
using (true);

alter table public.operation_tasks
  add column if not exists project_id uuid references public.projects(id) on delete set null,
  add column if not exists parent_task_id uuid references public.operation_tasks(id) on delete cascade,
  add column if not exists task_level text not null default '中タスク' check (task_level in ('中タスク', '小タスク'));

create index if not exists operation_tasks_project_id_idx on public.operation_tasks (project_id);
create index if not exists operation_tasks_parent_task_id_idx on public.operation_tasks (parent_task_id);
create index if not exists operation_tasks_task_level_idx on public.operation_tasks (task_level);

insert into public.projects (name, description, due_date)
values ('お伊勢さん杯', '大会運営の準備案件', current_date + interval '60 days')
on conflict do nothing;
