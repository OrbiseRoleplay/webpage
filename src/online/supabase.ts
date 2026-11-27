// Conexión online (Supabase). Sin variables de entorno, la app sigue en modo local y `supabase` es null.
// Configuración: copia .env.example a .env.local y rellena URL y clave anon (nunca la service_role).
import { createClient, type Session } from '@supabase/supabase-js'
import { create } from 'zustand'
import type { Character } from '../domain/schema'
import { displayName } from '../domain/character'
import { useStore } from '../store/useStore'

const env = import.meta.env as Record<string, string | undefined>
const url = env.VITE_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL || 'https://nkihmftiwhcflpeczixr.supabase.co'
const key = env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY || env.SUPABASE_PUBLISHABLE_KEY
export const supabase = url && key ? createClient(url, key) : null

export const FILES_BUCKET = 'orbise-files'

const INVITE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

/** Genera un código de invitación criptográficamente seguro de 8 caracteres sin ambigüedades. */
export function generateInviteCode(): string {
  const bytes = new Uint8Array(8)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => INVITE_ALPHABET[b % INVITE_ALPHABET.length]).join('')
}

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

export interface CampaignParticipant {
  campaign_id: string
  user_id: string
  role: 'gm' | 'player'
  joined_at: string
}

export interface CampaignRole {
  id: string
  campaign_id: string
  name: string
  color: string
  description: string
  can_edit_campaign: boolean
  can_manage_characters: boolean
}

export interface CampaignMemberRole {
  campaign_id: string
  user_id: string
  role_id: string
}

export interface CampaignCharacterRecord {
  id: string
  campaign_id: string
  owner_id: string
  name: string
  data: Character
  updated_at: string
}

interface OnlineState {
  session: Session | null
  profile: Profile | null
  memberships: Membership[]
  roles: AppRole[]
  users: Profile[]
  userRoles: UserRoleAssignment[]
  files: SharedFileRecord[]
  campaignParticipants: CampaignParticipant[]
  campaignRoles: CampaignRole[]
  campaignMemberRoles: CampaignMemberRole[]
  campaignCharacters: CampaignCharacterRecord[]
  activeCampaignId: string | null
  setActiveCampaignId: (id: string | null) => void
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
  campaignParticipants: [],
  campaignRoles: [],
  campaignMemberRoles: [],
  campaignCharacters: [],
  activeCampaignId: null,
  setActiveCampaignId: (activeCampaignId) => set({ activeCampaignId }),
  refresh: async () => {
    const uid = get().session?.user.id
    if (!supabase || !uid) {
      return set({
        profile: null,
        memberships: [],
        roles: [],
        users: [],
        userRoles: [],
        files: [],
        campaignParticipants: [],
        campaignRoles: [],
        campaignMemberRoles: [],
        campaignCharacters: [],
      })
    }
    const [p, m, r, u, ur, f, frs, fus, cp, cr, cmr, cc] = await Promise.all([
      supabase.from('profiles').select('id, display_name, email, is_admin, created_at').eq('id', uid).single(),
      supabase.from('campaign_members').select('role, campaign:campaigns(id, name, description, invite_code, paused)').eq('user_id', uid),
      supabase.from('app_roles').select('*').order('is_system', { ascending: false }).order('name'),
      supabase.from('profiles').select('id, display_name, email, is_admin, created_at').order('display_name'),
      supabase.from('user_roles').select('user_id, role_id'),
      supabase.from('shared_files').select('*').order('created_at', { ascending: false }),
      supabase.from('file_role_shares').select('file_id, role_id'),
      supabase.from('file_user_shares').select('file_id, user_id'),
      supabase.from('campaign_members').select('campaign_id, user_id, role, joined_at'),
      supabase.from('campaign_roles').select('*').order('name'),
      supabase.from('campaign_member_roles').select('campaign_id, user_id, role_id'),
      supabase.from('campaign_characters').select('*').order('updated_at', { ascending: false }),
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

    const profile = (p.data as Profile | null) ?? null
    const roles = (r.data as AppRole[] | null) ?? []
    const userRoles = (ur.data as UserRoleAssignment[] | null) ?? []
    const memberships = ((m.data as unknown as Membership[] | null) ?? []).filter((x) => x.campaign)
    const campaignCharacters = (cc.data as CampaignCharacterRecord[] | null) ?? []

    set({
      profile,
      memberships,
      roles,
      users: (u.data as Profile[] | null) ?? [],
      userRoles,
      files,
      campaignParticipants: (cp.data as CampaignParticipant[] | null) ?? [],
      campaignRoles: (cr.data as CampaignRole[] | null) ?? [],
      campaignMemberRoles: (cmr.data as CampaignMemberRole[] | null) ?? [],
      campaignCharacters,
    })

    // Sincronizar fichas remotas de campaña con el store local para que cambios del Master o del jugador se reflejen en ambos lados
    const store = useStore.getState()
    const currentCharacters = [...store.characters]
    let charsChanged = false
    for (const remoteChar of campaignCharacters) {
      if (!remoteChar.data || typeof remoteChar.data !== 'object') continue
      const incoming: Character = { ...remoteChar.data, id: remoteChar.id, campaignId: remoteChar.campaign_id }
      const localIdx = currentCharacters.findIndex((c) => c.id === remoteChar.id)
      const isMine = remoteChar.owner_id === uid
      const amCampaignGm = memberships.some((m) => m.campaign.id === remoteChar.campaign_id && m.role === 'gm') || Boolean(profile?.is_admin)

      if (localIdx >= 0) {
        const localChar = currentCharacters[localIdx]
        const remoteTime = Date.parse(remoteChar.updated_at || incoming.updatedAt || '') || 0
        const localTime = Date.parse(localChar.updatedAt || '') || 0
        // Si la versión en la nube es más reciente (p. ej. el Master aplicó un estado o subió el nivel), actualizamos la ficha local
        if (remoteTime > localTime || JSON.stringify(localChar.conditions) !== JSON.stringify(incoming.conditions) && remoteTime >= localTime) {
          currentCharacters[localIdx] = incoming
          charsChanged = true
        }
      } else if (isMine || amCampaignGm) {
        // Si la ficha es mía o soy el Master de su campaña, la cargamos en el store local para poder verla y editarla
        currentCharacters.unshift(incoming)
        charsChanged = true
      }
    }
    if (charsChanged) {
      useStore.setState({ characters: currentCharacters })
    }

    // Sincronizar campañas online hacia el store local para que tengan su perfil completo en Campañas
    const currentCampaigns = useStore.getState().campaigns
    for (const mem of memberships) {
      const existing = currentCampaigns.find((c) => c.id === mem.campaign.id)
      const campCharIds = campaignCharacters
        .filter((ch) => ch.campaign_id === mem.campaign.id)
        .map((ch) => ch.id)
      if (!existing) {
        store.saveCampaign({
          id: mem.campaign.id,
          name: mem.campaign.name,
          description: mem.campaign.description ?? '',
          inviteCode: mem.campaign.invite_code,
          createdAt: new Date().toISOString(),
          characterIds: campCharIds,
          missions: [],
          journal: [],
          scenarios: [],
          paused: mem.campaign.paused,
        })
      } else if (
        existing.name !== mem.campaign.name ||
        existing.inviteCode !== mem.campaign.invite_code ||
        existing.paused !== mem.campaign.paused
      ) {
        store.saveCampaign({
          ...existing,
          name: mem.campaign.name,
          description: mem.campaign.description || existing.description,
          inviteCode: mem.campaign.invite_code,
          paused: mem.campaign.paused,
          characterIds: [...new Set([...existing.characterIds, ...campCharIds])],
        })
      }
    }

    // Si el usuario tiene rol de Admin, Master o es GM de una campaña, activamos automáticamente el modo GM
    if (canUseGmTools(profile, roles, userRoles, memberships) && !useStore.getState().gmMode) {
      useStore.getState().setGm(true)
    }
  },
}))

