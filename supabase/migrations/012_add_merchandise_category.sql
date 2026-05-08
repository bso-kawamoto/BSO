alter table public.operation_tasks
  drop constraint if exists operation_tasks_category_check;

alter table public.operation_tasks
  add constraint operation_tasks_category_check
  check (category in ('営業', '運用', '請求', 'サポート', '管理', '物販'));
