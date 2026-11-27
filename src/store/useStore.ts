import { create } from 'zustand'
import { get as idbGet, set as idbSet } from 'idb-keyval'
import type { Campaign, Character, EncyclopediaEntry } from '../domain/schema'
import { Campaign as CampaignSchema, EncyclopediaEntry as EncSchema } from '../domain/schema'
import { migrateCharacter } from '../io/migrate'
import { duplicateCharacter, newCharacter, now } from '../domain/character'
import type { RollResult } from '../domain/dice'
import type { Exchange } from '../domain/combat'

export type Screen =
  | 'menu' | 'personajes' | 'editor' | 'campanas' | 'gm' | 'dados' | 'combate' | 'enciclopedia' | 'reglamento' | 'config' | 'cuenta'

export interface Settings {
  visualIntensity: number // 0..1
  reducedMotion: boolean
  noFlashes: boolean
  quickRoll: boolean
  haptics: boolean
  diceColor: string
  volume: { master: number; ui: number; dados: number; combate: number; notificaciones: number; ambiente: number }
}

export interface Toast { id: string; text: string; tone: 'info' | 'ok' | 'warn' | 'gold' | 'danger' }

export interface CombatState {
  active: boolean
  round: number
  participantIds: string[]
  turnIndex: number
  log: Exchange[]
}

interface State {
  loaded: boolean
  screen: Screen
  editingId: string | null
  characters: Character[]
  campaigns: Campaign[]
  encyclopedia: EncyclopediaEntry[]
  settings: Settings
  rolls: RollResult[]
  combat: CombatState
  toasts: Toast[]
  /** Modo GM local. En local el dueño del dispositivo controla todo: NO es un mecanismo de seguridad. */
  gmMode: boolean
  /** Estados previos de personajes para deshacer (GM). */
  undo: Character[]
}

interface Actions {
  go: (s: Screen) => void
  edit: (id: string) => void
  createCharacter: (patch?: Partial<Character>) => Character
  saveCharacter: (c: Character, change?: string, by?: string) => void
  deleteCharacter: (id: string) => void
  duplicate: (id: string) => void
  importCharacter: (c: Character) => void
  undoLast: () => void
  saveCampaign: (c: Campaign) => void
  deleteCampaign: (id: string) => void
  saveEntry: (e: EncyclopediaEntry) => void
  deleteEntry: (id: string) => void
  setSettings: (p: Partial<Settings>) => void
  addRoll: (r: RollResult) => void
  setCombat: (p: Partial<CombatState>) => void
  toast: (text: string, tone?: Toast['tone']) => void
  setGm: (on: boolean) => void
}

export const DEFAULT_SETTINGS: Settings = {
  visualIntensity: 0.8, reducedMotion: false, noFlashes: false, quickRoll: false, haptics: true, diceColor: '#5DEEFF',
  volume: { master: 0.7, ui: 0.6, dados: 0.8, combate: 0.8, notificaciones: 0.6, ambiente: 0.3 },
}

const replace = <T extends { id: string }>(list: T[], item: T) =>
  list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [item, ...list]

