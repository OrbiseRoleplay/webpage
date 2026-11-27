import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { getDie, landingQuaternion, type DieSides } from './geometry'

describe.each([6, 20, 60] as DieSides[])('d%i', (n) => {
  const die = getDie(n)
  it('tiene n caras y un triángulo/quad por cara', () => {
    expect(die.faces).toHaveLength(n)
    expect(die.positions.length).toBe(n === 6 ? 6 * 2 * 9 : n * 9)
  })
  it('cada valor 1..n tiene exactamente una cara', () => {
    expect(die.faces.map((f) => f.value).sort((a, b) => a - b)).toEqual(Array.from({ length: n }, (_, i) => i + 1))
  })
  it('las normales apuntan hacia fuera y están normalizadas', () => {
    for (const f of die.faces) { expect(f.normal.length()).toBeCloseTo(1); expect(f.normal.dot(f.center)).toBeGreaterThan(0) }
  })
  it('el aterrizaje lleva la normal de cada cara a +Z y su arriba a +Y', () => {
    for (const f of die.faces) {
      const q = landingQuaternion(f)
      expect(f.normal.clone().applyQuaternion(q).dot(new THREE.Vector3(0, 0, 1))).toBeGreaterThan(0.999)
      expect(f.up.clone().applyQuaternion(q).dot(new THREE.Vector3(0, 1, 0))).toBeGreaterThan(0.999)
    }
  })
})
