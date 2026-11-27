-- ORBISE ROLEPLAY · Esquema online: cuentas, roles personalizados, permisos, campañas y archivos compartidos.
-- Cómo aplicarlo: Supabase → SQL Editor → New query → pegar todo → Run.
-- Es idempotente: se puede volver a ejecutar tras cambios sin perder datos.
--
-- Roles del sistema y personalizados:
--   Administrador → profiles.is_admin = true o rol 'admin' con can_manage_roles = true
--   Master        → rol 'master' con can_gm = true y can_upload = true
--   Jugador       → rol 'jugador' (asignado por defecto a cada usuario nuevo)
--   Roles extra   → creables y asignables desde la web por cualquier usuario con can_manage_roles.
-- Toda la seguridad está en el servidor (RLS + funciones + Storage policies).

create extension if not exists pgcrypto;

-- ───────────── Perfiles ─────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 40),
  email text not null default '',
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles add column if not exists email text not null default '';

-- ───────────── Roles y permisos dinámicos ─────────────
create table if not exists public.app_roles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9_-]{2,32}$'),
  name text not null check (char_length(name) between 2 and 40),
  description text not null default '',
  color text not null default '#5DEEFF',
  is_system boolean not null default false,
  can_manage_roles boolean not null default false,
  can_gm boolean not null default false,
  can_upload boolean not null default true,
  can_manage_all_files boolean not null default false,
  created_at timestamptz not null default now()
);

insert into public.app_roles (slug, name, description, color, is_system, can_manage_roles, can_gm, can_upload, can_manage_all_files)
values
  ('admin',   'Admin',   'Control total de usuarios, roles y archivos',         '#FFD66B', true, true,  true,  true, true),
  ('master',  'Master',  'Director de juego: dirigir campañas y subir archivos','#FF7A45', true, false, true,  true, false),
  ('jugador', 'Jugador', 'Participar en campañas y compartir archivos',         '#5DEEFF', true, false, false, true, false)
on conflict (slug) do update set
  is_system = true,
  can_manage_roles = excluded.can_manage_roles,
  can_gm = excluded.can_gm,
  can_manage_all_files = excluded.can_manage_all_files;

create table if not exists public.user_roles (
  user_id uuid not null references public.profiles on delete cascade,
  role_id uuid not null references public.app_roles on delete cascade,
  assigned_by uuid references public.profiles on delete set null,
  assigned_at timestamptz not null default now(),
  primary key (user_id, role_id)
);

-- Registro automático de perfil + rol 'jugador' (+ 'admin' si es el primer usuario registrado)
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  first_user boolean;
  r_player uuid;
  r_admin uuid;
begin
  select not exists (select 1 from public.profiles) into first_user;

  insert into public.profiles (id, display_name, email, is_admin)
  values (
    new.id,
    left(coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'), ''), split_part(new.email, '@', 1), 'Jugador'), 40),
    coalesce(new.email, ''),
    first_user
  )
  on conflict (id) do update set email = coalesce(new.email, public.profiles.email);

  select id into r_player from public.app_roles where slug = 'jugador';
  if r_player is not null then
    insert into public.user_roles (user_id, role_id) values (new.id, r_player) on conflict do nothing;
  end if;

  if first_user then
    select id into r_admin from public.app_roles where slug = 'admin';
    if r_admin is not null then
      insert into public.user_roles (user_id, role_id) values (new.id, r_admin) on conflict do nothing;
    end if;
  end if;

  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Rellenar correos y rol 'jugador' en perfiles que ya existían antes de esta actualización
update public.profiles p
set email = coalesce(u.email, p.email)
from auth.users u
where p.id = u.id and (p.email = '' or p.email is null);

insert into public.user_roles (user_id, role_id)
select p.id, r.id
from public.profiles p
cross join public.app_roles r
where r.slug = 'jugador'
on conflict do nothing;

insert into public.user_roles (user_id, role_id)
select p.id, r.id
from public.profiles p
cross join public.app_roles r
where p.is_admin = true and r.slug = 'admin'
on conflict do nothing;

-- ───────────── Campañas y miembros ─────────────
create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  description text not null default '',
  invite_code text not null unique,
  paused boolean not null default false,
  created_by uuid not null references public.profiles on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.campaign_members (
  campaign_id uuid not null references public.campaigns on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  role text not null check (role in ('gm', 'player')),
  joined_at timestamptz not null default now(),
  primary key (campaign_id, user_id)
);

-- ───────────── Archivos compartidos (por usuarios, por roles o públicos) ─────────────
create table if not exists public.shared_files (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  description text not null default '',
  file_name text not null,
  mime_type text not null default 'application/octet-stream',
  size_bytes bigint not null default 0 check (size_bytes >= 0),
  storage_path text not null unique,
  is_public boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.file_user_shares (
  file_id uuid not null references public.shared_files on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (file_id, user_id)
);

create table if not exists public.file_role_shares (
  file_id uuid not null references public.shared_files on delete cascade,
  role_id uuid not null references public.app_roles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (file_id, role_id)
);

-- ───────────── Funciones auxiliares de permisos (security definer) ─────────────
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from profiles where id = auth.uid()), false)
      or exists (
        select 1 from user_roles ur
        join app_roles r on r.id = ur.role_id
        where ur.user_id = auth.uid() and (r.slug = 'admin' or r.can_manage_roles)
      )
