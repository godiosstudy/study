-- profiles_default_role_participant.sql
-- Asegura que todo perfil nuevo arranque con rol "participante" (role_id = 2).
-- Ajusta p_roles (contador de roles) y crea relación en user_roles.

-- 1) Columna p_roles con DEFAULT 1 y NOT NULL (ajusta si la columna se llama distinto).
alter table if exists public.profiles
  alter column p_roles set default 1,
  alter column p_roles set not null;

-- 2) Función trigger: asegura p_roles = 1 si viene null y crea el rol participante.
create or replace function public.handle_new_profile_roles()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.p_roles is null then
    new.p_roles := 1;
  end if;

  insert into public.user_roles (user_id, role_id)
  values (new.id, 2)
  on conflict do nothing;

  return new;
end;
$$;

-- 3) Trigger BEFORE INSERT en profiles
drop trigger if exists trg_profiles_default_role on public.profiles;
create trigger trg_profiles_default_role
before insert on public.profiles
for each row
execute function public.handle_new_profile_roles();

-- 4) Backfill opcional: asignar rol participante a perfiles existentes sin roles.
-- Actualiza p_roles cuando esté en 0 o null y crea la relación en user_roles si falta.
update public.profiles
set p_roles = 1
where coalesce(p_roles, 0) = 0;

insert into public.user_roles (user_id, role_id)
select p.id, 2
from public.profiles p
left join public.user_roles ur
  on ur.user_id = p.id and ur.role_id = 2
where ur.user_id is null;
