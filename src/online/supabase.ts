// Conexión online (Supabase). Sin variables de entorno, la app sigue en modo local y `supabase` es null.
// Configuración: copia .env.example a .env.local y rellena URL y clave anon (nunca la service_role).
import { createClient, type Session } from '@supabase/supabase-js'
import { create } from 'zustand'

const env = import.meta.env as Record<string, string | undefined>
const url = env.VITE_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL || 'https://nkihmftiwhcflpeczixr.supabase.co'
const key = env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY || env.SUPABASE_PUBLISHABLE_KEY
export const supabase = url && key ? createClient(url, key) : null

export const FILES_BUCKET = 'orbise-files'

export interface Profile {
  id: string
  display_name: string
  email: string
  is_admin: boolean
  created_at?: string
}

export interface AppRole {
  id: string
  slug: string
  name: string
  description: string
  color: string
  is_system: boolean
  can_manage_roles: boolean
  can_gm: boolean
  can_upload: boolean
  can_manage_all_files: boolean
}

export interface UserRoleAssignment {
  user_id: string
  role_id: string
}

export interface SharedFileRecord {
  id: string
  owner_id: string
  title: string
  description: string
  file_name: string
  mime_type: string
  size_bytes: number
  storage_path: string
  is_public: boolean
  created_at: string
  role_ids: string[]
  user_ids: string[]
}

export interface Membership {
  role: 'gm' | 'player'
  campaign: { id: string; name: string; description: string; invite_code: string; paused: boolean }
}

interface OnlineState {
  session: Session | null
  profile: Profile | null
  memberships: Membership[]
  roles: AppRole[]
  users: Profile[]
  userRoles: UserRoleAssignment[]
  files: SharedFileRecord[]
  refresh: () => Promise<void>
}

export const useOnline = create<OnlineState>()((set, get) => ({
  session: null,
  profile: null,
  memberships: [],
  roles: [],
  users: [],
  userRoles: [],
  files: [],
  refresh: async () => {
    const uid = get().session?.user.id
    if (!supabase || !uid) {
      return set({ profile: null, memberships: [], roles: [], users: [], userRoles: [], files: [] })
    }
    const [p, m, r, u, ur, f, frs, fus] = await Promise.all([
      supabase.from('profiles').select('id, display_name, email, is_admin, created_at').eq('id', uid).single(),
      supabase.from('campaign_members').select('role, campaign:campaigns(id, name, description, invite_code, paused)').eq('user_id', uid),
      supabase.from('app_roles').select('*').order('is_system', { ascending: false }).order('name'),
      supabase.from('profiles').select('id, display_name, email, is_admin, created_at').order('display_name'),
      supabase.from('user_roles').select('user_id, role_id'),
      supabase.from('shared_files').select('*').order('created_at', { ascending: false }),
      supabase.from('file_role_shares').select('file_id, role_id'),
      supabase.from('file_user_shares').select('file_id, user_id'),
    ])

    const roleSharesByFile = new Map<string, string[]>()
    for (const row of (frs.data ?? []) as { file_id: string; role_id: string }[]) {
      const list = roleSharesByFile.get(row.file_id) ?? []
      list.push(row.role_id)
      roleSharesByFile.set(row.file_id, list)
    }

    const userSharesByFile = new Map<string, string[]>()
    for (const row of (fus.data ?? []) as { file_id: string; user_id: string }[]) {
      const list = userSharesByFile.get(row.file_id) ?? []
      list.push(row.user_id)
      userSharesByFile.set(row.file_id, list)
    }

    const files: SharedFileRecord[] = ((f.data ?? []) as Omit<SharedFileRecord, 'role_ids' | 'user_ids'>[]).map((file) => ({
      ...file,
      role_ids: roleSharesByFile.get(file.id) ?? [],
      user_ids: userSharesByFile.get(file.id) ?? [],
    }))

    set({
      profile: (p.data as Profile | null) ?? null,
      memberships: (m.data as unknown as Membership[] | null) ?? [],
      roles: (r.data as AppRole[] | null) ?? [],
      users: (u.data as Profile[] | null) ?? [],
      userRoles: (ur.data as UserRoleAssignment[] | null) ?? [],
      files,
    })
  },
}))

if (supabase) {
  supabase.auth.onAuthStateChange((_e, session) => {
    useOnline.setState({ session })
    // Fuera del callback: supabase-js recomienda no esperar otras llamadas dentro de él
    setTimeout(() => useOnline.getState().refresh(), 0)
  })
}

/** Comprueba si el usuario actual tiene permiso de administración de roles y usuarios. */
export function canManageRoles(profile: Profile | null, roles: AppRole[], userRoles: UserRoleAssignment[]): boolean {
  if (!profile) return false
  if (profile.is_admin) return true
  const myRoleIds = new Set(userRoles.filter((ur) => ur.user_id === profile.id).map((ur) => ur.role_id))
  return roles.some((r) => myRoleIds.has(r.id) && (r.slug === 'admin' || r.can_manage_roles))
}

/** Comprueba si el usuario actual puede subir archivos. */
export function canUploadFiles(profile: Profile | null, roles: AppRole[], userRoles: UserRoleAssignment[]): boolean {
  if (!profile) return false
  if (profile.is_admin) return true
  const myRoleIds = new Set(userRoles.filter((ur) => ur.user_id === profile.id).map((ur) => ur.role_id))
  if (myRoleIds.size === 0) return true
  return roles.some((r) => myRoleIds.has(r.id) && (r.can_upload || r.slug === 'admin'))
}

/** Comprueba si el usuario actual puede administrar todos los archivos. */
export function canManageAllFiles(profile: Profile | null, roles: AppRole[], userRoles: UserRoleAssignment[]): boolean {
  if (!profile) return false
  if (profile.is_admin) return true
  const myRoleIds = new Set(userRoles.filter((ur) => ur.user_id === profile.id).map((ur) => ur.role_id))
  return roles.some((r) => myRoleIds.has(r.id) && (r.can_manage_all_files || r.slug === 'admin'))
}

/** Traduce los errores habituales de Supabase a mensajes claros. */
export function authError(e: { message?: string } | null | undefined): string {
  const m = e?.message ?? ''
  if (/Invalid login credentials/i.test(m)) return 'Correo o contraseña incorrectos.'
  if (/Email not confirmed/i.test(m)) return 'Confirma tu correo: revisa tu bandeja de entrada.'
  if (/already registered/i.test(m)) return 'Ya existe una cuenta con ese correo. Inicia sesión.'
  if (/Password should be at least/i.test(m)) return 'La contraseña debe tener al menos 8 caracteres.'
  if (/rate limit/i.test(m)) return 'Demasiados intentos. Espera unos minutos.'
  if (/Failed to fetch|NetworkError/i.test(m)) return 'Sin conexión con el servidor. Revisa tu internet.'
  return m || 'Algo ha fallado. Inténtalo de nuevo.'
}
