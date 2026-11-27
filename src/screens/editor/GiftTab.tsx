import { motion } from 'motion/react'
import { RULES, type GiftClass } from '../../rules/config'
import type { Gift, Technique } from '../../domain/schema'
import { Gallery } from '../../ui/Gallery'
import { Btn, Empty, Field, Num, Panel, Text, confirmAction } from '../../ui/kit'
import type { TabProps } from './CharacterEditor'

const CLASS_STYLE: Record<GiftClass, { color: string; aura: string; label: string }> = {
  OMEGA: { color: '#FFD66B', aura: '0 0 40px #FFD66B, 0 0 90px #A56BFF', label: 'Don de poder excepcional' },
  A: { color: '#A56BFF', aura: '0 0 28px #A56BFF', label: 'Clase A' },
  B: { color: '#4285FF', aura: '0 0 22px #4285FF', label: 'Clase B' },
  C: { color: '#5DEEFF', aura: '0 0 18px #5DEEFF', label: 'Clase C' },
  D: { color: '#4EE8A0', aura: '0 0 14px #4EE8A0', label: 'Clase D' },
  F: { color: '#9fb3c8', aura: '0 0 10px #9fb3c8', label: 'Clase F' },
}

/** Emblema holográfico de clasificación. OMEGA tiene anillos orbitales animados. */
export function ClassBadge({ giftClass }: { giftClass: GiftClass | null }) {
  if (!giftClass) return <div className="grid h-28 w-28 place-items-center rounded-full border border-dashed border-ink/30 text-center text-[10px] tracking-widest text-ink/50 uppercase">Clase<br />pendiente<br />del GM</div>
  const s = CLASS_STYLE[giftClass]
  return (
    <div className="relative grid h-28 w-28 place-items-center">
      {giftClass === 'OMEGA' && [0, 1].map((k) => (
        <motion.span key={k} className="absolute inset-0 rounded-full border" style={{ borderColor: k ? '#A56BFF' : '#FFD66B' }}
          animate={{ rotate: k ? -360 : 360, scale: [1, 1.08, 1] }} transition={{ duration: 6 + k * 2, repeat: Infinity, ease: 'linear' }} />
      ))}
      <motion.div initial={{ scale: 0, rotate: -45 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring' }}
        className="grid h-20 w-20 place-items-center rounded-full border-2 font-display text-2xl font-bold"
        style={{ borderColor: s.color, color: s.color, boxShadow: s.aura, background: `radial-gradient(circle, ${s.color}22, transparent 70%)` }}>
        {giftClass === 'OMEGA' ? 'Ω' : giftClass}
      </motion.div>
    </div>
  )
}

export function GiftTab({ c, set, gm }: TabProps) {
  const g = c.gift
  const up = (p: Partial<Gift>, change?: string) => set({ ...c, gift: { ...g, ...p } }, change)
  const upTech = (t: Technique) => up({ techniques: g.techniques.map((x) => (x.id === t.id ? t : x)) })
  const txt = (k: 'name' | 'description' | 'strength' | 'weakness' | 'limitations' | 'manifestation', label: string, area = true) => (
    <Field label={label}><Text area={area} value={g[k]} onChange={(v) => up({ [k]: v })} /></Field>
  )

  return (
    <div className="space-y-3">
      <Panel title="Don (único por personaje FAERIT)">
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="flex flex-col items-center gap-2">
            <ClassBadge giftClass={g.giftClass} />
            {g.giftClass && <span className="text-[10px] tracking-widest uppercase" style={{ color: CLASS_STYLE[g.giftClass].color }}>{CLASS_STYLE[g.giftClass].label}</span>}
            {gm ? (
              <select className="holo-input" aria-label="Clase del don (GM)" value={g.giftClass ?? ''}
                onChange={(e) => up({ giftClass: (e.target.value || null) as GiftClass | null }, `Clase de don → ${e.target.value || 'sin asignar'}`)}>
                <option value="">Sin asignar</option>
                {RULES.giftClasses.map((k) => <option key={k}>{k}</option>)}
              </select>
            ) : <p className="max-w-32 text-center text-[10px] text-ink/50">La clase la asigna exclusivamente el Game Master.</p>}
          </div>
          <div className="grid flex-1 gap-3 sm:grid-cols-2">
            {txt('name', 'Nombre del don', false)}
            {txt('manifestation', 'Manifestación visual', false)}
            {txt('description', 'Descripción')}
            {txt('limitations', 'Limitaciones')}
            {txt('strength', 'Punto fuerte')}
            {txt('weakness', 'Punto débil')}
          </div>
        </div>
      </Panel>

      <Panel title={`Técnicas y habilidades (${g.techniques.length})`} actions={
        <Btn tone="energy" onClick={() => up({ techniques: [...g.techniques, { id: crypto.randomUUID(), name: 'Nueva técnica', description: '', cost: 0, unlocked: true }] })}>+ Técnica</Btn>}>
        {!g.techniques.length && <Empty>Las técnicas forman parte del mismo don, no son dones adicionales.</Empty>}
        <div className="space-y-2">
          {g.techniques.map((t) => (
            <div key={t.id} className={`grid gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_2fr_8rem_auto] ${t.unlocked ? 'border-energy/30' : 'border-white/10 opacity-60'}`}>
              <Text value={t.name} onChange={(v) => upTech({ ...t, name: v })} placeholder="Nombre" />
              <Text value={t.description} onChange={(v) => upTech({ ...t, description: v })} placeholder="Descripción" />
              <Field label="Coste resistencia"><Num value={t.cost} min={0} disabled={!gm && c.approved} onChange={(v) => upTech({ ...t, cost: Math.max(0, v) })} /></Field>
              <div className="flex items-end gap-1">
                {gm && <Btn tone={t.unlocked ? 'ghost' : 'gold'} onClick={() => upTech({ ...t, unlocked: !t.unlocked })}>{t.unlocked ? 'Bloquear' : 'Desbloquear'}</Btn>}
                <Btn tone="doom" onClick={() => confirmAction('¿Eliminar técnica?') && up({ techniques: g.techniques.filter((x) => x.id !== t.id) })}>✕</Btn>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Imágenes del don"><Gallery images={g.images} onChange={(images) => up({ images })} /></Panel>

      {gm && <Panel title="Anotaciones privadas del GM" className="!border-energy/40">
        <Text area value={g.gmNotes} onChange={(v) => up({ gmNotes: v })} placeholder="Solo visibles para el Game Master. Se eliminan en exportaciones de jugador y públicas." />
      </Panel>}
    </div>
  )
}
