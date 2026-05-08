alter table public.operation_tasks
  add column if not exists requested_by_id uuid references public.employees(id) on delete set null,
  add column if not exists requested_by_name text;

create index if not exists operation_tasks_requested_by_id_idx
on public.operation_tasks (requested_by_id);
