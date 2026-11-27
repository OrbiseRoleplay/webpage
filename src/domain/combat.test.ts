import { describe, expect, it } from 'vitest'
import { roll, type RollResult } from './dice'
import { defenseUsesLeft, judge, type Exchange } from './combat'

const r = (value: number, sides: 6 | 20 | 60 = 20): RollResult =>
  ({ id: String(Math.random()), sides, value, outcome: value === 1 ? 'catastrofico' : value === sides ? 'extraordinario' : 'ordinario', at: '' })

describe('judge', () => {
  it('reacción superior = exitosa', () => expect(judge(r(5), r(12)).verdict).toBe('reaccionExitosa'))
  it('reacción inferior = fallida', () => expect(judge(r(12), r(5)).verdict).toBe('reaccionFallida'))
  it('empate = manual', () => {
    const j = judge(r(8), r(8))
    expect(j.verdict).toBe('manual')
    expect(j.manualReason).toMatch(/Empate/)
  })
  it('críticos simultáneos = manual', () => {
    expect(judge(r(1), r(20)).verdict).toBe('manual')
    expect(judge(r(20), r(20)).verdict).toBe('manual')
    expect(judge(r(1), r(1)).verdict).toBe('manual')
  })
  it('crítico único no es manual', () => {
    expect(judge(r(20), r(10)).verdict).toBe('reaccionFallida')
    expect(judge(r(10), r(1)).verdict).toBe('reaccionFallida')
    expect(judge(r(1), r(10)).verdict).toBe('reaccionExitosa')
  })
  it('funciona con roll() real', () => expect(['reaccionExitosa', 'reaccionFallida', 'manual']).toContain(judge(roll(20), roll(20)).verdict))
})

describe('defenseUsesLeft', () => {
  const ex = (o: Partial<Exchange>): Exchange => ({
    id: 'x', round: 1, attackerId: 'a', targetId: 't', action: '', reaction: 'defenderse',
    attackRoll: r(3), reactionRoll: r(9), verdict: 'reaccionExitosa', summary: '', confirmed: true, ...o,
  })
  it('3 al inicio', () => expect(defenseUsesLeft([], 't')).toBe(3))
  it('solo cuentan defensas exitosas, confirmadas, del objetivo', () => {
    const log = [ex({}), ex({ confirmed: false }), ex({ verdict: 'reaccionFallida' }), ex({ reaction: 'esquivar' }), ex({ targetId: 'z' })]
    expect(defenseUsesLeft(log, 't')).toBe(2)
  })
  it('se agota en 0', () => expect(defenseUsesLeft([ex({}), ex({}), ex({})], 't')).toBe(0))
})

import { attackIssue, attackOptions } from './combat'
import { newCharacter } from './character'

describe('ataques', () => {
  const c = newCharacter()
  c.gift.techniques = [
    { id: 't1', name: 'Lanza de hielo', description: '', cost: 30, unlocked: true },
    { id: 't2', name: 'Prisión glacial', description: '', cost: 10, unlocked: false },
  ]
  c.items = [{ id: 'w', section: 'armas', name: 'Daga', description: '', quantity: 1, price: 0, rarity: 'comun', durability: '', effects: '', requirements: '', gmNotes: '', equipped: true }]
  c.current.resistencia = 20
  const opts = attackOptions(c)
  it('lista técnicas y armas equipadas', () => expect(opts.map((o) => o.name)).toEqual(['Lanza de hielo', 'Prisión glacial', 'Daga']))
  it('resistencia insuficiente avisa', () => expect(attackIssue(c, opts[0])).toMatch(/insuficiente/))
  it('técnica bloqueada avisa', () => expect(attackIssue(c, opts[1])).toMatch(/bloqueada/))
  it('arma no tiene requisitos', () => expect(attackIssue(c, opts[2])).toBeNull())
})