export const useStore = create<State & Actions>()((set, get) => ({
  loaded: false,
  screen: 'menu',
  editingId: null,
  characters: [],
  campaigns: [],
  encyclopedia: [],
  settings: DEFAULT_SETTINGS,
  rolls: [],
  combat: { active: false, round: 1, participantIds: [], turnIndex: 0, log: [] },
  toasts: [],
  gmMode: false,
  undo: [],

  go: (screen) => set({ screen }),
  edit: (id) => set({ editingId: id, screen: 'editor' }),
  createCharacter: (patch) => {
    const c = { ...newCharacter(), ...patch }
    set({ characters: [c, ...get().characters] })
    return c
  },
  saveCharacter: (c, change, by = get().gmMode ? 'GM' : 'jugador') => {
    const prev = get().characters.find((x) => x.id === c.id)
    const t = now()
    const next = { ...c, updatedAt: t, history: change ? [...c.history, { date: t, by, change }].slice(-500) : c.history }
    set({ characters: replace(get().characters, next), undo: prev && change ? [...get().undo, prev].slice(-30) : get().undo })
  },
  deleteCharacter: (id) => set({ characters: get().characters.filter((c) => c.id !== id) }),
  duplicate: (id) => {
    const c = get().characters.find((x) => x.id === id)
    if (c) set({ characters: [duplicateCharacter(c), ...get().characters] })
  },
  importCharacter: (c) => {
    const incoming = get().characters.some((x) => x.id === c.id) ? { ...c, id: crypto.randomUUID() } : c
    set({ characters: [incoming, ...get().characters] })
  },
  undoLast: () => {
    const stack = [...get().undo]
    const prev = stack.pop()
    if (!prev) return get().toast('Nada que deshacer', 'warn')
    set({ undo: stack, characters: replace(get().characters, prev) })
    get().toast('Modificación deshecha', 'info')
  },
  saveCampaign: (c) => set({ campaigns: replace(get().campaigns, c) }),
  deleteCampaign: (id) => set({ campaigns: get().campaigns.filter((c) => c.id !== id) }),
  saveEntry: (e) => set({ encyclopedia: replace(get().encyclopedia, e) }),
  deleteEntry: (id) => set({ encyclopedia: get().encyclopedia.filter((e) => e.id !== id) }),
  setSettings: (p) => set({ settings: { ...get().settings, ...p } }),
  addRoll: (r) => set({ rolls: [r, ...get().rolls].slice(0, 200) }),
  setCombat: (p) => set({ combat: { ...get().combat, ...p } }),
  toast: (text, tone = 'info') => {
    const t = { id: crypto.randomUUID(), text, tone }
    set({ toasts: [...get().toasts, t] })
    setTimeout(() => set({ toasts: get().toasts.filter((x) => x.id !== t.id) }), 3200)
  },
  setGm: (gmMode) => set({ gmMode }),
}))

// ---------- Persistencia IndexedDB (guardado automático) ----------
const KEY = 'orbise:v1'
type Saved = Pick<State, 'characters' | 'campaigns' | 'encyclopedia' | 'settings' | 'rolls' | 'combat'>

export async function loadPersisted() {
  try {
    const raw = (await idbGet(KEY)) as Partial<Saved> | undefined
    if (raw) {
      let bad = 0
      const characters = (raw.characters ?? []).flatMap((c) => {
        try { return [migrateCharacter(c)] } catch { bad++; return [] }
      })
      const campaigns = (raw.campaigns ?? []).flatMap((c) => { const r = CampaignSchema.safeParse(c); return r.success ? [r.data] : [] })
      const encyclopedia = (raw.encyclopedia ?? []).flatMap((e) => { const r = EncSchema.safeParse(e); return r.success ? [r.data] : [] })
      useStore.setState({
        characters, campaigns, encyclopedia,
        settings: { ...DEFAULT_SETTINGS, ...raw.settings, volume: { ...DEFAULT_SETTINGS.volume, ...raw.settings?.volume } },
        rolls: raw.rolls ?? [],
        combat: raw.combat ?? useStore.getState().combat,
      })
      if (bad) {
        // No se pierden datos: el bloque original se aparta como copia de recuperación
        await idbSet(`orbise:corrupt:${Date.now()}`, raw)
        useStore.getState().toast(`${bad} personaje(s) dañados apartados en copia de recuperación`, 'warn')
      }
    }
  } catch (e) {
    console.error('Error cargando datos locales', e)
    useStore.getState().toast('No se pudieron cargar los datos locales', 'danger')
  }
  useStore.setState({ loaded: true })

  let timer: ReturnType<typeof setTimeout> | undefined
  useStore.subscribe((s, p) => {
    if (s.characters === p.characters && s.campaigns === p.campaigns && s.encyclopedia === p.encyclopedia &&
        s.settings === p.settings && s.rolls === p.rolls && s.combat === p.combat) return
    clearTimeout(timer)
    timer = setTimeout(() => {
      const { characters, campaigns, encyclopedia, settings, rolls, combat } = useStore.getState()
      idbSet(KEY, { characters, campaigns, encyclopedia, settings, rolls, combat } satisfies Saved)
        .then(() => window.dispatchEvent(new Event('orbise:saved')))
        .catch(() => useStore.getState().toast('Error al guardar. Exporta una copia de seguridad.', 'danger'))
    }, 400)
  })
}

/** Copia de seguridad completa del almacenamiento local. */
export function backupAll() {
  const { characters, campaigns, encyclopedia, settings } = useStore.getState()
  return { app: 'ORBISE', kind: 'backup', formatVersion: 1, date: now(), characters, campaigns, encyclopedia, settings }
}
