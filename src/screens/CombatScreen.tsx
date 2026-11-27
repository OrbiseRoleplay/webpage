import { useState } from 'react'
import { RULES, type DieSides, type ReactionKey } from '../rules/config'
import { displayName } from '../domain/character'
import { defenseUsesLeft, describe, judge, type Exchange } from '../domain/combat'
import { roll, type RollResult } from '../domain/dice'
import { sfx } from '../sfx/audio'
import { useStore } from '../store/useStore'
import { Btn, Empty, Field, Panel, Text, confirmAction } from '../ui/kit'
import { DieBox } from './combat/DuelDice'
import { Fighter } from './combat/Fighter'
import { Pending } from './combat/Pending'
import { Setup } from './combat/Setup'

export function CombatScreen() {
  const { combat, characters, setCombat, addRoll, toast } = useStore()
  const [sides, setSides] = useState<DieSides>(RULES.defaultDie)
  const [targetId, setTargetId] = useState('')
  const [action, setAction] = useState('')
  const [reaction, setReaction] = useState<ReactionKey>('defenderse')
  const [atkRoll, setAtkRoll] = useState<RollResult | null>(null)
  const [reaRoll, setReaRoll] = useState<RollResult | null>(null)

  if (!combat.active) return <Setup />

  const ids = combat.participantIds.filter((id) => characters.some((c) => c.id === id))
  const by = (id: string) => characters.find((c) => c.id === id)
  const attackerId = ids[combat.turnIndex % Math.max(1, ids.length)] ?? ''
  const attacker = by(attackerId)
  const target = by(targetId) && targetId !== attackerId ? by(targetId) : undefined
  const pending = combat.log.find((e) => !e.confirmed)
  const done = combat.log.filter((e) => e.confirmed)

  const doRoll = (label: string) => { const r = roll(sides, label); addRoll(r); sfx.diceLand(); if (r.outcome === 'catastrofico') sfx.catastrophe(); if (r.outcome === 'extraordinario') sfx.extraordinary(); return r }
  const nextTurn = () => {
    const n = combat.turnIndex + 1
    setCombat(n >= ids.length ? { turnIndex: 0, round: combat.round + 1 } : { turnIndex: n })
    setAtkRoll(null); setReaRoll(null)
  }
  const move = (i: number, d: number) => {
    const n = [...ids]; const j = i + d
    if (j < 0 || j >= n.length) return
    ;[n[i], n[j]] = [n[j], n[i]]
    setCombat({ participantIds: n })
  }
  const rollReaction = () => {
    if (!atkRoll || !target || !attacker) return
    const rr = doRoll(`Reacción: ${RULES.reactions[reaction].label}`)
    setReaRoll(rr)
    const j = judge(atkRoll, rr)
    const ex: Exchange = {
      id: crypto.randomUUID(), round: combat.round, attackerId, targetId: target.id, action, reaction,
      attackRoll: atkRoll, reactionRoll: rr, verdict: j.verdict, manualReason: j.manualReason,
      summary: describe(reaction, j.verdict, j.manualReason), confirmed: false,
    }
    setCombat({ log: [...combat.log, ex] })
    setAtkRoll(null); setReaRoll(null); setAction('')
  }
  const end = () => {
    if (!confirmAction('¿Terminar el combate? El historial se conserva hasta que inicies otro.')) return
    setCombat({ active: false }); toast('Combate terminado', 'info')
  }

  return (
    <div className="space-y-4">
      <Panel title={`Ronda ${combat.round} · Turno de ${attacker ? displayName(attacker) : '—'}`} actions={<>
        <Btn onClick={nextTurn} disabled={!!pending}>Siguiente turno</Btn>
        <Btn tone="doom" onClick={end}>Terminar combate</Btn>
      </>}>
        <ol className="flex flex-wrap gap-2 text-xs">
          {ids.map((id, i) => (
            <li key={id} className={`flex items-center gap-1 rounded border px-2 py-1 ${i === combat.turnIndex ? 'border-gold text-gold' : 'border-white/15'}`}>
              <button onClick={() => setCombat({ turnIndex: i })}>{i + 1}. {displayName(by(id)!)}</button>
              <button onClick={() => move(i, -1)} aria-label="Subir">▲</button><button onClick={() => move(i, 1)} aria-label="Bajar">▼</button>
            </li>
          ))}
        </ol>
      </Panel>

      <div className="grid gap-4 md:grid-cols-2">
        <Panel title="Atacante"><Fighter c={attacker} role="Atacante" defenses={defenseUsesLeft(combat.log, attackerId)} /></Panel>
        <Panel title="Objetivo">
          <Field label="Elegir objetivo" className="mb-2">
            <select className="holo-input" value={target?.id ?? ''} onChange={(e) => setTargetId(e.target.value)}>
              <option value="">— seleccionar —</option>
              {ids.filter((id) => id !== attackerId).map((id) => <option key={id} value={id}>{displayName(by(id)!)}</option>)}
            </select>
          </Field>
          <Fighter c={target} role="Objetivo" defenses={target ? defenseUsesLeft(combat.log, target.id) : 0} />
        </Panel>
      </div>

      {pending ? <Pending key={pending.id} ex={pending} /> : (
        <Panel title="Intercambio">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Acción declarada" className="sm:col-span-2"><Text value={action} onChange={setAction} placeholder="Ej.: golpe con la espada al flanco" /></Field>
            <Field label="Dado">
              <select className="holo-input" value={sides} onChange={(e) => setSides(Number(e.target.value) as DieSides)}>
                {RULES.dice.map((d) => <option key={d} value={d}>D{d}</option>)}
              </select>
            </Field>
            <Field label="Reacción del objetivo">
              <select className="holo-input" value={reaction} onChange={(e) => setReaction(e.target.value as ReactionKey)}>
                {(Object.keys(RULES.reactions) as ReactionKey[]).map((k) => <option key={k} value={k}>{RULES.reactions[k].label}</option>)}
              </select>
            </Field>
          </div>
          <div className="my-4 flex items-center justify-around">
            <DieBox title="Ataque" r={atkRoll} />
            <span className="font-display text-xl text-ink/40">VS</span>
            <DieBox title="Reacción" r={reaRoll} />
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <Btn disabled={!attacker || !target || !!atkRoll} onClick={() => setAtkRoll(doRoll('Ataque'))}>Tirar ataque</Btn>
            <Btn tone="energy" disabled={!atkRoll} onClick={rollReaction}>Tirar reacción</Btn>
            {atkRoll && <Btn tone="ghost" onClick={() => setAtkRoll(null)}>Repetir ataque</Btn>}
          </div>
          {!target && <p className="mt-2 text-center text-xs text-ink/50">Elige un objetivo para tirar.</p>}
        </Panel>
      )}

      <Panel title="Historial de intercambios">
        {done.length === 0 && <Empty>Aún no hay intercambios confirmados.</Empty>}
        <ul className="space-y-1 text-xs">
          {[...done].reverse().map((e) => (
            <li key={e.id} className="border-b border-white/5 pb-1">
              <span className="text-holo">R{e.round}</span> · {by(e.attackerId) ? displayName(by(e.attackerId)!) : '?'} {e.attackRoll.value} vs {e.reactionRoll.value} ({RULES.reactions[e.reaction].label}) — {e.summary}
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  )
}
