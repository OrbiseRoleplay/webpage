// Formato .orbise: JSON versionado con imágenes embebidas (data URLs). Editable y reimportable.
import { FORMAT_VERSION, type Character } from '../domain/schema'
import { displayName, viewFor, type Audience } from '../domain/character'
import { migrateCharacter } from './migrate'

export interface OrbiseFile { app: 'ORBISE'; kind: 'character'; formatVersion: number; exportedAt: string; audience: Audience; character: Character }

export function toOrbise(c: Character, audience: Audience = 'jugador'): OrbiseFile {
  return { app: 'ORBISE', kind: 'character', formatVersion: FORMAT_VERSION, exportedAt: new Date().toISOString(), audience, character: viewFor(c, audience) }
}

/** Acepta .orbise o .json (envoltorio o personaje suelto). Lanza Error con mensaje legible. */
export function parseOrbise(text: string): Character {
  let raw: any
  try { raw = JSON.parse(text) } catch { throw new Error('El archivo no es JSON válido.') }
  const data = raw?.app === 'ORBISE' && raw.kind === 'character' ? raw.character : raw
  try { return migrateCharacter(data) } catch (e: any) {
    throw new Error(e?.issues ? 'El archivo no contiene una ficha ORBISE válida.' : e?.message ?? 'Archivo inválido.')
  }
}

export function download(name: string, data: Blob | string, mime = 'application/json') {
  const blob = typeof data === 'string' ? new Blob([data], { type: mime }) : data
  const url = URL.createObjectURL(blob)
  const a = Object.assign(document.createElement('a'), { href: url, download: name })
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export const fileBase = (c: Character) => displayName(c).replace(/[^\p{L}\p{N}_-]+/gu, '_') || 'personaje'

export function exportOrbise(c: Character, audience: Audience = 'jugador') {
  download(`${fileBase(c)}.orbise`, JSON.stringify(toOrbise(c, audience)))
}
export function exportJson(c: Character, audience: Audience = 'jugador') {
  download(`${fileBase(c)}.json`, JSON.stringify(toOrbise(c, audience), null, 2))
}