if (supabase) {
  supabase.auth.onAuthStateChange((_e, session) => {
    useOnline.setState({ session })
    // Fuera del callback: supabase-js recomienda no esperar otras llamadas dentro de él
    setTimeout(() => useOnline.getState().refresh(), 0)
  })

  // Suscripción Realtime: cuando el Master o el jugador modifica una ficha de campaña, se actualiza al instante en ambos lados
  supabase
    .channel('orbise-campaign-characters-sync')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'campaign_characters' }, () => {
      useOnline.getState().refresh()
    })
    .subscribe()
}

/** Sube o actualiza una ficha dentro del perfil online de una campaña (conservando su propietario original si edita el Master). */
export async function syncCharacterToCampaign(
  character: Character,
  campaignId?: string | null,
  ownerIdOverride?: string
): Promise<{ error: { message?: string } | null }> {
  const state = useOnline.getState()
  const uid = state.session?.user.id
  if (!supabase || !uid) return { error: null }

  const existingRecord = state.campaignCharacters.find((cc) => cc.id === character.id)
  const targetCampaignId = campaignId || character.campaignId || existingRecord?.campaign_id
  if (!targetCampaignId) return { error: null }

  const ownerId = ownerIdOverride || existingRecord?.owner_id || uid
  const nowIso = new Date().toISOString()
  const payloadChar: Character = { ...character, campaignId: targetCampaignId, updatedAt: nowIso }

  const { error } = await supabase.from('campaign_characters').upsert({
    id: character.id,
    campaign_id: targetCampaignId,
    owner_id: ownerId,
    name: displayName(character),
    data: payloadChar,
    updated_at: nowIso,
  })
  return { error }
}

/** Comprueba si el usuario actual tiene permiso de administración de roles y usuarios. */
export function canManageRoles(profile: Profile | null, roles: AppRole[], userRoles: UserRoleAssignment[]): boolean {
  if (!profile) return false
  if (profile.is_admin) return true
  const myRoleIds = new Set(userRoles.filter((ur) => ur.user_id === profile.id).map((ur) => ur.role_id))
  return roles.some((r) => myRoleIds.has(r.id) && (r.slug === 'admin' || r.can_manage_roles))
}

