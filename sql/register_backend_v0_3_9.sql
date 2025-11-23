-- v0.3.9 Backend de registro Study.GODiOS.org
-- IMPORTANTE: este archivo es para tu repo.
-- Ya tienes la configuración activa en producción.
-- Si necesitas recrearlo en otro entorno:
--  1) Sustituye REPLACE_WITH_RESEND_API_KEY por tu API key real de Resend.
--  2) Ejecuta este script en el editor SQL del nuevo proyecto.

-- 0) Tabla de configuración simple para la API key de Resend
create table if not exists public.app_config (
  key   text primary key,
  value text not null
);

-- Guarda / actualiza la API key (EDITAR ANTES DE EJECUTAR)
insert into public.app_config(key, value)
values ('resend_api_key', 're_LGx8qdbe_N8PYDb2vv78JMqZNKhc1qKVt')
on conflict (key) do update set value = excluded.value;

-- 1) Tabla donde se guardan los códigos de verificación
create table if not exists public.register_codes (
  email      text primary key,
  code       text not null,
  created_at timestamptz not null default now()
);

-- 2) Extensión http (si no existe)
create extension if not exists http;

-- 3) Función RPC: envía código por correo usando Resend
create or replace function public.register_send_code(
  p_email text,
  p_name  text,
  p_lang  text
)
returns boolean
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_code     text;
  v_subject  text;
  v_body     text;
  v_api_key  text;
  v_resp     record;
begin
  -- Validación básica de email
  if p_email is null or length(trim(p_email)) = 0 then
    return false;
  end if;

  -- Código de 6 dígitos
  v_code := lpad((trunc(random() * 1000000))::text, 6, '0');

  -- Guarda / actualiza el código en register_codes
  insert into public.register_codes (email, code, created_at)
  values (lower(trim(p_email)), v_code, now())
  on conflict (email) do update
    set code       = excluded.code,
        created_at = excluded.created_at;

  -- Leer API key desde app_config
  select value
  into   v_api_key
  from   public.app_config
  where  key = 'resend_api_key';

  if v_api_key is null or v_api_key = '' then
    return false;
  end if;

  -- SUBJECT + BODY según idioma
  if p_lang = 'en' then
    v_subject := 'Confirm your email address';
    v_body := format(
      'Please enter this verification code to get started on Study.GODiOS.org: %s

Verification codes expire after two hours.

Thanks,
Study.GODiOS.org',
      v_code
    );
  else
    v_subject := 'Confirma tu dirección de correo';
    v_body := format(
      'Por favor ingresa este código de verificación para comenzar a usar Study.GODiOS.org: %s

Los códigos de verificación vencen a las dos horas.

Gracias,
Study.GODiOS.org',
      v_code
    );
  end if;

  -- Llamada a Resend usando http() + http_header()
  select *
  into   v_resp
  from http((
    'POST',
    'https://api.resend.com/emails',
    ARRAY[
      http_header('Authorization', 'Bearer ' || v_api_key)
    ],
    'application/json',
    jsonb_build_object(
      'from',    'Study.GODiOS.org <info@godios.org>',
      'to',      jsonb_build_array(p_email),
      'subject', v_subject,
      'text',    v_body
    )::text
  )::http_request);

  -- Si Resend responde error (4xx / 5xx) → false
  if v_resp.status >= 400 then
    return false;
  end if;

  -- Todo bien → true
  return true;

exception
  when others then
    return false;
end;
$$;

-- 4) Función RPC: verifica el código de verificación
create or replace function public.register_verify_code(
  p_email text,
  p_code  text
)
returns boolean
language plpgsql
security definer
as $$
declare
  v_ok boolean;
begin
  if p_email is null or p_code is null then
    return false;
  end if;

  select exists (
    select 1
    from public.register_codes
    where email      = lower(trim(p_email))
      and code       = trim(p_code)
      and created_at >= now() - interval '2 hours'
  )
  into v_ok;

  return coalesce(v_ok, false);
end;
$$;

-- 5) Permisos para el rol anon (frontend)
grant execute on function public.register_send_code(text, text, text) to anon;
grant execute on function public.register_verify_code(text, text)      to anon;
