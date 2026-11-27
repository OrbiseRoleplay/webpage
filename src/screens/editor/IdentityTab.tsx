import { useState } from 'react'
import { RULES } from '../../rules/config'
import { Btn, Field, Num, Panel, Text } from '../../ui/kit'
import type { TabProps } from './CharacterEditor'

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

export function IdentityTab({ c, set, gm }: TabProps) {
  const id = c.identity
  const up = (p: Partial<typeof id>) => set({ ...c, identity: { ...id, ...p } })
  const [title, setTitle] = useState('')
  const txt = (k: keyof typeof id, label: string) => (
    <Field label={label}><Text value={String(id[k] ?? '')} onChange={(v) => up({ [k]: v } as any)} /></Field>
  )
  return (
    <Panel title="Identidad">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {txt('firstName', 'Nombre')}
        {txt('lastName', 'Apellido')}
        {txt('alias', 'Alias (opcional)')}
        {txt('gender', 'Género')}
        {txt('age', 'Edad')}
        <Field label="Cumpleaños (día y mes)">
          <div className="flex gap-2">
            <Num value={id.birthday.day} min={1} max={31} onChange={(d) => up({ birthday: { ...id.birthday, day: d >= 1 && d <= 31 ? d : null } })} />
            <select className="holo-input" value={id.birthday.month ?? ''} onChange={(e) => up({ birthday: { ...id.birthday, month: e.target.value ? Number(e.target.value) : null } })}>
              <option value="">Mes…</option>
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
          </div>
        </Field>
        {txt('height', 'Altura')}
        {txt('weight', 'Peso')}
        <Field label="Sociedad">
          <select className="holo-input" value={id.society} onChange={(e) => up({ society: e.target.value as 'FAERIT' })}>
            {RULES.societies.map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>
        {txt('profession', 'Profesión')}
        {txt('residence', 'Residencia')}
        {txt('reputation', 'Reputación')}
        <Field label="Nivel"><Num value={id.level} min={0} disabled={c.approved && !gm} onChange={(v) => set({ ...c, identity: { ...id, level: Math.max(0, v | 0) } }, `Nivel → ${v}`)} /></Field>
      </div>
      <Field label="Rasgos físicos" className="mt-3"><Text area value={id.physicalTraits} onChange={(v) => up({ physicalTraits: v })} /></Field>
      <Field label="Títulos" className="mt-3">
        <div className="flex flex-wrap items-center gap-2">
          {id.titles.map((t, i) => (
            <span key={i} className="rounded-full border border-gold/40 px-3 py-1 text-xs text-gold">
              {t} <button aria-label={`Quitar título ${t}`} className="ml-1 text-ink/50" onClick={() => up({ titles: id.titles.filter((_, j) => j !== i) })}>✕</button>
            </span>
          ))}
          <input className="holo-input !w-48" placeholder="Nuevo título" value={title} onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && title.trim()) { up({ titles: [...id.titles, title.trim()] }); setTitle('') } }} />
          <Btn tone="gold" disabled={!title.trim()} onClick={() => { up({ titles: [...id.titles, title.trim()] }); setTitle('') }}>Añadir</Btn>
        </div>
      </Field>
    </Panel>
  )
}
