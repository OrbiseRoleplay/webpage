// Geometría pura de los dados (sin DOM): caras, normales y rotación de aterrizaje.
import * as THREE from 'three'

export type DieSides = 6 | 20 | 60
export interface Face { value: number; normal: THREE.Vector3; center: THREE.Vector3; up: THREE.Vector3; radius: number; verts: THREE.Vector3[] }
export interface DieGeometry { faces: Face[]; positions: Float32Array }

const Z = new THREE.Vector3(0, 0, 1)
const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)

function triangles(g: THREE.BufferGeometry): THREE.Vector3[][] {
  const p = g.getAttribute('position')
  const out: THREE.Vector3[][] = []
  for (let i = 0; i < p.count; i += 3) out.push([0, 1, 2].map((k) => new THREE.Vector3().fromBufferAttribute(p, i + k)))
  return out
}

function cube(): THREE.Vector3[][] {
  const polys: THREE.Vector3[][] = []
  for (let a = 0; a < 3; a++) for (const s of [-1, 1]) {
    const u = (a + 1) % 3, w = (a + 2) % 3
    polys.push([[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, y]) => {
      const q = [0, 0, 0]; q[a] = s; q[u] = x; q[w] = y
      return v(q[0], q[1], q[2])
    }))
  }
  return polys
}

/** Pentakis dodecaedro: cada pentágono del dodecaedro + vértice ápice + 5 triángulos = 60 caras. */
function pentakis(): THREE.Vector3[][] {
  const groups: { n: THREE.Vector3; pts: THREE.Vector3[] }[] = []
  for (const t of triangles(new THREE.DodecahedronGeometry(1, 0))) {
    const n = new THREE.Vector3().crossVectors(t[1].clone().sub(t[0]), t[2].clone().sub(t[0])).normalize()
    let e = groups.find((g) => g.n.dot(n) > 0.999)
    if (!e) groups.push((e = { n, pts: [] }))
    for (const p of t) if (!e.pts.some((q) => q.distanceTo(p) < 1e-4)) e.pts.push(p)
  }
  const polys: THREE.Vector3[][] = []
  for (const { pts } of groups) {
    const c = pts.reduce((s, p) => s.add(p), v(0, 0, 0)).divideScalar(pts.length)
    const n = c.clone().normalize()
    const ref = pts[0].clone().sub(c).normalize()
    const ang = (p: THREE.Vector3) => { const d = p.clone().sub(c); return Math.atan2(n.dot(new THREE.Vector3().crossVectors(ref, d)), ref.dot(d)) }
    pts.sort((a, b) => ang(a) - ang(b))
    const apex = n.multiplyScalar(c.length() * 1.28)
    for (let i = 0; i < pts.length; i++) polys.push([apex, pts[i], pts[(i + 1) % pts.length]])
  }
  return polys
}

function build(polys: THREE.Vector3[][]): DieGeometry {
  const pos: number[] = []
  const faces = polys.map((verts, i): Face => {
    const center = verts.reduce((s, p) => s.add(p), v(0, 0, 0)).divideScalar(verts.length)
    let normal = new THREE.Vector3().crossVectors(verts[1].clone().sub(verts[0]), verts[2].clone().sub(verts[0])).normalize()
    const vs = normal.dot(center) < 0 ? [...verts].reverse() : verts
    if (vs !== verts) normal = normal.negate()
    for (let k = 1; k < vs.length - 1; k++) for (const p of [vs[0], vs[k], vs[k + 1]]) pos.push(p.x, p.y, p.z)
    // "arriba" del número: hacia el vértice 0 (triángulo) o punto medio de una arista (cuadrado)
    const ref = vs.length === 4 ? vs[0].clone().add(vs[1]).multiplyScalar(0.5) : vs[0]
    const up = ref.clone().sub(center)
    up.addScaledVector(normal, -up.dot(normal)).normalize()
    return { value: i + 1, normal, center, up, radius: vs.reduce((s, p) => s + p.distanceTo(center), 0) / vs.length, verts: vs }
  })
  const max = Math.max(...faces.flatMap((f) => f.verts.map((p) => p.length())))
  const k = 1 / max
  faces.forEach((f) => { f.center.multiplyScalar(k); f.radius *= k; f.verts.forEach((p) => p.multiplyScalar(k)) })
  return { faces, positions: new Float32Array(pos.map((x) => x * k)) }
}

const cache = new Map<DieSides, DieGeometry>()
export function getDie(sides: DieSides): DieGeometry {
  let d = cache.get(sides)
  if (!d) {
    d = build(sides === 6 ? cube() : sides === 20 ? triangles(new THREE.IcosahedronGeometry(1, 0)) : pentakis())
    cache.set(sides, d)
  }
  return d
}

/** Quaternion que lleva la normal de la cara a +Z (cámara) y su "arriba" a +Y. La animación NUNCA elige cara: recibe el valor. */
export function landingQuaternion(f: Face): THREE.Quaternion {
  const q1 = new THREE.Quaternion().setFromUnitVectors(f.normal, Z)
  const u = f.up.clone().applyQuaternion(q1)
  const q2 = new THREE.Quaternion().setFromAxisAngle(Z, Math.PI / 2 - Math.atan2(u.y, u.x))
  return q2.multiply(q1)
}

/** Orientación del plano del número en el espacio del dado (x=derecha, y=arriba, z=normal). */
export function planeQuaternion(f: Face): THREE.Quaternion {
  const right = new THREE.Vector3().crossVectors(f.up, f.normal)
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(right, f.up, f.normal))
}
