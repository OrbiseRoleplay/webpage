// Partículas ambientales en canvas 2D (barato, respeta intensidad y movimiento reducido).
import { useEffect, useRef } from 'react'
import { useStore } from '../store/useStore'

export function Ambient() {
  const ref = useRef<HTMLCanvasElement>(null)
  const { visualIntensity, reducedMotion } = useStore((s) => s.settings)
  useEffect(() => {
    const cv = ref.current!
    const g = cv.getContext('2d')!
    let raf = 0
    const resize = () => { cv.width = innerWidth; cv.height = innerHeight }
    resize()
    addEventListener('resize', resize)
    // La lluvia verde de ORBISE, muy tenue, de fondo en todas las pantallas
    const n = Math.round(60 * visualIntensity)
    const ps = Array.from({ length: n }, () => ({ x: Math.random() * cv.width, y: Math.random() * cv.height, len: 8 + Math.random() * 22, v: 1.2 + Math.random() * 2.4, a: 0.08 + Math.random() * 0.14 }))
    const draw = () => {
      g.clearRect(0, 0, cv.width, cv.height)
      g.lineWidth = 1
      for (const p of ps) {
        if (!reducedMotion) { p.y += p.v; if (p.y - p.len > cv.height) { p.y = -5; p.x = Math.random() * cv.width } }
        g.strokeStyle = `rgba(78,232,160,${p.a})`
        g.beginPath(); g.moveTo(p.x, p.y - p.len); g.lineTo(p.x, p.y); g.stroke()
      }
      if (!reducedMotion) raf = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(raf); removeEventListener('resize', resize) }
  }, [visualIntensity, reducedMotion])
  return <canvas ref={ref} aria-hidden className="pointer-events-none fixed inset-0 -z-0" />
}

/** Indicador de guardado automático. */
export function SaveIndicator() {
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const on = () => { const el = ref.current; if (!el) return; el.style.opacity = '1'; setTimeout(() => (el.style.opacity = '0'), 1200) }
    addEventListener('orbise:saved', on)
    return () => removeEventListener('orbise:saved', on)
  }, [])
  return <span ref={ref} className="text-[10px] tracking-widest text-good uppercase opacity-0 transition-opacity duration-500">◉ Guardado</span>
}
