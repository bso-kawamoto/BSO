alter table public.operation_tasks
  add column if not exists memo text;
