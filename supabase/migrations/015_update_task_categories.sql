alter table public.operation_tasks
  drop constraint if exists operation_tasks_category_check;

update public.operation_tasks
set category = case
  when category = '営業' then '広報'
  when category = '運用' then '大会'
  when category = '請求' then '管理部'
  when category = 'サポート' then '管理部'
  when category = '管理' then '管理部'
  else category
end;

alter table public.operation_tasks
  add constraint operation_tasks_category_check
  check (category in ('大会', 'ALLJAPAN', 'スクール', '物販', 'チーム', 'イベント', '広報', 'システム', '管理部'));

insert into public.operation_tasks (
  project_id,
  parent_task_id,
  assignee_id,
  task_level,
  title,
  category,
  status,
  priority,
  owner,
  description,
  memo,
  due_date
)
select
  projects.id,
  null,
  null,
  '中タスク',
  template.title,
  template.category,
  '未着手',
  '中',
  '未割当',
  null,
  null,
  null
from public.projects
cross join (
  values
    ('企画', 'イベント'),
    ('広報', '広報'),
    ('顧客対応', 'チーム'),
    ('運営', '大会'),
    ('管理', '管理部'),
    ('製作', '広報'),
    ('調整', 'イベント'),
    ('システム', 'システム'),
    ('当日対応', '大会'),
    ('振り返り', '管理部')
) as template(title, category)
where not exists (
  select 1
  from public.operation_tasks existing
  where existing.project_id = projects.id
    and existing.parent_task_id is null
    and existing.task_level = '中タスク'
    and existing.title = template.title
);