/** Comprueba si el usuario tiene permisos de Master / GM. */
export function canUseGmTools(
  profile: Profile | null,
  roles: AppRole[],
  userRoles: UserRoleAssignment[],
  memberships: Membership[] = []
): boolean {
  if (!profile) return false
  if (profile.is_admin) return true
  if (memberships.some((m) => m.role === 'gm')) return true
  const myRoleIds = new Set(userRoles.filter((ur) => ur.user_id === profile.id).map((ur) => ur.role_id))
  return roles.some((r) => myRoleIds.has(r.id) && (r.can_gm || r.slug === 'master' || r.slug === 'admin' || r.can_manage_roles))
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

/** Crea una campaña en Supabase con respaldo automático si new_invite_code falla por pgcrypto. */
export async function createOnlineCampaign(
  name: string,
  description = ''
): Promise<{ data?: { id: string; invite_code: string }; error: { message?: string } | null }> {
  if (!supabase) return { error: { message: 'Modo online no disponible' } }
  const rpc = await supabase.rpc('create_campaign', { p_name: name.trim(), p_description: description })
  if (!rpc.error && rpc.data) {
    const c = rpc.data as { id: string; invite_code: string }
    return { data: c, error: null }
  }

  // Respaldo directo si la función SQL antigua tenía error de gen_random_bytes
  const uid = useOnline.getState().session?.user.id
  if (!uid) return { error: rpc.error }
  const code = generateInviteCode()
  const ins = await supabase
    .from('campaigns')
    .insert({ name: name.trim(), description, invite_code: code, created_by: uid })
    .select('id, invite_code')
    .single()
  if (ins.error || !ins.data) return { error: ins.error ?? rpc.error }
  const mem = await supabase.from('campaign_members').insert({ campaign_id: ins.data.id, user_id: uid, role: 'gm' })
  return { data: ins.data, error: mem.error }
}

/** Unirse a una campaña con código de 8 caracteres y crear/abrir automáticamente un personaje para participar. */
export async function joinOnlineCampaign(
  code: string
): Promise<{ campaignId?: string; characterId?: string; createdNewCharacter?: boolean; error: { message?: string } | null }> {
  if (!supabase) return { error: { message: 'Modo online no disponible' } }
  const clean = code.trim().toUpperCase()
  const rpc = await supabase.rpc('join_campaign', { p_code: clean })
  if (rpc.error || !rpc.data) {
    return { error: rpc.error }
  }

  const campaignId = String(rpc.data)
  await useOnline.getState().refresh()

  const store = useStore.getState()
  const onlineState = useOnline.getState()
  const uid = onlineState.session?.user.id

  // Comprobar si el usuario ya tenía un personaje creado en esta campaña
  const existingLocal = store.characters.find((c) => !c.isTemplate && c.campaignId === campaignId)
  const existingRemote = onlineState.campaignCharacters.find((cc) => cc.campaign_id === campaignId && cc.owner_id === uid)

  if (existingLocal) {
    onlineState.setActiveCampaignId(campaignId)
    return { campaignId, characterId: existingLocal.id, createdNewCharacter: false, error: null }
  }

  if (existingRemote) {
    store.importCharacter({ ...existingRemote.data, campaignId })
    onlineState.setActiveCampaignId(campaignId)
    return { campaignId, characterId: existingRemote.id, createdNewCharacter: false, error: null }
  }

  // Si no tiene personaje en esta campaña, creamos su nueva ficha para participar y la abrimos en el editor
  const newChar = store.createCharacter({ campaignId })
  const camp = store.campaigns.find((c) => c.id === campaignId)
  if (camp) {
    store.saveCampaign({ ...camp, characterIds: [...new Set([...camp.characterIds, newChar.id])] })
  }
  await syncCharacterToCampaign(newChar, campaignId)
  await useOnline.getState().refresh()
  onlineState.setActiveCampaignId(campaignId)
  store.edit(newChar.id)

  return { campaignId, characterId: newChar.id, createdNewCharacter: true, error: null }
}

/** Regenera el código de invitación de una campaña con respaldo en cliente si falla pgcrypto. */
export async function regenerateOnlineInvite(campaignId: string): Promise<{ error: { message?: string } | null }> {
  if (!supabase) return { error: { message: 'Modo online no disponible' } }
  const rpc = await supabase.rpc('regenerate_invite', { p_campaign: campaignId })
  if (!rpc.error) return { error: null }
  const code = generateInviteCode()
  const upd = await supabase.from('campaigns').update({ invite_code: code }).eq('id', campaignId)
  return { error: upd.error ?? rpc.error }
}

/** Quita una ficha del perfil online de una campaña. */
export async function removeCharacterFromCampaign(characterId: string, campaignId: string): Promise<{ error: { message?: string } | null }> {
  if (!supabase) return { error: null }
  const { error } = await supabase.from('campaign_characters').delete().eq('id', characterId).eq('campaign_id', campaignId)
  return { error }
}

/** Abre directamente el perfil de una campaña en la pantalla Campañas. */
export function openCampaignProfile(campaignId: string) {
  useOnline.getState().setActiveCampaignId(campaignId)
  useStore.getState().go('campanas')
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
