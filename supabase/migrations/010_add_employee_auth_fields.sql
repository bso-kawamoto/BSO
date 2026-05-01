alter table public.employees
  add column if not exists email text,
  add column if not exists auth_user_id uuid,
  add column if not exists is_admin boolean not null default false;

create unique index if not exists employees_email_unique_idx
on public.employees (lower(email))
where email is not null;

create unique index if not exists employees_auth_user_id_unique_idx
on public.employees (auth_user_id)
where auth_user_id is not null;

update public.employees
set is_admin = true
where name in ('河本', '豐ｳ譛ｬ');
