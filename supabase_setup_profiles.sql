-- supabase_setup_profiles.sql
create table if not exists public.profiles (
  sqlid uuid primary key references auth.users(id) on delete cascade,
  first_name text,
  last_name text,
  email text unique,
  phone text,
  birth_date date,
  gender text,
  role text,
  updated_at timestamptz default now(),
  last_view jsonb,
  p_bible text,
  p_color text,
  p_font_type text,
  p_font_size text,
  p_light boolean,
  p_language_code text,
  p_level1 text,
  p_level2 text,
  is_validated boolean default false
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (sqlid, email, first_name, p_language_code, is_validated, updated_at)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'first_name',''), coalesce(new.raw_user_meta_data->>'lang','es'), false, now())
  on conflict (sqlid) do update set
    email = excluded.email,
    first_name = excluded.first_name,
    p_language_code = excluded.p_language_code,
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where polname = 'profiles_select_own') then
    create policy profiles_select_own on public.profiles for select using (auth.uid() = sqlid);
  end if;
  if not exists (select 1 from pg_policies where polname = 'profiles_update_own') then
    create policy profiles_update_own on public.profiles for update using (auth.uid() = sqlid);
  end if;
end $$;

create index if not exists idx_profiles_email_ci on public.profiles (lower(email));
