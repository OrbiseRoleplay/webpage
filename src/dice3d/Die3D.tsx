import { Canvas, useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { motion } from 'motion/react'
import type { RollResult } from '../domain/dice'
import { useStore } from '../store/useStore'
import { sfx, vibrate } from '../sfx/audio'
import { getDie, landingQuaternion, planeQuaternion, type DieSides } from './geometry'
import { CRIT_COLOR, Overlay } from './Overlay'

export interface Die3DProps { sides: DieSides; result: RollResult | null; size?: number; onSettled?: (r: RollResult) => void }

function numberTexture(n: number) {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')!
  g.font = `700 ${n > 9 ? 64 : 84}px sans-serif`
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillStyle = '#fff'
  g.shadowColor = '#fff'
  g.shadowBlur = 8
  g.fillText(n === 6 || n === 9 ? `${n}.` : String(n), 64, 68) // el punto distingue 6/9
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

const MAXP = 160
interface Anim { t: number; dur: number; axis: THREE.Vector3; turns: number; q: THREE.Quaternion; landed: boolean; r: RollResult }

interface SceneProps { sides: DieSides; result: RollResult | null; tint: string; baseColor: string; quick: boolean; calm: boolean; intensity: number; onLand: (r: RollResult) => void }

function Scene({ sides, result, tint, baseColor, quick, calm, intensity, onLand }: SceneProps) {
  const die = useMemo(() => getDie(sides), [sides])
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(die.positions, 3))
    g.computeVertexNormals() // no indexada → caras planas
    return g
  }, [die])
  const edges = useMemo(() => new THREE.EdgesGeometry(geo, 1), [geo])
  const planes = useMemo(() => die.faces.map((f) => ({
    tex: numberTexture(f.value), pos: f.center.clone().addScaledVector(f.normal, 0.004), q: planeQuaternion(f), s: f.radius,
  })), [die])
  useEffect(() => () => { geo.dispose(); edges.dispose(); planes.forEach((p) => p.tex.dispose()) }, [geo, edges, planes])

  const group = useRef<THREE.Group>(null)
  const ring = useRef<THREE.Mesh>(null)
  const anim = useRef<Anim | null>(null)
  const live = useRef({ onLand, quick, calm, intensity, baseColor })
  live.current = { onLand, quick, calm, intensity, baseColor }
  const ringT = useRef(99)

  const P = useMemo(() => ({
    pos: new Float32Array(MAXP * 3), col: new Float32Array(MAXP * 3), vel: new Float32Array(MAXP * 3), life: new Float32Array(MAXP), base: new Float32Array(MAXP * 3), next: 0,
  }), [])
  const pGeo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(P.pos, 3))
    g.setAttribute('color', new THREE.BufferAttribute(P.col, 3))
    return g
  }, [P])
  const burst = (n: number, speed: number, color: string, o: THREE.Vector3) => {
    const c = new THREE.Color(color)
    for (let k = 0; k < n; k++) {
      const i = P.next++ % MAXP
      const d = new THREE.Vector3().randomDirection().multiplyScalar(speed * (0.4 + Math.random() * 0.6))
      P.pos.set([o.x, o.y, o.z], i * 3)
      P.vel.set([d.x, d.y, d.z], i * 3)
      P.base.set([c.r, c.g, c.b], i * 3)
      P.life[i] = 1
    }
  }

  useEffect(() => {
    if (!result || result.sides !== sides) return
    const f = die.faces[result.value - 1] // la cara sale del valor ya calculado por roll()
    const q = live.current.quick
    anim.current = {
      t: 0, dur: q ? 0.3 : 1.2, axis: new THREE.Vector3().randomDirection(), turns: q ? 0.75 : 2.25 + Math.random() * 1.5,
      q: landingQuaternion(f), landed: false, r: result,
    }
    sfx.diceSpin()
  }, [result?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05)
    const g = group.current
    const a = anim.current
    const L = live.current
    if (g) {
      if (!a) { g.rotation.x = 0.35; g.rotation.y += dt * 0.5 }
      else {
        a.t += raw // tiempo real: aterriza a su hora aunque haya pocos FPS (dt limitado solo para partículas)
        const p = Math.min(1, a.t / a.dur)
        const e = 1 - (1 - p) ** 3
        g.quaternion.setFromAxisAngle(a.axis, (1 - e) * a.turns * Math.PI * 2).multiply(a.q)
        g.position.y = L.calm ? 0 : Math.sin(p * Math.PI) * 0.25 * (1 - p)
        if (!L.calm && !a.landed && Math.random() < 0.9) burst(Math.ceil(L.intensity * 2), 0.5, L.baseColor, g.position)
        if (p >= 1) {
          if (!a.landed) {
            a.landed = true
            g.quaternion.copy(a.q)
            ringT.current = 0
            const o = a.r.outcome
            const n = o === 'extraordinario' ? 90 : o === 'catastrofico' ? 55 : 14
            burst(Math.round(n * L.intensity), o === 'ordinario' ? 1 : 2.4, o === 'ordinario' ? L.baseColor : CRIT_COLOR[o], g.position)
            L.onLand(a.r)
          }
          const tl = a.t - a.dur
          g.scale.setScalar(tl < 0.5 && !L.calm ? 1 + 0.1 * Math.exp(-tl * 9) * Math.cos(tl * 30) : 1)
        }
      }
    }
    const rg = ring.current
    if (rg) {
      ringT.current += dt
      const k = ringT.current / 0.5
      rg.visible = k < 1
      rg.scale.setScalar(1 + k * 1.4)
      ;(rg.material as THREE.MeshBasicMaterial).opacity = 0.8 * (1 - k) * L.intensity
    }
    for (let i = 0; i < MAXP; i++) {
      if (P.life[i] <= 0) { P.col.set([0, 0, 0], i * 3); continue }
      P.life[i] -= dt / 0.8
      for (let k = 0; k < 3; k++) { P.pos[i * 3 + k] += P.vel[i * 3 + k] * dt; P.vel[i * 3 + k] *= 0.96; P.col[i * 3 + k] = P.base[i * 3 + k] * Math.max(0, P.life[i]) }
    }
    pGeo.attributes.position!.needsUpdate = true
    pGeo.attributes.color!.needsUpdate = true
  })

  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight position={[2, 3, 4]} intensity={2.2} />
      <group ref={group}>
        <mesh geometry={geo}>
          <meshPhysicalMaterial color={tint} transparent opacity={0.55} roughness={0.15} metalness={0.1} clearcoat={1} emissive={tint} emissiveIntensity={0.25} />
        </mesh>
        <lineSegments geometry={edges}><lineBasicMaterial color={tint} toneMapped={false} /></lineSegments>
        {planes.map((p, i) => (
          <mesh key={i} position={p.pos} quaternion={p.q}>
            <planeGeometry args={[p.s, p.s]} />
            <meshBasicMaterial map={p.tex} transparent depthWrite={false} toneMapped={false} />
          </mesh>
        ))}
      </group>
      <mesh ref={ring} position={[0, 0, -0.4]} visible={false}>
        <ringGeometry args={[0.95, 1, 64]} />
        <meshBasicMaterial color={tint} transparent opacity={0} depthWrite={false} toneMapped={false} />
      </mesh>
      <points geometry={pGeo}>
        <pointsMaterial size={0.06} vertexColors transparent blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </points>
    </>
  )
}

