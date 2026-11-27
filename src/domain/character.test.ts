import { expect, test } from 'vitest'
import { attrValue, newCharacter, pointsLeft, setPoints, viewFor } from './character'
import { outcomeOf, randomInt } from './dice'

test('ficha nueva: 25 puntos, bases oficiales, 150 COINS, 38 espacios', () => {
  const c = newCharacter()
  expect(pointsLeft(c)).toBe(25)
  expect(attrValue(c, 'vitRoja')).toBe(10)
  expect(attrValue(c, 'resistencia')).toBe(100)
  expect(c.coins).toBe(150)
  expect(Object.values(c.capacity).reduce((a, b) => a + b, 0)).toBe(38)
})

test('presupuesto: incrementos consumen puntos y no se puede exceder', () => {
  let c = newCharacter()
  c = setPoints(c, 'vitRoja', 2)
  expect(attrValue(c, 'vitRoja')).toBe(20)
  expect(c.current.vitRoja).toBe(20) // el actual sube con el máximo
  c = setPoints(c, 'fuerza', 23)
  expect(pointsLeft(c)).toBe(0)
  expect(setPoints(c, 'ingenio', 1)).toBe(c) // rechazado
  expect(setPoints({ ...c, unlimitedPoints: true }, 'ingenio', 1).points.ingenio).toBe(1)
})

test('viewFor publico elimina datos privados', () => {
  const c = newCharacter()
  c.gift.gmNotes = 'secreto'
  c.story = [{ id: 'a', section: 'Secretos', title: '', date: '', text: 'x', visibility: 'soloGM' }]
  const p = viewFor(c, 'publico')
  expect(p.gift.gmNotes).toBe('')
  expect(p.story).toHaveLength(0)
})

test('dados: rango correcto y críticos', () => {
  for (let i = 0; i < 2000; i++) { const v = randomInt(60); expect(v).toBeGreaterThanOrEqual(1); expect(v).toBeLessThanOrEqual(60) }
  expect(outcomeOf(20, 1)).toBe('catastrofico')
  expect(outcomeOf(20, 20)).toBe('extraordinario')
  expect(outcomeOf(60, 59)).toBe('ordinario')
})
