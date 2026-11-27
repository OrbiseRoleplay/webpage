import type { DieSides } from '../rules/config'

export type Outcome = 'catastrofico' | 'ordinario' | 'extraordinario'

export interface RollResult { id: string; sides: DieSides; value: number; outcome: Outcome; at: string; label?: string; secret?: boolean }

/** Entero uniforme en [1, sides] sin sesgo de módulo (crypto). */
export function randomInt(sides: number): number {
  const buf = new Uint32Array(1)
  const limit = Math.floor(0x100000000 / sides) * sides
  do crypto.getRandomValues(buf); while (buf[0] >= limit)
  return (buf[0] % sides) + 1
}

export const outcomeOf = (sides: number, value: number): Outcome =>
  value === 1 ? 'catastrofico' : value === sides ? 'extraordinario' : 'ordinario'

export function roll(sides: DieSides, label?: string, secret = false): RollResult {
  const value = randomInt(sides)
  return { id: crypto.randomUUID(), sides, value, outcome: outcomeOf(sides, value), at: new Date().toISOString(), label, secret }
}

export const OUTCOME_TEXT: Record<Outcome, string> = {
  catastrofico: 'FRACASO CATASTRÓFICO',
  ordinario: 'Resultado ordinario',
  extraordinario: '¡ÉXITO EXTRAORDINARIO!',
}
