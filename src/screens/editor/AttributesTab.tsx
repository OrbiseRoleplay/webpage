import { motion } from 'motion/react'
import { ATTRIBUTES, RULES } from '../../rules/config'
import { attrValue, perPoint, pointsLeft, pointsSpent, setPoints } from '../../domain/character'
import { Counter, Panel } from '../../ui/kit'
import type { TabProps } from './CharacterEditor'

const GROUPS = [
  { id: 'vital', label: 'Vitalidad y resistencia' },
  { id: 'general', label: 'Atributos generales' },
  { id: 'resistDon', label: 'Resistencias a dones' },
] as const

export function AttributesTab({ c, set, locked }: TabProps) {
  const left = pointsLeft(c)
  const spent = pointsSpent(c)
  const budgetPct = c.unlimitedPoints ? 100 : Math.min(100, (spent / Math.max(1, c.pointBudget)) * 100)

  return (
    <div className="space-y-3">
      <Panel>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs tracking-widest text-holo/70 uppercase">Puntos restantes</p>
            <p className={`font-display text-4xl ${left === 0 ? 'text-good' : 'text-gold text-gold-glow'}`}>
              {c.unlimitedPoints ? '∞' : <Counter value={left} />}
              <span className="ml-2 text-base text-ink/50">/ {c.unlimitedPoints ? 'ilimitado' : c.pointBudget}</span>
            </p>
          </div>
          <p className="max-w-md text-xs text-ink/60">
            Presupuesto inicial: {RULES.initialPoints} puntos. Cada incremento consume 1 punto. Los valores base no cuentan como puntos invertidos.
            {locked && <span className="mt-1 block text-gold">Ficha aprobada: solo el GM puede modificar el reparto.</span>}
          </p>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/40">
          <motion.div className="h-full bg-gradient-to-r from-electric via-holo to-energy" animate={{ width: `${budgetPct}%` }} />
        </div>
      </Panel>

      {GROUPS.map((grp) => (
        <Panel key={grp.id} title={grp.label}>
          <div className="space-y-2">
            {ATTRIBUTES.filter((a) => a.group === grp.id).map((a) => {
              const val = attrValue(c, a.key)
              const pts = c.points[a.key]
              const pp = perPoint(c, a.key)
              const canUp = !locked && (c.unlimitedPoints || left > 0)
              const canDown = !locked && pts > 0
              const ref = grp.id === 'vital' ? Math.max(val, a.base + RULES.initialPoints * pp) : RULES.attributeVisualRef
              return (
                <div key={a.key} className="grid grid-cols-[1fr_auto] items-center gap-2 sm:grid-cols-[14rem_1fr_auto]">
                  <div className="text-sm">
                    <span className="mr-1">{a.icon}</span>{a.label}
                    {a.provisional && <span className="ml-1 rounded bg-gold/15 px-1 text-[9px] text-gold uppercase" title="Incremento provisional, pendiente de reglamento oficial">provisional</span>}
                    <span className="block text-[10px] text-ink/40">base {a.base} · +{pp}/punto · {pts} pt{c.bonus[a.key] ? ` · bono GM +${c.bonus[a.key]}` : ''}</span>
                  </div>
                  <div className="col-span-2 row-start-2 h-2 overflow-hidden rounded-full bg-black/40 sm:col-span-1 sm:row-start-auto" title={grp.id === 'general' ? `Referencia visual ${RULES.attributeVisualRef} (no es un límite)` : undefined}>
                    <motion.div className="h-full rounded-full bg-gradient-to-r from-electric to-holo" animate={{ width: `${Math.min(100, (val / Math.max(1, ref)) * 100)}%` }} />
                  </div>
                  <div className="flex items-center gap-2">
                    <button aria-label={`Quitar punto a ${a.label}`} disabled={!canDown} onClick={() => set(setPoints(c, a.key, pts - 1))}
                      className="h-8 w-8 rounded-md border border-holo/40 text-holo disabled:opacity-30">−</button>
                    <span className="w-12 text-center font-display text-lg"><Counter value={val} /></span>
                    <button aria-label={`Añadir punto a ${a.label}`} disabled={!canUp} onClick={() => set(setPoints(c, a.key, pts + 1))}
                      className="h-8 w-8 rounded-md border border-holo/40 text-holo disabled:opacity-30">+</button>
                  </div>
                </div>
              )
            })}
          </div>
        </Panel>
      ))}
    </div>
  )
}
