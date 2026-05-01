drop policy if exists "operation_tasks_update_all" on public.operation_tasks;
create policy "operation_tasks_update_all"
on public.operation_tasks
for update
using (true)
with check (true);

drop policy if exists "operation_tasks_delete_all" on public.operation_tasks;
create policy "operation_tasks_delete_all"
on public.operation_tasks
for delete
using (true);
