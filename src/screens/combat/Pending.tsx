import { useState } from 'react'
import { RULES } from '../../rules/config'
import { attrValue, displayName } from '../../domain/character'
import { defenseUsesLeft, describe, type Exchange, type Verdict } from '../../domain/combat'
import { sfx } from '../../sfx/audio'
import { useStore } from '../../store/useStore'
import { Btn, Field, Num, Panel } from '../../ui/kit'
import { DieBox } from './DuelDice'

const clamp = (v: number, max: number) => Math.max(0, Math.min(max, v))

/** Consecuencias pendientes: el GM introduce el daño a mano y confirma. Nada se calcula solo. */
export function Pending({ ex }: { ex: Exchange }) {
  const { characters, combat, setCombat, saveCharacter, toast } = useStore()
  const [f, setF] = useState({ y: 0, r: 0, s: 0, heal: 0, cost: 0 })
  const num = (k: keyof typeof f) => <Num value={f[k]} min={0} onChange={(v) => setF({ ...f, [k]: Math.max(0, v || 0) })} />
  const t = characters.find((c) => c.id === ex.targetId)
  const a = characters.find((c) => c.id === ex.attackerId)
  const setVerdict = (verdict: Verdict) =>
    setCombat({ log: combat.log.map((e) => e.id === ex.id ? { ...e, verdict, summary: describe(ex.reaction, verdict) } : e) })
  const discard = () => setCombat({ log: combat.log.filter((e) => e.id !== ex.id) })

  const defHeal = ex.reaction === 'defenderse' && ex.verdict === 'reaccionExitosa' && defenseUsesLeft(combat.log, ex.targetId) > 0
    ? RULES.reactions.defenderse.healOnSuccess : 0

  function confirm() {
    if (!t) return
    const heal = f.heal + defHeal
    const nt = { ...t, current: {
      vitAmarilla: clamp(t.current.vitAmarilla - f.y, attrValue(t, 'vitAmarilla')),
      vitRoja: clamp(t.current.vitRoja - f.r + heal, attrValue(t, 'vitRoja')),
      resistencia: clamp(t.current.resistencia - f.s, attrValue(t, 'resistencia')),
    } }
    const detail = `${displayName(a ?? t)} → ${displayName(t)}: ${ex.action || RULES.reactions[ex.reaction].label} (${f.y} amarilla, ${f.r} roja, ${f.s} resist., +${heal} curación)`
    saveCharacter(nt, `Combate: ${detail}`)
    if (a && f.cost > 0) saveCharacter({ ...a, current: { ...a.current, resistencia: clamp(a.current.resistencia - f.cost, attrValue(a, 'resistencia')) } }, `Combate: coste de resistencia ${f.cost}`)
    if (f.y + f.r + f.s > 0) { sfx.hit(); if (f.y > 0) setTimeout(sfx.shatter, 180) }
    if (heal > 0) setTimeout(sfx.heal, 300)
    setCombat({ log: combat.log.map((e) => e.id === ex.id ? { ...e, confirmed: true, summary: `${e.summary} — ${detail}` } : e) })
    toast('Consecuencias confirmadas', 'ok')
  }

  return (
    <Panel title="Consecuencias pendientes de confirmación">
      <div className="mb-3 flex justify-around"><DieBox title="Ataque" r={ex.attackRoll} /><DieBox title={RULES.reactions[ex.reaction].label} r={ex.reactionRoll} /></div>
      <p className="mb-3 text-center text-sm">{describe(ex.reaction, ex.verdict, ex.manualReason)}</p>
      {ex.verdict === 'manual' && (
        <div className="mb-3 flex justify-center gap-2">
          <Btn tone="good" onClick={() => setVerdict('reaccionExitosa')}>Reacción exitosa</Btn>
          <Btn tone="doom" onClick={() => setVerdict('reaccionFallida')}>Reacción fallida</Btn>
        </div>
      )}
      <p className="mb-2 text-xs text-ink/60">Introduce los valores manualmente (no hay fórmula de daño). Sugerencia: la vitalidad amarilla suele recibir el daño primero, pero no es regla.</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <Field label="Daño amarilla">{num('y')}</Field>
        <Field label="Daño roja">{num('r')}</Field>
        <Field label="Daño resistencia">{num('s')}</Field>
        <Field label="Curación (roja)">{num('heal')}</Field>
        <Field label="Coste resist. atacante">{num('cost')}</Field>
      </div>
      {defHeal > 0 && <p className="mt-2 text-xs text-good">Defensa sólida: al confirmar se curan {defHeal} de vitalidad roja (sin superar el máximo).</p>}
      <div className="mt-3 flex justify-end gap-2">
        <Btn tone="ghost" onClick={discard}>Descartar</Btn>
        <Btn tone="gold" disabled={ex.verdict === 'manual'} onClick={confirm}>Confirmar</Btn>
      </div>
    </Panel>
  )
}
