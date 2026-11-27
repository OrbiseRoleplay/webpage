// Conexión online (Supabase). Sin variables de entorno, la app sigue en modo local y `supabase` es null.
// Configuración: copia .env.example a .env.local y rellena URL y clave anon (nunca la service_role).
import { createClient, type Session } from '@supabase/supabase-js'
import { create } from 'zustand'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
export const supabase = url && key ? createClient(url, key) : null

export interface Profile { id: string; display_name: string; is_admin: boolean }
export interface Membership { role: 'gm' | 'player'; campaign: { id: string; name: string; description: string; invite_code: string; paused: boolean } }

interface OnlineState {
  session: Session | null
  profile: Profile | null
  memberships: Membership[]
  refresh: () => Promise<void>
}

export const useOnline = create<OnlineState>()((set, get) => ({
  session: null,
  profile: null,
  memberships: [],
  refresh: async () => {
    const uid = get().session?.user.id
    if (!supabase || !uid) return set({ profile: null, memberships: [] })
    const [p, m] = await Promise.all([
      supabase.from('profiles').select('id, display_name, is_admin').eq('id', uid).single(),
      supabase.from('campaign_members').select('role, campaign:campaigns(id, name, description, invite_code, paused)').eq('user_id', uid),
    ])
    set({ profile: p.data ?? null, memberships: (m.data as unknown as Membership[] | null) ?? [] })
  },
}))

if (supabase) {
  supabase.auth.onAuthStateChange((_e, session) => {
    useOnline.setState({ session })
    // Fuera del callback: supabase-js recomienda no esperar otras llamadas dentro de él
    setTimeout(() => useOnline.getState().refresh(), 0)
  })
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
