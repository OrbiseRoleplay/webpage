// Capas 2D de los críticos (texto, ondas, rayos, grietas) sobre el canvas.
import { motion } from 'motion/react'
import { OUTCOME_TEXT, type RollResult } from '../domain/dice'

export const CRIT_COLOR = { catastrofico: '#FF3C55', extraordinario: '#FFD66B' } as const

const CRACKS = ['M50 50 L38 36 L42 22 L30 8', 'M50 50 L66 40 L62 24 L74 10', 'M50 50 L72 58 L88 54', 'M50 50 L60 70 L56 90', 'M50 50 L40 66 L24 72 L14 88', 'M50 50 L28 52 L10 44']
const MASK = 'radial-gradient(circle, #000 15%, transparent 65%)'

export function Overlay({ r, noFlashes, calm, intensity }: { r: RollResult | null; noFlashes: boolean; calm: boolean; intensity: number }) {
  if (!r || r.outcome === 'ordinario') return null
  const bad = r.outcome === 'catastrofico'
  const c = CRIT_COLOR[r.outcome]
  const t = calm ? 0.25 : 1
  return (
    <div key={r.id} className="pointer-events-none absolute inset-0" style={{ opacity: 0.4 + 0.6 * intensity }}>
      {!noFlashes && !calm && (
        <motion.div className="fixed inset-0 z-40" style={{ background: c }} initial={{ opacity: 0 }} animate={{ opacity: [0, 0.16, 0] }} transition={{ duration: 0.3 }} />
      )}
      <motion.div className="absolute rounded-full border-2" style={{ left: '20%', top: '20%', width: '60%', height: '60%', borderColor: c, boxShadow: `0 0 24px ${c}` }}
        initial={{ scale: 0.3, opacity: 0.9 }} animate={{ scale: 3, opacity: 0 }} transition={{ duration: 0.9 * t, ease: 'easeOut' }} />
      {bad ? (
        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" style={{ filter: `drop-shadow(0 0 4px ${c})` }}>
          {CRACKS.map((d, i) => (
            <motion.path key={i} d={d} fill="none" stroke={c} strokeWidth={1.2} strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 1 }} animate={{ pathLength: 1, opacity: [1, 1, 0] }} transition={{ duration: 1.3 * t, delay: i * 0.03 * t }} />
          ))}
        </svg>
      ) : (
        <>
          <motion.div className="absolute rounded-full" style={{ inset: '-20%', background: `radial-gradient(circle, ${c}88, transparent 65%)` }}
            initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: [0, 1, 0.55], scale: [0.6, 1.2, 1] }} transition={{ duration: 1.2 * t }} />
          {!calm && (
            <motion.div className="absolute" style={{ inset: '-60%', background: `repeating-conic-gradient(${c} 0 5deg, transparent 5deg 20deg)`, maskImage: MASK, WebkitMaskImage: MASK }}
              initial={{ opacity: 0, rotate: 0, scale: 0.4 }} animate={{ opacity: [0, 0.8, 0], rotate: 35, scale: 1 }} transition={{ duration: 1.4 }} />
          )}
        </>
      )}
      <div className="absolute inset-x-0 -bottom-10 flex justify-center">
        <motion.p role="status" className="font-display text-sm tracking-[0.18em] whitespace-nowrap sm:text-base" style={{ color: c, textShadow: `0 0 14px ${c}` }}
          initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.25 * t }}>
          {OUTCOME_TEXT[r.outcome]}
        </motion.p>
      </div>
    </div>
  )
}