$$;

create or replace function public.can_upload_files() returns boolean
language sql stable security definer set search_path = public as $$
  select is_admin() or exists (
    select 1 from user_roles ur
    join app_roles r on r.id = ur.role_id
    where ur.user_id = auth.uid() and r.can_upload
  )
$$;

create or replace function public.can_manage_all_files() returns boolean
language sql stable security definer set search_path = public as $$
  select is_admin() or exists (
    select 1 from user_roles ur
    join app_roles r on r.id = ur.role_id
    where ur.user_id = auth.uid() and r.can_manage_all_files
  )
$$;

create or replace function public.can_manage_file(f uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select can_manage_all_files() or exists (
    select 1 from shared_files where id = f and owner_id = auth.uid()
  )
$$;

create or replace function public.can_read_file(f uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select can_manage_all_files()
    or exists (
      select 1 from shared_files sf
      where sf.id = f and (sf.owner_id = auth.uid() or sf.is_public)
    )
    or exists (
      select 1 from file_user_shares fus
      where fus.file_id = f and fus.user_id = auth.uid()
    )
    or exists (
      select 1 from file_role_shares frs
      join user_roles ur on ur.role_id = frs.role_id
      where frs.file_id = f and ur.user_id = auth.uid()
    )
$$;

create or replace function public.is_member(c uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from campaign_members where campaign_id = c and user_id = auth.uid()) $$;

create or replace function public.is_gm(c uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from campaign_members where campaign_id = c and user_id = auth.uid() and role = 'gm') $$;

create or replace function public.shares_campaign(other uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from campaign_members a join campaign_members b using (campaign_id)
                 where a.user_id = auth.uid() and b.user_id = other) $$;

-- ───────────── Funciones RPC para gestión desde la web ─────────────

-- Crear o editar un rol personalizado (solo quienes tienen permiso de gestión de roles)
create or replace function public.upsert_role(
  p_slug text,
  p_name text,
  p_description text default '',
  p_color text default '#5DEEFF',
  p_can_manage_roles boolean default false,
  p_can_gm boolean default false,
  p_can_upload boolean default true,
  p_can_manage_all_files boolean default false
) returns public.app_roles
language plpgsql security definer set search_path = public as $$
declare
  clean_slug text := lower(regexp_replace(trim(p_slug), '[^a-zA-Z0-9_-]+', '-', 'g'));
  r app_roles;
begin
  if not is_admin() then raise exception 'Solo un administrador puede crear o modificar roles'; end if;
  if char_length(clean_slug) < 2 then raise exception 'El identificador del rol debe tener al menos 2 caracteres'; end if;

  insert into app_roles (slug, name, description, color, can_manage_roles, can_gm, can_upload, can_manage_all_files)
  values (
    left(clean_slug, 32),
    trim(p_name),
    coalesce(p_description, ''),
    coalesce(nullif(trim(p_color), ''), '#5DEEFF'),
    coalesce(p_can_manage_roles, false),
    coalesce(p_can_gm, false),
    coalesce(p_can_upload, true),
    coalesce(p_can_manage_all_files, false)
  )
  on conflict (slug) do update set
    name = excluded.name,
    description = excluded.description,
    color = excluded.color,
    can_manage_roles = case when app_roles.slug = 'admin' then true else excluded.can_manage_roles end,
    can_gm = excluded.can_gm,
    can_upload = excluded.can_upload,
    can_manage_all_files = case when app_roles.slug = 'admin' then true else excluded.can_manage_all_files end
  returning * into r;

  return r;
end $$;

-- Eliminar un rol personalizado (los roles de sistema no se pueden borrar)
create or replace function public.delete_role(p_role_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Solo un administrador puede eliminar roles'; end if;
  if exists (select 1 from app_roles where id = p_role_id and is_system) then
    raise exception 'Los roles base del sistema (Admin, Master, Jugador) no se pueden eliminar';
  end if;
  delete from app_roles where id = p_role_id;
end $$;

-- Asignar o quitar un rol a un usuario desde la web
create or replace function public.set_user_role(p_user_id uuid, p_role_id uuid, p_assign boolean) returns void
language plpgsql security definer set search_path = public as $$
declare
  r_slug text;
begin
  if not is_admin() then raise exception 'Solo un administrador puede asignar roles a usuarios'; end if;
  select slug into r_slug from app_roles where id = p_role_id;
  if r_slug is null then raise exception 'El rol indicado no existe'; end if;

  if p_assign then
    insert into user_roles (user_id, role_id, assigned_by)
    values (p_user_id, p_role_id, auth.uid())
    on conflict (user_id, role_id) do nothing;
    if r_slug = 'admin' then
      update profiles set is_admin = true where id = p_user_id;
    end if;
  else
    delete from user_roles where user_id = p_user_id and role_id = p_role_id;
    if r_slug = 'admin' then
      update profiles set is_admin = false where id = p_user_id;
    end if;
  end if;
end $$;

-- Actualizar permisos de compartición de un archivo (público, por roles y por usuarios)
create or replace function public.set_file_shares(
  p_file_id uuid,
  p_is_public boolean,
  p_role_ids uuid[],
  p_user_ids uuid[]
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not can_manage_file(p_file_id) then
    raise exception 'No tienes permiso para cambiar la compartición de este archivo';
  end if;

  update shared_files set is_public = coalesce(p_is_public, false) where id = p_file_id;

  delete from file_role_shares where file_id = p_file_id;
  if p_role_ids is not null and array_length(p_role_ids, 1) > 0 then
    insert into file_role_shares (file_id, role_id)
    select p_file_id, unnest(p_role_ids)
    on conflict do nothing;
  end if;

  delete from file_user_shares where file_id = p_file_id;
  if p_user_ids is not null and array_length(p_user_ids, 1) > 0 then
    insert into file_user_shares (file_id, user_id)
    select p_file_id, unnest(p_user_ids)
    on conflict do nothing;
  end if;
end $$;

-- Código de invitación: 8 caracteres sin ambigüedades (sin 0/O, 1/I)
create or replace function public.new_invite_code() returns text
language plpgsql volatile set search_path = public as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
  b bytea;
begin
  loop
    b := gen_random_bytes(8);
    code := '';
    for i in 0..7 loop code := code || substr(alphabet, (get_byte(b, i) % 32) + 1, 1); end loop;
    exit when not exists (select 1 from campaigns where invite_code = code);
  end loop;
  return code;
end $$;

-- Crear campaña: quien la crea queda como Game Master
create or replace function public.create_campaign(p_name text, p_description text default '') returns public.campaigns
language plpgsql security definer set search_path = public as $$
declare c campaigns;
begin
  if auth.uid() is null then raise exception 'Inicia sesión para crear una campaña'; end if;
  insert into campaigns (name, description, invite_code, created_by)
  values (trim(p_name), coalesce(p_description, ''), new_invite_code(), auth.uid()) returning * into c;
  insert into campaign_members (campaign_id, user_id, role) values (c.id, auth.uid(), 'gm');
  return c;
end $$;

-- Unirse con código: entra como Jugador (si ya era miembro, conserva su rol)
create or replace function public.join_campaign(p_code text) returns uuid
language plpgsql security definer set search_path = public as $$
declare cid uuid;
begin
  if auth.uid() is null then raise exception 'Inicia sesión para unirte'; end if;
  select id into cid from campaigns where invite_code = upper(trim(p_code));
  if cid is null then raise exception 'Código de invitación no válido'; end if;
  insert into campaign_members (campaign_id, user_id, role) values (cid, auth.uid(), 'player')
  on conflict (campaign_id, user_id) do nothing;
  return cid;
end $$;

-- Nuevo código (invalida el anterior). Solo el GM.
create or replace function public.regenerate_invite(p_campaign uuid) returns text
language plpgsql security definer set search_path = public as $$
declare code text;
begin
  if not is_gm(p_campaign) then raise exception 'Solo el Game Master puede cambiar el código'; end if;
  code := new_invite_code();
  update campaigns set invite_code = code where id = p_campaign;
  return code;
end $$;

-- Borrar la propia cuenta (RGPD). Borra perfil y membresías en cascada; las campañas que creó, también.
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then raise exception 'No has iniciado sesión'; end if;
  delete from auth.users where id = auth.uid();
end $$;

-- ───────────── Enciclopedia (contenido oficial: solo administradores escriben) ─────────────
create table if not exists public.encyclopedia_entries (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  title text not null,
  text text not null default '',
  image text,
  official boolean not null default false,
  updated_at timestamptz not null default now()
);

-- ───────────── Seguridad (RLS) ─────────────
alter table public.profiles enable row level security;
alter table public.app_roles enable row level security;
alter table public.user_roles enable row level security;
alter table public.campaigns enable row level security;
alter table public.campaign_members enable row level security;
alter table public.shared_files enable row level security;
alter table public.file_user_shares enable row level security;
alter table public.file_role_shares enable row level security;
alter table public.encyclopedia_entries enable row level security;

-- Políticas de perfiles: cualquier usuario autenticado puede ver el directorio de usuarios para compartir archivos
drop policy if exists "perfil: ver propio o compañeros" on public.profiles;
drop policy if exists "perfil: directorio autenticado" on public.profiles;
create policy "perfil: directorio autenticado" on public.profiles for select to authenticated
  using (true);
drop policy if exists "perfil: editar el propio" on public.profiles;
create policy "perfil: editar el propio" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- Políticas de roles y asignaciones
drop policy if exists "roles: lectura autenticada" on public.app_roles;
create policy "roles: lectura autenticada" on public.app_roles for select to authenticated
  using (true);

drop policy if exists "user_roles: lectura autenticada" on public.user_roles;
create policy "user_roles: lectura autenticada" on public.user_roles for select to authenticated
  using (true);

-- Políticas de campañas
drop policy if exists "campaña: ver si eres miembro" on public.campaigns;
create policy "campaña: ver si eres miembro" on public.campaigns for select to authenticated
  using (is_member(id) or is_admin());
drop policy if exists "campaña: el GM edita" on public.campaigns;
create policy "campaña: el GM edita" on public.campaigns for update to authenticated
  using (is_gm(id)) with check (is_gm(id));
drop policy if exists "campaña: el GM borra" on public.campaigns;
create policy "campaña: el GM borra" on public.campaigns for delete to authenticated
  using (is_gm(id));

drop policy if exists "miembros: ver los de tus campañas" on public.campaign_members;
create policy "miembros: ver los de tus campañas" on public.campaign_members for select to authenticated
  using (is_member(campaign_id) or is_admin());
drop policy if exists "miembros: salir o expulsar" on public.campaign_members;
create policy "miembros: salir o expulsar" on public.campaign_members for delete to authenticated
  using (user_id = auth.uid() or is_gm(campaign_id));

-- Políticas de archivos compartidos
drop policy if exists "archivos: ver autorizados" on public.shared_files;
create policy "archivos: ver autorizados" on public.shared_files for select to authenticated
  using (can_read_file(id));

drop policy if exists "archivos: subir propios" on public.shared_files;
create policy "archivos: subir propios" on public.shared_files for insert to authenticated
  with check (owner_id = auth.uid() and can_upload_files());

drop policy if exists "archivos: editar propios o admin" on public.shared_files;
create policy "archivos: editar propios o admin" on public.shared_files for update to authenticated
  using (can_manage_file(id)) with check (can_manage_file(id));

drop policy if exists "archivos: borrar propios o admin" on public.shared_files;
create policy "archivos: borrar propios o admin" on public.shared_files for delete to authenticated
  using (can_manage_file(id));

drop policy if exists "file_user_shares: ver si lees archivo" on public.file_user_shares;
create policy "file_user_shares: ver si lees archivo" on public.file_user_shares for select to authenticated
  using (user_id = auth.uid() or can_read_file(file_id));

drop policy if exists "file_role_shares: ver si lees archivo" on public.file_role_shares;
create policy "file_role_shares: ver si lees archivo" on public.file_role_shares for select to authenticated
  using (can_read_file(file_id));

-- Políticas de enciclopedia
drop policy if exists "enciclopedia: lectura pública" on public.encyclopedia_entries;
create policy "enciclopedia: lectura pública" on public.encyclopedia_entries for select using (true);
drop policy if exists "enciclopedia: admin escribe" on public.encyclopedia_entries;
create policy "enciclopedia: admin escribe" on public.encyclopedia_entries for all to authenticated
  using (is_admin()) with check (is_admin());

-- ───────────── Bucket de Storage para archivos ─────────────
insert into storage.buckets (id, name, public, file_size_limit)
values ('orbise-files', 'orbise-files', false, 52428800) -- 50 MB por archivo
on conflict (id) do update set file_size_limit = 52428800;

drop policy if exists "storage: subir a carpeta propia" on storage.objects;
create policy "storage: subir a carpeta propia" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'orbise-files'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.can_upload_files()
  );

drop policy if exists "storage: descargar archivos compartidos" on storage.objects;
create policy "storage: descargar archivos compartidos" on storage.objects for select to authenticated
  using (
    bucket_id = 'orbise-files'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1 from public.shared_files sf
        where sf.storage_path = storage.objects.name
          and public.can_read_file(sf.id)
      )
    )
  );

drop policy if exists "storage: borrar propios o admin" on storage.objects;
create policy "storage: borrar propios o admin" on storage.objects for delete to authenticated
  using (
    bucket_id = 'orbise-files'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.can_manage_all_files()
    )
  );

