import { useState } from 'react'
import type { StoryEntry, Visibility } from '../../domain/schema'
import { importImage, pickFiles } from '../../io/images'
import { useStore } from '../../store/useStore'
import { Btn, Empty, Field, Panel, Text, confirmAction } from '../../ui/kit'
import type { TabProps } from './CharacterEditor'

export const STORY_SECTIONS = [
  'Biografía', 'Personalidad', 'Familia conocida', 'Relaciones', 'Amistades', 'Enemigos', 'Traumas', 'Objetivos', 'Secretos',
  'Miedos', 'Virtudes', 'Defectos', 'Creencias', 'Aficiones', 'Reputación', 'Diario personal', 'Cronología', 'Recuerdos importantes',
]
export const VIS: Record<Visibility, { label: string; color: string }> = {
  publico: { label: 'Público', color: '#4EE8A0' }, privado: { label: 'Privado', color: '#5DEEFF' },
  jugadorGM: { label: 'Jugador y GM', color: '#4285FF' }, soloGM: { label: 'Solo GM', color: '#A56BFF' },
}

export function StoryTab({ c, set, gm }: TabProps) {
  const toast = useStore((s) => s.toast)
  const [section, setSection] = useState(STORY_SECTIONS[0])
  const [custom, setCustom] = useState('')
  const sections = [...new Set([...STORY_SECTIONS, ...c.story.map((s) => s.section)])]
  // "Solo GM" no se muestra al jugador. En local es ocultación de interfaz; en online lo filtra el servidor.
  const entries = c.story.filter((s) => s.section === section && (gm || s.visibility !== 'soloGM'))
  const up = (e: StoryEntry) => set({ ...c, story: c.story.map((x) => (x.id === e.id ? e : x)) })
  const add = (sec = section) => set({ ...c, story: [...c.story, { id: crypto.randomUUID(), section: sec, title: '', date: '', text: '', visibility: sec === 'Secretos' ? 'privado' : 'jugadorGM' }] })

  return (
    <div className="grid gap-3 md:grid-cols-[14rem_1fr]">
      <Panel title="Apartados">
        <nav className="flex gap-1 overflow-x-auto md:flex-col">
          {sections.map((s) => {
            const n = c.story.filter((x) => x.section === s && (gm || x.visibility !== 'soloGM')).length
            return <button key={s} onClick={() => setSection(s)} className={`shrink-0 rounded px-2 py-1.5 text-left text-sm ${s === section ? 'bg-holo/10 text-holo' : 'text-ink/70 hover:text-ink'}`}>{s}{n ? <span className="ml-1 text-[10px] text-ink/40">({n})</span> : ''}</button>
          })}
        </nav>
        <div className="mt-3 flex gap-1">
          <input className="holo-input" placeholder="Apartado propio" value={custom} onChange={(e) => setCustom(e.target.value)} />
          <Btn disabled={!custom.trim()} onClick={() => { add(custom.trim()); setSection(custom.trim()); setCustom('') }}>+</Btn>
        </div>
      </Panel>
      <Panel title={section} actions={<Btn tone="good" onClick={() => add()}>+ Entrada</Btn>}>
        {!entries.length && <Empty>Sin entradas en este apartado.</Empty>}
        <div className="space-y-3">
          {entries.map((e) => (
            <article key={e.id} className="rounded-lg border p-3" style={{ borderColor: `${VIS[e.visibility].color}55` }}>
              <div className="grid gap-2 sm:grid-cols-[1fr_10rem_10rem]">
                <Text value={e.title} onChange={(v) => up({ ...e, title: v })} placeholder="Título" />
                <input type="text" className="holo-input" value={e.date} placeholder="Fecha (libre)" onChange={(x) => up({ ...e, date: x.target.value })} aria-label="Fecha" />
                <select className="holo-input" value={e.visibility} aria-label="Visibilidad" onChange={(x) => up({ ...e, visibility: x.target.value as Visibility })}>
                  {(Object.keys(VIS) as Visibility[]).filter((v) => gm || v !== 'soloGM').map((v) => <option key={v} value={v}>{VIS[v].label}</option>)}
                </select>
              </div>
              <Field label="Texto" className="mt-2"><Text area value={e.text} onChange={(v) => up({ ...e, text: v })} /></Field>
              {e.image && <img src={e.image} alt="" className="mt-2 max-h-60 rounded-lg" />}
              <div className="mt-2 flex gap-2">
                <Btn tone="ghost" onClick={async () => { const [f] = await pickFiles('image/*', false); if (f) try { up({ ...e, image: await importImage(f) }) } catch (er: any) { toast(er.message, 'danger') } }}>{e.image ? 'Cambiar imagen' : 'Añadir imagen'}</Btn>
                {e.image && <Btn tone="ghost" onClick={() => up({ ...e, image: undefined })}>Quitar imagen</Btn>}
                <Btn tone="doom" onClick={() => confirmAction('¿Eliminar entrada?') && set({ ...c, story: c.story.filter((x) => x.id !== e.id) })}>Eliminar</Btn>
              </div>
            </article>
          ))}
        </div>
      </Panel>
    </div>
  )
}
