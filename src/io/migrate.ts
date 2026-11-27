import { Character, FORMAT_VERSION } from '../domain/schema'

/** Migraciones por versión: cada función transforma vN → vN+1. Añadir aquí al cambiar el formato. */
const MIGRATIONS: Record<number, (raw: any) => any> = {
  // 1: (raw) => ({ ...raw, formatVersion: 2 }),
}

export function migrateCharacter(raw: unknown): Character {
  let data: any = raw
  let v = typeof data?.formatVersion === 'number' ? data.formatVersion : 1
  if (v > FORMAT_VERSION) throw new Error(`Formato v${v} más reciente que la app (v${FORMAT_VERSION}). Actualiza ORBISE.`)
  while (v < FORMAT_VERSION) data = MIGRATIONS[v++](data)
  return Character.parse(data)
}
