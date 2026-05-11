update public.operation_tasks
set category = case title
  when '企画' then 'イベント'
  when '広報' then '広報'
  when '顧客対応' then 'チーム'
  when '運営' then '大会'
  when '管理' then '管理部'
  when '製作' then '広報'
  when '調整' then 'イベント'
  when 'システム' then 'システム'
  when '当日対応' then '大会'
  when '振り返り' then '管理部'
  else category
end
where task_level = '中タスク'
  and parent_task_id is null
  and title in ('企画', '広報', '顧客対応', '運営', '管理', '製作', '調整', 'システム', '当日対応', '振り返り');
