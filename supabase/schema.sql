-- ORBISE ROLEPLAY · Esquema online, fase A: cuentas, roles y campañas.
-- Cómo aplicarlo: Supabase → SQL Editor → New query → pegar todo → Run.
-- Es idempotente en lo posible: se puede volver a ejecutar tras cambios.
--
-- Roles:
--   Administrador → profiles.is_admin (solo se activa a mano con SQL, ver final del archivo)
--   Game Master   → campaign_members.role = 'gm'     (automático al crear una campaña)
--   Jugador       → campaign_members.role = 'player' (automático al unirse con código)
-- Toda la seguridad está aquí (RLS + funciones). La app no decide permisos.

create extension if not exists pgcrypto;

-- ───────────── Perfiles ─────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 40),
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, left(coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'), ''), split_part(new.email, '@', 1), 'Jugador'), 40));
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

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

-- Funciones auxiliares (security definer: evitan recursión en las políticas)
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from profiles where id = auth.uid()), false) $$;

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
alter table public.campaigns enable row level security;
alter table public.campaign_members enable row level security;
alter table public.encyclopedia_entries enable row level security;

drop policy if exists "perfil: ver propio o compañeros" on public.profiles;
create policy "perfil: ver propio o compañeros" on public.profiles for select to authenticated
  using (id = auth.uid() or shares_campaign(id) or is_admin());
drop policy if exists "perfil: editar el propio" on public.profiles;
create policy "perfil: editar el propio" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

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

drop policy if exists "enciclopedia: lectura pública" on public.encyclopedia_entries;
create policy "enciclopedia: lectura pública" on public.encyclopedia_entries for select using (true);
drop policy if exists "enciclopedia: admin escribe" on public.encyclopedia_entries;
create policy "enciclopedia: admin escribe" on public.encyclopedia_entries for all to authenticated
  using (is_admin()) with check (is_admin());

-- Permisos por columna: nadie se da a sí mismo is_admin ni cambia el código o el creador a mano.
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (display_name) on public.profiles to authenticated;
revoke insert, update on public.campaigns from anon, authenticated;
grant update (name, description, paused) on public.campaigns to authenticated;
revoke insert, update on public.campaign_members from anon, authenticated;

revoke execute on function public.create_campaign(text, text), public.join_campaign(text), public.regenerate_invite(uuid), public.new_invite_code(), public.delete_my_account() from public, anon;
grant execute on function public.create_campaign(text, text), public.join_campaign(text), public.regenerate_invite(uuid), public.delete_my_account() to authenticated;

-- ───────────── Activar tu cuenta de administrador (una sola vez) ─────────────
-- Tras registrarte en la app, ejecuta esto cambiando el correo por el tuyo:
--   update public.profiles set is_admin = true
--   where id = (select id from auth.users where email = 'TU_CORREO_AQUI');