export function Die3D({ sides, result, size = 220, onSettled }: Die3DProps) {
  const s = useStore((st) => st.settings)
  const [fx, setFx] = useState<RollResult | null>(null)
  const quick = s.quickRoll || s.reducedMotion
  useEffect(() => setFx(null), [result?.id])

  const land = (r: RollResult) => {
    setFx(r)
    sfx.diceLand()
    if (r.outcome === 'catastrofico') { sfx.catastrophe(); vibrate([60, 40, 120]) }
    else if (r.outcome === 'extraordinario') sfx.extraordinary()
    onSettled?.(r)
  }

  // el color crítico se aplica al aterrizar para no adelantar el resultado
  const tint = fx && fx.outcome !== 'ordinario' ? CRIT_COLOR[fx.outcome] : s.diceColor
  const glitch = fx?.outcome === 'catastrofico' && !s.noFlashes && !s.reducedMotion
  return (
    <div className="relative mx-auto" style={{ width: size, height: size, maxWidth: '100%' }}>
      <motion.div className="h-full w-full" animate={glitch ? { x: [0, -8, 6, -4, 3, 0], skewX: [0, 6, -5, 2, 0, 0] } : { x: 0, skewX: 0 }} transition={{ duration: 0.35 }}>
        <Canvas dpr={[1, 2]} gl={{ alpha: true, antialias: true }} camera={{ position: [0, 0, 3.4], fov: 40 }}>
          <Scene sides={sides} result={result} tint={tint} baseColor={s.diceColor} quick={quick} calm={quick}
            intensity={s.reducedMotion ? 0.3 : s.visualIntensity} onLand={land} />
        </Canvas>
      </motion.div>
      <Overlay r={fx} noFlashes={s.noFlashes} calm={quick} intensity={s.visualIntensity} />
    </div>
  )
}
