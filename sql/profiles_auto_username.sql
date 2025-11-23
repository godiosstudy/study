-- profiles_auto_username.sql
-- Genera automáticamente p_username en public.profiles si viene vacío,
-- usando el nombre o el correo + timestamp, garantizando unicidad.

create or replace function public.profiles_set_username()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  base       text;
  candidate  text;
  tries      integer := 0;
begin
  -- Si ya viene un username válido, no tocamos nada
  if new.p_username is not null and length(trim(new.p_username)) > 0 then
    return new;
  end if;

  -- Base: primero nombre, luego email, por último "user"
  if coalesce(new.first_name, '') <> '' then
    base := lower(regexp_replace(new.first_name, '[^a-zA-Z0-9]+', '', 'g'));
  elsif coalesce(new.email, '') <> '' then
    base := lower(regexp_replace(split_part(new.email, '@', 1), '[^a-zA-Z0-9]+', '', 'g'));
  else
    base := 'user';
  end if;

  if base = '' then
    base := 'user';
  end if;

  -- Intentamos hasta encontrar uno libre
  loop
    if tries = 0 then
      candidate := base || '_' || to_char(now(), 'YYYYMMDDHH24MISS');
    else
      candidate := base || '_' || to_char(now(), 'YYYYMMDDHH24MISS') || '_' || tries::text;
    end if;

    exit when not exists (
      select 1
      from public.profiles p
      where p.p_username = candidate
    );

    tries := tries + 1;

    -- Evitamos bucles infinitos
    if tries > 20 then
      candidate := base || '_' || replace(gen_random_uuid()::text, '-', '');
      exit;
    end if;
  end loop;

  new.p_username := candidate;
  return new;
end;
$$;

drop trigger if exists trg_profiles_set_username on public.profiles;

create trigger trg_profiles_set_username
before insert on public.profiles
for each row
execute function public.profiles_set_username();
