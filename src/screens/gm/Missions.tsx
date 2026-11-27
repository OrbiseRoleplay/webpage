import { useState } from 'react'
import { displayName, uid } from '../../domain/character'
import type { Campaign, Character, Mission } from '../../domain/schema'
import { Btn, Empty, Field, Text } from '../../ui/kit'

const TYPES: Mission['type'][] = ['principal', 'secundaria', 'individual', 'grupal', 'oculta', 'evento']
const STATUS: Mission['status'][] = ['pendiente', 'activa', 'completada', 'fallida']

/** Misiones de una campaña. Las 'oculta' y las notas del GM solo se ven con gmMode. */
export function Missions({ camp, chars, gm, onChange }: { camp: Campaign; chars: Character[]; gm: boolean; onChange: (m: Mission[]) => void }) {
  const [obj, setObj] = useState('')
  const set = (m: Mission) => onChange(camp.missions.map((x) => (x.id === m.id ? m : x)))
  const visible = camp.missions.filter((m) => gm || m.type !== 'oculta')
  const members = chars.filter((c) => camp.characterIds.includes(c.id))

  return (
    <div className="space-y-2">
      <Btn onClick={() => onChange([...camp.missions, { id: uid(), title: 'Nueva misión', type: 'principal', description: '', images: [], objectives: [], participants: [], status: 'pendiente', rewards: '', gmNotes: '' }])}>Nueva misión</Btn>
      {visible.length === 0 && <Empty>Sin misiones.</Empty>}
      {visible.map((m) => (
        <details key={m.id} className="rounded border border-white/10 p-2">
          <summary className="cursor-pointer text-sm">{m.title || 'Sin título'} <span className="text-xs text-ink/50">· {m.type} · {m.status}</span></summary>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <Field label="Título"><Text value={m.title} onChange={(v) => set({ ...m, title: v })} /></Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Tipo"><select className="holo-input" value={m.type} onChange={(e) => set({ ...m, type: e.target.value as Mission['type'] })}>{TYPES.map((t) => <option key={t}>{t}</option>)}</select></Field>
              <Field label="Estado"><select className="holo-input" value={m.status} onChange={(e) => set({ ...m, status: e.target.value as Mission['status'] })}>{STATUS.map((t) => <option key={t}>{t}</option>)}</select></Field>
            </div>
            <Field label="Descripción" className="sm:col-span-2"><Text area value={m.description} onChange={(v) => set({ ...m, description: v })} /></Field>
            <Field label="Recompensas" className="sm:col-span-2"><Text value={m.rewards} onChange={(v) => set({ ...m, rewards: v })} /></Field>
            {gm && <Field label="Notas privadas del GM" className="sm:col-span-2"><Text area value={m.gmNotes} onChange={(v) => set({ ...m, gmNotes: v })} /></Field>}
          </div>
          <div className="mt-2 text-xs tracking-wider text-holo/70 uppercase">Objetivos {gm ? '(revelar progresivamente)' : ''}</div>
          <ul className="space-y-1 text-sm">
            {m.objectives.filter((o) => gm || o.revealed).map((o) => (
              <li key={o.id} className="flex items-center gap-2">
                <input type="checkbox" checked={o.done} onChange={(e) => set({ ...m, objectives: m.objectives.map((x) => x.id === o.id ? { ...x, done: e.target.checked } : x) })} aria-label="Completado" />
                <span className={`flex-1 ${o.done ? 'line-through opacity-60' : ''}`}>{o.text}{gm && !o.revealed && <em className="text-xs text-ink/50"> (oculto)</em>}</span>
                {gm && <Btn tone="ghost" onClick={() => set({ ...m, objectives: m.objectives.map((x) => x.id === o.id ? { ...x, revealed: !x.revealed } : x) })}>{o.revealed ? 'Ocultar' : 'Revelar'}</Btn>}
                {gm && <Btn tone="ghost" onClick={() => set({ ...m, objectives: m.objectives.filter((x) => x.id !== o.id) })}>✕</Btn>}
              </li>
            ))}
          </ul>
          {gm && (
            <div className="mt-1 flex gap-2">
              <Text value={obj} onChange={setObj} placeholder="Nuevo objetivo" />
              <Btn disabled={!obj.trim()} onClick={() => { set({ ...m, objectives: [...m.objectives, { id: uid(), text: obj.trim(), revealed: false, done: false }] }); setObj('') }}>Añadir</Btn>
            </div>
          )}
          <div className="mt-2 text-xs tracking-wider text-holo/70 uppercase">Participantes</div>
          <div className="flex flex-wrap gap-3 text-sm">
            {members.length === 0 && <span className="text-xs text-ink/50">Asigna personajes a la campaña primero.</span>}
            {members.map((c) => (
              <label key={c.id} className="flex items-center gap-1"><input type="checkbox" checked={m.participants.includes(c.id)}
                onChange={(e) => set({ ...m, participants: e.target.checked ? [...m.participants, c.id] : m.participants.filter((x) => x !== c.id) })} />{displayName(c)}</label>
            ))}
          </div>
          <div className="mt-2 text-right"><Btn tone="doom" onClick={() => window.confirm('¿Eliminar misión?') && onChange(camp.missions.filter((x) => x.id !== m.id))}>Eliminar misión</Btn></div>
        </details>
      ))}
    </div>
  )
}
