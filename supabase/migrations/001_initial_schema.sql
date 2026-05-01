create extension if not exists "pgcrypto";

create table if not exists public.operation_tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) <= 120),
  description text,
  status text not null default '未着手' check (status in ('未着手', '進行中', '確認待ち', '完了')),
  category text not null check (category in ('営業', '運用', '請求', 'サポート', '管理')),
  priority text not null default '中' check (priority in ('低', '中', '高')),
  owner text not null default '未割当',
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists operation_tasks_status_idx on public.operation_tasks (status);
create index if not exists operation_tasks_category_idx on public.operation_tasks (category);
create index if not exists operation_tasks_due_date_idx on public.operation_tasks (due_date);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists operation_tasks_set_updated_at on public.operation_tasks;
create trigger operation_tasks_set_updated_at
before update on public.operation_tasks
for each row
execute function public.set_updated_at();

alter table public.operation_tasks enable row level security;

drop policy if exists "operation_tasks_read_all" on public.operation_tasks;
create policy "operation_tasks_read_all"
on public.operation_tasks
for select
using (true);

insert into public.operation_tasks (title, description, status, category, priority, owner, due_date)
values
  ('新規問い合わせの初回確認', 'Webフォームからの問い合わせを確認し、担当者を割り当てる。', '未着手', '営業', '高', 'Ops', current_date + interval '2 days'),
  ('月次請求データの突合', '請求対象データと契約情報の差分を確認する。', '進行中', '請求', '中', 'Finance', current_date + interval '4 days'),
  ('サポートFAQの更新確認', '直近の問い合わせ内容をFAQへ反映する。', '確認待ち', 'サポート', '低', 'CS', null),
  ('週次運用レポート共有', '主要KPIと未完了タスクを関係者へ共有する。', '完了', '運用', '中', 'Ops', current_date)
on conflict do nothing;
