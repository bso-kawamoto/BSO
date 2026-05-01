insert into public.employees (name, role, email, is_admin)
values ('宮田', '社員', 'miyata@bsobb.net', false)
on conflict (name) do update set
  role = excluded.role,
  email = coalesce(public.employees.email, excluded.email),
  is_active = true,
  is_admin = false;
