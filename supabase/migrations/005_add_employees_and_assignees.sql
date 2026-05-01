create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) <= 60),
  role text not null default '社員',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists employees_set_updated_at on public.employees;
create trigger employees_set_updated_at
before update on public.employees
for each row
execute function public.set_updated_at();

alter table public.employees enable row level security;

drop policy if exists "employees_read_all" on public.employees;
create policy "employees_read_all"
on public.employees
for select
using (true);

drop policy if exists "employees_insert_all" on public.employees;
create policy "employees_insert_all"
on public.employees
for insert
with check (true);

drop policy if exists "employees_update_all" on public.employees;
create policy "employees_update_all"
on public.employees
for update
using (true)
with check (true);

insert into public.employees (name, role)
values
  ('河本', '管理者'),
  ('高橋', '社員'),
  ('大鋸', '社員'),
  ('松本', '社員'),
  ('安藤', '社員'),
  ('平賀', '社員'),
  ('天木', '社員'),
  ('草間', '社員'),
  ('上野', '社員'),
  ('大橋', '社員'),
  ('花里', '社員')
on conflict (name) do update set
  role = excluded.role,
  is_active = true;

alter table public.operation_tasks
  add column if not exists assignee_id uuid references public.employees(id) on delete set null;

create index if not exists operation_tasks_assignee_id_idx on public.operation_tasks (assignee_id);

update public.operation_tasks task
set assignee_id = employee.id
from public.employees employee
where task.assignee_id is null
  and task.owner = employee.name;