-- ───────────── Permisos de tablas y funciones ─────────────
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (display_name) on public.profiles to authenticated;
revoke insert, update, delete on public.app_roles from anon, authenticated;
revoke insert, update, delete on public.user_roles from anon, authenticated;
revoke insert, update on public.campaigns from anon, authenticated;
grant update (name, description, paused) on public.campaigns to authenticated;
revoke insert, update on public.campaign_members from anon, authenticated;
revoke insert, update, delete on public.file_user_shares from anon, authenticated;
revoke insert, update, delete on public.file_role_shares from anon, authenticated;
grant select, insert, update, delete on public.shared_files to authenticated;

revoke execute on function
  public.create_campaign(text, text),
  public.join_campaign(text),
  public.regenerate_invite(uuid),
  public.new_invite_code(),
  public.delete_my_account(),
  public.upsert_role(text, text, text, text, boolean, boolean, boolean, boolean),
  public.delete_role(uuid),
  public.set_user_role(uuid, uuid, boolean),
  public.set_file_shares(uuid, boolean, uuid[], uuid[])
from public, anon;

grant execute on function
  public.create_campaign(text, text),
  public.join_campaign(text),
  public.regenerate_invite(uuid),
  public.delete_my_account(),
  public.upsert_role(text, text, text, text, boolean, boolean, boolean, boolean),
  public.delete_role(uuid),
  public.set_user_role(uuid, uuid, boolean),
  public.set_file_shares(uuid, boolean, uuid[], uuid[])
to authenticated;

-- ───────────── Nota sobre el primer Administrador ─────────────
-- El PRIMER usuario que se registre en la web recibe automáticamente el rol de Admin.
-- Si ya te habías registrado antes, puedes darte permiso de Admin ejecutando:
--   update public.profiles set is_admin = true
--   where id = (select id from auth.users where email = 'TU_CORREO_AQUI');
