alter table public.projects
  add column if not exists category text not null default '大会';

alter table public.projects
  drop constraint if exists projects_category_check;

alter table public.projects
  add constraint projects_category_check
  check (category in ('大会', 'ALLJAPAN', 'スクール', '物販', 'チーム', 'イベント', '広報', 'システム', '管理部'));

create index if not exists projects_category_idx
on public.projects (category);
