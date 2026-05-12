alter table public.operation_tasks
  add column if not exists sort_order integer;

create index if not exists operation_tasks_project_parent_sort_idx
on public.operation_tasks (project_id, parent_task_id, sort_order);

update public.operation_tasks
set sort_order = case title
  when '企画' then 0
  when '広報' then 1
  when '顧客対応' then 2
  when '運営' then 3
  when '管理' then 4
  when '製作' then 5
  when '調整' then 6
  when 'システム' then 7
  when '当日対応' then 8
  when '振り返り' then 9
  else sort_order
end
where parent_task_id is null;
