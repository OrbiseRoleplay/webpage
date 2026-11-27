import { ATTRIBUTES, ATTR_BY_KEY, RULES, type AttributeKey } from '../rules/config'
import { Character, type AttributePoints, type Visibility } from './schema'

export const uid = () => crypto.randomUUID()
export const now = () => new Date().toISOString()

const zeroPoints = () => Object.fromEntries(ATTRIBUTES.map((a) => [a.key, 0])) as AttributePoints

export function perPoint(c: Character, key: AttributeKey) {
  return c.perPointOverride[key] ?? ATTR_BY_KEY[key].perPoint
}

/** Valor máximo/final de un atributo: base + puntos × incremento + bono del GM. */
export function attrValue(c: Character, key: AttributeKey) {
  return ATTR_BY_KEY[key].base + c.points[key] * perPoint(c, key) + c.bonus[key]
}

export const pointsSpent = (c: Character) => Object.values(c.points).reduce((a, b) => a + b, 0)
export const pointsLeft = (c: Character) => (c.unlimitedPoints ? Infinity : c.pointBudget - pointsSpent(c))

/** Cambia los puntos invertidos respetando el presupuesto. Devuelve el personaje sin cambios si no es válido. */
export function setPoints(c: Character, key: AttributeKey, value: number): Character {
  const v = Math.max(0, Math.floor(value))
  const others = pointsSpent(c) - c.points[key]
  if (!c.unlimitedPoints && others + v > c.pointBudget) return c
  const next = { ...c, points: { ...c.points, [key]: v } }
  return syncVitals(c, next)
}

/** Cuando sube el máximo de un vital, el actual sube lo mismo; si baja, se recorta. */
export function syncVitals(prev: Character, next: Character): Character {
  const current = { ...next.current }
  for (const k of ['vitAmarilla', 'vitRoja', 'resistencia'] as const) {
    const d = attrValue(next, k) - attrValue(prev, k)
    current[k] = Math.min(attrValue(next, k), Math.max(0, current[k] + Math.max(0, d)))
  }
  return { ...next, current }
}

export function newCharacter(): Character {
  const t = now()
  const base: Character = Character.parse({
    id: uid(),
    createdAt: t,
    updatedAt: t,
    identity: {},
    gift: {},
    points: zeroPoints(),
    bonus: zeroPoints(),
    current: { vitAmarilla: ATTR_BY_KEY.vitAmarilla.base, vitRoja: ATTR_BY_KEY.vitRoja.base, resistencia: ATTR_BY_KEY.resistencia.base },
  })
  return base
}

export function duplicateCharacter(c: Character): Character {
  const t = now()
  return { ...structuredClone(c), id: uid(), createdAt: t, updatedAt: t, approved: false, campaignId: null,
    identity: { ...c.identity, firstName: `${c.identity.firstName} (copia)`.trim() } }
}

export const displayName = (c: Character) =>
  [c.identity.firstName, c.identity.lastName].filter(Boolean).join(' ') || 'Sin nombre'

export const mainImage = (c: Character) =>
  c.gallery.find((g) => g.id === c.mainImageId)?.dataUrl ?? c.gallery[0]?.dataUrl

export type Audience = 'publico' | 'jugador' | 'gm'
const allowed: Record<Audience, Visibility[]> = {
  publico: ['publico'],
  jugador: ['publico', 'privado', 'jugadorGM'],
  gm: ['publico', 'privado', 'jugadorGM', 'soloGM'],
}

/** Elimina todo lo que la audiencia no puede ver. Usar SIEMPRE antes de exportar o compartir. */
export function viewFor(c: Character, audience: Audience): Character {
  const out = structuredClone(c)
  out.story = out.story.filter((s) => allowed[audience].includes(s.visibility))
  out.gallery = audience === 'gm' ? out.gallery : out.gallery.filter((g) => g.visible)
  if (audience !== 'gm') {
    out.gift.gmNotes = ''
    out.items = out.items.map((i) => ({ ...i, gmNotes: '' }))
    out.history = []
  }
  return out
}

export const capacityFor = (c: Character, section: keyof Character['capacity']) => c.capacity[section]
export { RULES }
