import { describe, expect, it } from 'vitest'
import { newCharacter } from '../domain/character'
import type { Character } from '../domain/schema'
import { parseOrbise, toOrbise } from './orbise'

const IMG = 'data:image/png;base64,iVBORw0KGgo='

function sample(): Character {
  const c = newCharacter()
  c.identity.firstName = 'Ayla'
  c.gift.name = 'Brasa'
  c.gift.gmNotes = 'secreto del GM'
  c.points.fuerza = 4
  c.gallery = [
    { id: 'a', dataUrl: IMG, title: 'visible', description: '', visible: true },
    { id: 'b', dataUrl: IMG, title: 'oculta', description: '', visible: false },
  ]
  c.mainImageId = 'a'
  c.story = [
    { id: 's1', section: 'x', title: 'pub', date: '', text: 'p', visibility: 'publico' },
    { id: 's2', section: 'x', title: 'jug', date: '', text: 'j', visibility: 'jugadorGM' },
    { id: 's3', section: 'x', title: 'gm', date: '', text: 'g', visibility: 'soloGM' },
  ]
  return c
}
const trip = (c: Character, a: 'publico' | 'jugador' | 'gm') => parseOrbise(JSON.stringify(toOrbise(c, a)))

describe('orbise', () => {
  it('ida y vuelta conserva datos e imágenes', () => {
    const c = sample()
    const r = trip(c, 'gm')
    expect(r.identity.firstName).toBe('Ayla')
    expect(r.points.fuerza).toBe(4)
    expect(r.gallery.map((g) => g.dataUrl)).toEqual([IMG, IMG])
    expect(r.story).toHaveLength(3)
  })

  it('audiencia publico elimina lo privado', () => {
    const r = trip(sample(), 'publico')
    expect(r.story.map((s) => s.id)).toEqual(['s1'])
    expect(r.gallery.map((g) => g.id)).toEqual(['a'])
    expect(r.gift.gmNotes).toBe('')
  })

  it('audiencia jugador elimina soloGM', () => {
    const r = trip(sample(), 'jugador')
    expect(r.story.map((s) => s.id)).toEqual(['s1', 's2'])
    expect(r.gift.gmNotes).toBe('')
  })

  it('rechaza versión futura con mensaje', () => {
    const f = toOrbise(sample())
    f.character.formatVersion = 99 as never
    expect(() => parseOrbise(JSON.stringify(f))).toThrow(/más reciente/)
  })

  it('JSON inválido da error legible', () => {
    expect(() => parseOrbise('{no json')).toThrow('El archivo no es JSON válido.')
    expect(() => parseOrbise('{"foo":1}')).toThrow(/ficha ORBISE válida/)
  })
})
