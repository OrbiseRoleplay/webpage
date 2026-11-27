import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ATTRIBUTES, RULES, type GiftClass } from '../../rules/config'
import { attrValue, displayName, perPoint, pointsLeft, now, syncVitals, uid } from '../../domain/character'
import type { Character, Condition, Reward } from '../../domain/schema'
import { sfx } from '../../sfx/audio'
import { useStore } from '../../store/useStore'
import { Btn, Empty, Field, Num, Panel, Text } from '../../ui/kit'

const KINDS: Condition['kind'][] = ['herida', 'positivo', 'negativo', 'estado', 'agotamiento', 'defensa']
const REWARDS: Reward['kind'][] = ['experiencia', 'nivel', 'puntos', 'coins', 'habilidad', 'tecnica', 'objeto', 'propiedad', 'titulo', 'reputacion', 'desbloqueo']

/** Número que solo guarda al salir del campo (evita una entrada de historial por tecla). */
function NumC({ value, onCommit }: { value: number; onCommit: (v: number) => void }) {
  return <input key={value} type="number" className="holo-input" defaultValue={value}
    onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
    onBlur={(e) => { const v = Number(e.target.value); if (e.target.value !== '' && v !== value) onCommit(v) }} />
}

export function CharacterGM({ c }: { c: Character }) {
  const saveCharacter = useStore((s) => s.saveCharacter)
  const save = (next: Character, msg: string) => saveCharacter(next, `GM: ${msg}`, 'GM')
  const [cond, setCond] = useState({ kind: 'estado' as Condition['kind'], name: '' })
  const [coin, setCoin] = useState({ amount: 0, reason: '' })
  const [rw, setRw] = useState({ kind: 'experiencia' as Reward['kind'], amount: 0, description: '', source: 'Game Master' })
  const [flash, setFlash] = useState<Reward | null>(null)

  const giveReward = () => {
    const r: Reward = { id: uid(), date: now(), ...rw }
    let n: Character = { ...c, rewards: [...c.rewards, r] }
    if (r.kind === 'nivel') n = { ...n, identity: { ...n.identity, level: Math.max(0, n.identity.level + r.amount) } }
    if (r.kind === 'experiencia') n = { ...n, identity: { ...n.identity, experience: Math.max(0, n.identity.experience + r.amount) } }
    if (r.kind === 'puntos') n = { ...n, pointBudget: Math.max(0, n.pointBudget + r.amount) }
    if (r.kind === 'coins') n = { ...n, coins: n.coins + r.amount, transactions: [...n.transactions, { id: uid(), date: r.date, amount: r.amount, reason: `Recompensa: ${r.description || 'coins'}`, by: 'GM' }] }
    if (r.kind === 'titulo' && r.description) n = { ...n, identity: { ...n.identity, titles: [...n.identity.titles, r.description] } }
    save(n, `recompensa ${r.kind} ${r.amount}`)
    sfx.reward(); setFlash(r); setTimeout(() => setFlash(null), 2600)
    setRw({ ...rw, amount: 0, description: '' })
  }

  const setAttr = (key: (typeof ATTRIBUTES)[number]['key'], v: number) =>
    save(syncVitals(c, { ...c, bonus: { ...c.bonus, [key]: Math.max(0, Math.floor(v)) } }), `bono ${key} = ${v}`)
  const setPer = (key: (typeof ATTRIBUTES)[number]['key'], v: number) => {
    const o = { ...c.perPointOverride }
    const def = ATTRIBUTES.find((a) => a.key === key)!.perPoint
    if (v === def) delete o[key]; else o[key] = v
    save(syncVitals(c, { ...c, perPointOverride: o }), `incremento por punto ${key} = ${v}`)
  }

  return (
    <div className="space-y-4">
      <AnimatePresence>
        {flash && (
          <motion.div className="pointer-events-none fixed inset-0 z-[65] flex items-center justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div initial={{ scale: 0.6, rotateX: 60 }} animate={{ scale: 1, rotateX: 0 }}
              className="holo-panel px-10 py-8 text-center shadow-[0_0_80px_rgb(255_214_107/0.6)]">
              <div className="font-display text-xs tracking-[0.4em] text-gold">RECOMPENSA</div>
              <div className="font-display text-3xl text-holo uppercase">{flash.kind} {flash.amount ? `+${flash.amount}` : ''}</div>
              <div className="text-sm">{flash.description}</div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Panel title={`Ficha · ${displayName(c)}`}>
        <div className="flex flex-wrap items-end gap-4">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={c.approved} onChange={(e) => save({ ...c, approved: e.target.checked }, e.target.checked ? 'ficha aprobada' : 'aprobación retirada')} /> Ficha aprobada</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={c.isTemplate} onChange={(e) => save({ ...c, isTemplate: e.target.checked }, e.target.checked ? 'marcada como plantilla' : 'ya no es plantilla')} /> Plantilla reutilizable</label>
          <Field label="Clase de don (solo el GM)">
            <select className="holo-input" value={c.gift.giftClass ?? ''} onChange={(e) => save({ ...c, gift: { ...c.gift, giftClass: (e.target.value || null) as GiftClass | null } }, `clase de don ${e.target.value || 'pendiente'}`)}>
              <option value="">Pendiente</option>
              {RULES.giftClasses.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Notas privadas del GM sobre el don" className="mt-3">
          <Text area value={c.gift.gmNotes} onChange={(v) => saveCharacter({ ...c, gift: { ...c.gift, gmNotes: v } })} />
        </Field>
      </Panel>

      <Panel title="Puntos y atributos">
        <div className="mb-3 flex flex-wrap items-end gap-4">
          <Field label="Presupuesto de puntos"><NumC value={c.pointBudget} onCommit={(v) => save({ ...c, pointBudget: Math.max(0, Math.floor(v)) }, `presupuesto ${v}`)} /></Field>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={c.unlimitedPoints} onChange={(e) => save({ ...c, unlimitedPoints: e.target.checked }, `reparto ilimitado ${e.target.checked}`)} /> Reparto ilimitado</label>
          <Btn tone="doom" onClick={() => save(syncVitals(c, { ...c, points: Object.fromEntries(ATTRIBUTES.map((a) => [a.key, 0])) as Character['points'] }), 'puntos restablecidos')}>Restablecer puntos</Btn>
          <span className="text-xs text-ink/60">Disponibles: {pointsLeft(c) === Infinity ? '∞' : pointsLeft(c)}</span>
        </div>
        <table className="w-full text-xs">
          <thead><tr className="text-left text-holo/70"><th>Atributo</th><th>Puntos</th><th>Bono directo</th><th>Incr./punto</th><th>Valor</th></tr></thead>
          <tbody>
            {ATTRIBUTES.map((a) => (
              <tr key={a.key}>
                <td className="py-1">{a.icon} {a.label}</td><td>{c.points[a.key]}</td>
                <td><NumC value={c.bonus[a.key]} onCommit={(v) => setAttr(a.key, v)} /></td>
                <td><NumC value={perPoint(c, a.key)} onCommit={(v) => setPer(a.key, v)} /></td>
                <td>{attrValue(c, a.key)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <Panel title="Vitalidad, resistencia y estados">
        <div className="grid gap-2 sm:grid-cols-3">
          {(['vitAmarilla', 'vitRoja', 'resistencia'] as const).map((k) => (
            <Field key={k} label={`${ATTRIBUTES.find((a) => a.key === k)!.label} (máx. ${attrValue(c, k)})`}>
              <NumC value={c.current[k]} onCommit={(v) => save({ ...c, current: { ...c.current, [k]: Math.max(0, Math.min(attrValue(c, k), v)) } }, `${k} actual = ${v}`)} />
            </Field>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <Field label="Tipo de estado"><select className="holo-input" value={cond.kind} onChange={(e) => setCond({ ...cond, kind: e.target.value as Condition['kind'] })}>{KINDS.map((k) => <option key={k}>{k}</option>)}</select></Field>
          <Field label="Nombre"><Text value={cond.name} onChange={(v) => setCond({ ...cond, name: v })} /></Field>
          <Btn disabled={!cond.name.trim()} onClick={() => { save({ ...c, conditions: [...c.conditions, { id: uid(), kind: cond.kind, name: cond.name.trim(), notes: '' }] }, `estado ${cond.name}`); setCond({ ...cond, name: '' }) }}>Añadir</Btn>
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          {c.conditions.map((k) => <button key={k.id} title="Quitar" className="rounded border border-white/15 px-2 py-0.5 text-xs hover:border-doom" onClick={() => save({ ...c, conditions: c.conditions.filter((x) => x.id !== k.id) }, `estado quitado ${k.name}`)}>{k.kind}: {k.name} ✕</button>)}
        </div>
      </Panel>

      <Panel title="Inventario y COINS">
        <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(Object.keys(c.capacity) as (keyof Character['capacity'])[]).map((s) => (
            <Field key={s} label={`Capacidad ${s}`}><NumC value={c.capacity[s]} onCommit={(v) => save({ ...c, capacity: { ...c.capacity, [s]: Math.max(0, Math.floor(v)) } }, `capacidad ${s} = ${v}`)} /></Field>
          ))}
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <span className="font-display text-gold">{c.coins} COINS</span>
          <Field label="Cantidad (+/−)"><Num value={coin.amount} onChange={(v) => setCoin({ ...coin, amount: v || 0 })} /></Field>
          <Field label="Motivo"><Text value={coin.reason} onChange={(v) => setCoin({ ...coin, reason: v })} /></Field>
          <Btn tone="gold" disabled={!coin.amount || !coin.reason.trim()} onClick={() => {
            save({ ...c, coins: c.coins + coin.amount, transactions: [...c.transactions, { id: uid(), date: now(), amount: coin.amount, reason: coin.reason.trim(), by: 'GM' }] }, `COINS ${coin.amount > 0 ? '+' : ''}${coin.amount}: ${coin.reason}`)
            setCoin({ amount: 0, reason: '' })
          }}>Aplicar</Btn>
        </div>
      </Panel>

      <Panel title="Entregar recompensa">
        <div className="grid gap-2 sm:grid-cols-4">
          <Field label="Tipo"><select className="holo-input" value={rw.kind} onChange={(e) => setRw({ ...rw, kind: e.target.value as Reward['kind'] })}>{REWARDS.map((k) => <option key={k}>{k}</option>)}</select></Field>
          <Field label="Cantidad"><Num value={rw.amount} onChange={(v) => setRw({ ...rw, amount: v || 0 })} /></Field>
          <Field label="Descripción"><Text value={rw.description} onChange={(v) => setRw({ ...rw, description: v })} /></Field>
          <Field label="Origen"><Text value={rw.source} onChange={(v) => setRw({ ...rw, source: v })} /></Field>
        </div>
        <p className="mt-1 text-xs text-ink/50">Nivel, experiencia, puntos, coins y título se aplican a la ficha; el resto queda registrado.</p>
        <div className="mt-2"><Btn tone="gold" onClick={giveReward}>Entregar</Btn></div>
        <ul className="mt-2 space-y-0.5 text-xs text-ink/70">{[...c.rewards].reverse().slice(0, 8).map((r) => <li key={r.id}>{r.date.slice(0, 10)} · {r.kind} {r.amount || ''} — {r.description} ({r.source})</li>)}</ul>
      </Panel>

      <Panel title="Historial de cambios">
        {c.history.length === 0 ? <Empty>Sin cambios registrados.</Empty> : (
          <ul className="max-h-60 space-y-0.5 overflow-auto text-xs">{[...c.history].reverse().map((h, i) => <li key={i}><span className="text-holo/70">{h.date.slice(0, 16).replace('T', ' ')}</span> [{h.by}] {h.change}</li>)}</ul>
        )}
      </Panel>
    </div>
  )
}
