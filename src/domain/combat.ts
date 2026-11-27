import { RULES, type ReactionKey } from '../rules/config'
import type { RollResult } from './dice'
import type { Character } from './schema'

/** Ataque elegido: técnica del Don, arma equipada o declaración libre. */
export interface AttackChoice {
  kind: 'tecnica' | 'arma' | 'libre'
  refId?: string
  name: string
  /** Coste de resistencia propuesto (de la técnica). El GM puede cambiarlo al confirmar. */
  cost: number
  /** Motivo, si el GM autorizó usarlo pese a no cumplir los requisitos. */
  gmException?: string
}

export function attackOptions(c: Character): AttackChoice[] {
  return [
    ...c.gift.techniques.map((t) => ({ kind: 'tecnica' as const, refId: t.id, name: t.name || 'Técnica sin nombre', cost: t.cost })),
    ...c.items.filter((i) => i.section === 'armas' && i.equipped).map((i) => ({ kind: 'arma' as const, refId: i.id, name: i.name || 'Arma sin nombre', cost: 0 })),
  ]
}

/** Motivo por el que no se puede usar el ataque sin excepción del GM, o null si se puede.
 *  Solo avisa: qué ocurre en ese caso no tiene regla oficial. */
export function attackIssue(c: Character, a: AttackChoice): string | null {
  if (a.kind !== 'tecnica') return null
  const t = c.gift.techniques.find((x) => x.id === a.refId)
  if (t && !t.unlocked) return 'Técnica bloqueada: aún no está desbloqueada.'
  if (a.cost > c.current.resistencia) return `Resistencia insuficiente: cuesta ${a.cost} y le quedan ${c.current.resistencia}.`
  return null
}

export type Verdict = 'reaccionExitosa' | 'reaccionFallida' | 'manual'

export interface Exchange {
  id: string
  round: number
  attackerId: string
  targetId: string
  action: string
  attack?: AttackChoice
  reaction: ReactionKey
  attackRoll: RollResult
  reactionRoll: RollResult
  verdict: Verdict
  /** Motivo de resolución manual (empate, críticos). */
  manualReason?: string
  summary: string
  confirmed: boolean
}

/** Compara tiradas enfrentadas. Sin modificadores de atributos (regla oficial).
 *  Empates y conflictos de críticos → resolución manual del GM (regla pendiente). */
export function judge(attack: RollResult, reaction: RollResult): { verdict: Verdict; manualReason?: string } {
  const critA = attack.outcome !== 'ordinario'
  const critR = reaction.outcome !== 'ordinario'
  if (critA && critR) return { verdict: 'manual', manualReason: 'Críticos simultáneos: resuelve el GM.' }
  if (attack.value === reaction.value) return { verdict: 'manual', manualReason: 'Empate: resuelve el GM.' }
  return { verdict: reaction.value > attack.value ? 'reaccionExitosa' : 'reaccionFallida' }
}

export function describe(reaction: ReactionKey, verdict: Verdict, manualReason?: string) {
  if (verdict === 'manual') return manualReason ?? 'Resolución manual del GM.'
  if (verdict === 'reaccionFallida') return 'La reacción falla: el objetivo recibe el ataque o sus consecuencias.'
  return RULES.reactions[reaction].success
}

/** ¿Puede este personaje aún beneficiarse de una defensa exitosa en este combate? */
export function defenseUsesLeft(log: Exchange[], targetId: string) {
  const used = log.filter((e) => e.targetId === targetId && e.reaction === 'defenderse' && e.verdict === 'reaccionExitosa' && e.confirmed).length
  return RULES.reactions.defenderse.maxSuccessPerCombat - used
}
