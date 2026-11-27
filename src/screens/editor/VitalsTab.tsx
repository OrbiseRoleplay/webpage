import { useState } from 'react'
import type { Condition } from '../../domain/schema'
import { attrValue } from '../../domain/character'
import { Bar, Btn, Empty, Field, Num, Panel, Text } from '../../ui/kit'
import { sfx } from '../../sfx/audio'
import type { TabProps } from './CharacterEditor'

const VITALS = [
  { key: 'vitAmarilla', label: 'Vitalidad amarilla', icon: '💛', color: '#FFD66B', hint: 'Protección del aura, similar a una armadura.' },
  { key: 'vitRoja', label: 'Vitalidad roja', icon: '❤️', color: '#FF3C55', hint: 'La vida real del personaje.' },
  { key: 'resistencia', label: 'Resistencia', icon: '💧', color: '#5DEEFF', hint: 'Esfuerzos físicos y uso de dones. El GM fija los costes.' },
] as const

const KINDS: { id: Condition['kind']; label: string; color: string }[] = [
  { id: 'herida', label: 'Herida', color: '#FF3C55' }, { id: 'positivo', label: 'Efecto positivo', color: '#4EE8A0' },
  { id: 'negativo', label: 'Efecto negativo', color: '#FF8A5D' }, { id: 'estado', label: 'Estado alterado', color: '#A56BFF' },
  { id: 'agotamiento', label: 'Agotamiento', color: '#FFD66B' }, { id: 'defensa', label: 'Defensa activa', color: '#5DEEFF' },
]

export function VitalsTab({ c, set, locked }: TabProps) {
  const [kind, setKind] = useState<Condition['kind']>('estado')
  const [name, setName] = useState('')
  const [notes, setNotes] = useState('')

  function setCurrent(k: (typeof VITALS)[number]['key'], v: number) {
    const nv = Math.max(0, Math.min(attrValue(c, k), Math.round(v)))
    if (nv < c.current[k]) (k === 'vitAmarilla' ? sfx.shatter : sfx.hit)()
    else if (nv > c.current[k]) sfx.heal()
    set({ ...c, current: { ...c.current, [k]: nv } }, `${k}: ${c.current[k]} → ${nv}`)
  }

  return (
    <div className="space-y-3">
      <Panel title="Vitalidad y resistencia">
        <div className="space-y-4">
          {VITALS.map((v) => (
            <div key={v.key}>
              <Bar value={c.current[v.key]} max={attrValue(c, v.key)} color={v.color} label={v.label} icon={v.icon} />
              <div className="mt-1 flex items-center justify-between gap-2">
                <p className="text-[11px] text-ink/50">{v.hint}</p>
                {!locked && <div className="flex gap-1">
                  <Btn tone="doom" onClick={() => setCurrent(v.key, c.current[v.key] - 1)}>−1</Btn>
                  <Btn tone="good" onClick={() => setCurrent(v.key, c.current[v.key] + 1)}>+1</Btn>
                  <Btn tone="ghost" onClick={() => setCurrent(v.key, attrValue(c, v.key))}>Máx</Btn>
                </div>}
              </div>
            </div>
          ))}
        </div>
        {locked && <p className="mt-3 text-xs text-gold">Ficha aprobada: los cambios de vitalidad los confirma el GM.</p>}
        <p className="mt-3 text-[11px] text-ink/40">Las consecuencias de llegar a cero, la regeneración del aura y el agotamiento no tienen regla oficial: las resuelve el GM.</p>
      </Panel>

      <Panel title="Heridas, efectos y estados">
        {!c.conditions.length && <Empty>Sin estados activos.</Empty>}
        <div className="flex flex-wrap gap-2">
          {c.conditions.map((x) => {
            const k = KINDS.find((y) => y.id === x.kind)!
            return (
              <span key={x.id} className="rounded-lg border px-3 py-1.5 text-xs" style={{ borderColor: `${k.color}88`, color: k.color }} title={x.notes}>
                <b className="mr-1 uppercase">{k.label}:</b>{x.name}{x.notes && <span className="ml-1 text-ink/50">— {x.notes}</span>}
                {!locked && <button className="ml-2 text-ink/50" aria-label={`Quitar ${x.name}`} onClick={() => set({ ...c, conditions: c.conditions.filter((y) => y.id !== x.id) }, `Estado retirado: ${x.name}`)}>✕</button>}
              </span>
            )
          })}
        </div>
        {!locked && <div className="mt-3 grid gap-2 sm:grid-cols-[10rem_1fr_1fr_auto]">
          <select className="holo-input" value={kind} onChange={(e) => setKind(e.target.value as Condition['kind'])} aria-label="Tipo">
            {KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
          </select>
          <Text value={name} onChange={setName} placeholder="Nombre" />
          <Text value={notes} onChange={setNotes} placeholder="Notas (opcional)" />
          <Btn disabled={!name.trim()} onClick={() => { set({ ...c, conditions: [...c.conditions, { id: crypto.randomUUID(), kind, name: name.trim(), notes }] }, `Estado añadido: ${name}`); setName(''); setNotes('') }}>Añadir</Btn>
        </div>}
      </Panel>

      <Panel title="Valores actuales exactos">
        <div className="grid gap-3 sm:grid-cols-3">
          {VITALS.map((v) => <Field key={v.key} label={`${v.label} (máx ${attrValue(c, v.key)})`}><Num value={c.current[v.key]} min={0} disabled={locked} onChange={(n) => setCurrent(v.key, n)} /></Field>)}
        </div>
      </Panel>
    </div>
  )
}
