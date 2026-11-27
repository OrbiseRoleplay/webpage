// El orbe de ORBISE: cristal facetado iridiscente atravesado por la lluvia verde que despertó los Dones.
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'

/** Entorno procedural para que el cristal tenga reflejos reales (sin texturas externas). */
function Env() {
  const { gl, scene } = useThree()
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl)
    const tex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    scene.environment = tex
    return () => { tex.dispose(); pmrem.dispose(); scene.environment = null }
  }, [gl, scene])
  return null
}
import { useStore } from '../store/useStore'

const RAIN = 260

function Scene({ still, intensity }: { still: boolean; intensity: number }) {
  const crystal = useRef<THREE.Group>(null)
  const core = useRef<THREE.Mesh>(null)
  const ring = useRef<THREE.Mesh>(null)
  const rain = useRef<THREE.LineSegments>(null)
  const t0 = useRef<number | null>(null)

  // Cada cara con su tono (azul, violeta, turquesa y algún destello oro): lectura de ópalo facetado
  const geo = useMemo(() => {
    const g = new THREE.IcosahedronGeometry(1.35, 1)
    const tones = ['#12507e', '#1b3f8f', '#3b2a8f', '#0f6f86', '#5a3fc0', '#1c86a8', '#8a6a2a'].map((h) => new THREE.Color(h))
    const n = g.attributes.position!.count
    const col = new Float32Array(n * 3)
    for (let f = 0; f < n / 3; f++) {
      const c = tones[Math.random() < 0.06 ? 6 : Math.floor(Math.random() * 6)]
      for (let v = 0; v < 3; v++) col.set([c.r, c.g, c.b], (f * 3 + v) * 3)
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3))
    return g
  }, [])
  const edges = useMemo(() => new THREE.EdgesGeometry(geo), [geo])
  const drops = useMemo(() => {
    const pos = new Float32Array(RAIN * 6)
    const speed = new Float32Array(RAIN)
    for (let i = 0; i < RAIN; i++) {
      const x = (Math.random() - 0.5) * 7, y = Math.random() * 8 - 4, z = (Math.random() - 0.5) * 3 - 0.5, len = 0.15 + Math.random() * 0.35
      pos.set([x, y, z, x, y - len, z], i * 6)
      speed[i] = 1.2 + Math.random() * 2.2
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    return { g, pos, speed }
  }, [])

  useFrame(({ clock, pointer }, dt) => {
    const t = clock.elapsedTime
    t0.current ??= t
    // Cristalización inicial: 0 → 1 en ~2 s (el único momento orquestado)
    const k = still ? 1 : Math.min(1, (t - t0.current) / 2)
    const grow = 1 - (1 - k) ** 3
    const c = crystal.current!
    c.scale.setScalar(0.25 + 0.75 * grow)
    if (!still) {
      c.rotation.y += dt * 0.12
      c.rotation.x = THREE.MathUtils.lerp(c.rotation.x, 0.25 - pointer.y * 0.25, 0.04)
      c.rotation.z = THREE.MathUtils.lerp(c.rotation.z, pointer.x * 0.15, 0.04)
      ring.current!.rotation.z += dt * 0.08
      ;(core.current!.material as THREE.MeshBasicMaterial).opacity = 0.55 + 0.25 * Math.sin(t * 1.6)
      // La lluvia cae rápido al principio y se calma cuando el orbe termina de formarse
      const fall = dt * (1 + 2.5 * (1 - grow))
      const { pos, speed } = drops
      for (let i = 0; i < RAIN; i++) {
        const d = speed[i] * fall
        pos[i * 6 + 1] -= d; pos[i * 6 + 4] -= d
        if (pos[i * 6 + 4] < -4) { const len = pos[i * 6 + 1] - pos[i * 6 + 4]; pos[i * 6 + 1] = 4; pos[i * 6 + 4] = 4 - len }
      }
      drops.g.attributes.position!.needsUpdate = true
    }
  })

  return (
    <>
      <Env />
      <ambientLight intensity={0.3} />
      <directionalLight position={[2, 3, 4]} intensity={1.6} color="#E8F7FF" />
      <pointLight position={[3, 2, 3]} intensity={60} color="#5DEEFF" />
      <pointLight position={[-3, -1, 2]} intensity={70} color="#A56BFF" />
      <pointLight position={[0.5, -3, 1.5]} intensity={35} color="#FFD66B" />
      <lineSegments ref={rain} geometry={drops.g}>
        <lineBasicMaterial color="#4EE8A0" transparent opacity={0.35 * intensity} blending={THREE.AdditiveBlending} depthWrite={false} />
      </lineSegments>
      <group ref={crystal}>
        <mesh geometry={geo}>
          <meshStandardMaterial vertexColors flatShading metalness={0.25} roughness={0.22} envMapIntensity={0.25}
            emissive="#081a33" emissiveIntensity={0.6} transparent opacity={0.95} />
        </mesh>
        <lineSegments geometry={edges}><lineBasicMaterial color="#c8fbff" transparent opacity={0.55} /></lineSegments>
        <mesh ref={core}><icosahedronGeometry args={[0.32, 0]} /><meshBasicMaterial color="#FFD66B" transparent opacity={0.7} blending={THREE.AdditiveBlending} /></mesh>
      </group>
      <mesh ref={ring} rotation={[1.2, 0.3, 0]}>
        <torusGeometry args={[2.05, 0.008, 6, 160]} />
        <meshBasicMaterial color="#A56BFF" transparent opacity={0.55} />
      </mesh>
    </>
  )
}

export function Orb({ className = '' }: { className?: string }) {
  const { reducedMotion, visualIntensity } = useStore((s) => s.settings)
  return (
    <div className={className} aria-hidden>
      <Canvas dpr={[1, 2]} frameloop={reducedMotion ? 'demand' : 'always'} gl={{ alpha: true, antialias: true }} camera={{ position: [0, 0, 5.2], fov: 42 }}>
        <Scene still={reducedMotion} intensity={visualIntensity} />
      </Canvas>
    </div>
  )
}
