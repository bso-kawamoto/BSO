drop policy if exists "operation_tasks_insert_all" on public.operation_tasks;
create policy "operation_tasks_insert_all"
on public.operation_tasks
for insert
with check (true);
