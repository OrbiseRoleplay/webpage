import { useState } from 'react'
import type { EncyclopediaEntry } from '../domain/schema'
import { importImage, pickFiles } from '../io/images'
import { useStore } from '../store/useStore'
import { Btn, Empty, Field, Modal, Panel, Text, confirmAction } from '../ui/kit'

const CATS: { id: EncyclopediaEntry['category']; label: string }[] = [
  { id: 'historia', label: 'Historia' }, { id: 'faerit', label: 'Sociedad FAERIT' }, { id: 'dones', label: 'Dones' },
  { id: 'personajes', label: 'Personajes' }, { id: 'localizaciones', label: 'Localizaciones' }, { id: 'organizaciones', label: 'Organizaciones' },
  { id: 'tecnologia', label: 'Tecnología' }, { id: 'criaturas', label: 'Criaturas' }, { id: 'acontecimientos', label: 'Acontecimientos' }, { id: 'reglamento', label: 'Reglamento' },
]

export function EncyclopediaScreen() {
  const { encyclopedia, saveEntry, deleteEntry, gmMode, toast } = useStore()
  const [cat, setCat] = useState<EncyclopediaEntry['category']>('historia')
  const [edit, setEdit] = useState<EncyclopediaEntry | null>(null)
  const list = encyclopedia.filter((e) => e.category === cat)
  return (
    <div className="grid gap-3 md:grid-cols-[14rem_1fr]">
      <Panel title="Categorías">
        <nav className="flex gap-1 overflow-x-auto md:flex-col">
          {CATS.map((c) => <button key={c.id} onClick={() => setCat(c.id)} className={`shrink-0 rounded px-2 py-1.5 text-left text-sm ${c.id === cat ? 'bg-holo/10 text-holo' : 'text-ink/70'}`}>{c.label}</button>)}
        </nav>
      </Panel>
      <Panel title={CATS.find((c) => c.id === cat)!.label}
        actions={gmMode && <Btn tone="good" onClick={() => setEdit({ id: crypto.randomUUID(), category: cat, title: '', text: '', official: false })}>+ Entrada</Btn>}>
        {!list.length && <Empty>Sin contenido. {gmMode ? 'Añade entradas oficiales del universo ORBISE.' : 'El administrador (modo GM) introduce el contenido oficial.'}</Empty>}
        <div className="space-y-3">
          {list.map((e) => (
            <article key={e.id} className="rounded-lg border border-holo/20 p-3">
              <h3 className="font-display tracking-wider">{e.title}
                {e.official ? <span className="ml-2 text-[10px] text-good uppercase">Canon oficial</span> : <span className="ml-2 text-[10px] text-gold uppercase">Provisional · no canon</span>}
              </h3>
              {e.image && <img src={e.image} alt="" className="mt-2 max-h-64 rounded-lg" />}
              <p className="mt-2 text-sm whitespace-pre-wrap text-ink/80">{e.text}</p>
              {gmMode && <div className="mt-2 flex gap-2"><Btn tone="ghost" onClick={() => setEdit(e)}>Editar</Btn><Btn tone="doom" onClick={() => confirmAction('¿Eliminar entrada?') && deleteEntry(e.id)}>Eliminar</Btn></div>}
            </article>
          ))}
        </div>
      </Panel>
      <Modal open={!!edit} onClose={() => setEdit(null)} title="Entrada de enciclopedia">
        {edit && <div className="space-y-2">
          <Field label="Título"><Text value={edit.title} onChange={(v) => setEdit({ ...edit, title: v })} /></Field>
          <Field label="Texto"><Text area value={edit.text} onChange={(v) => setEdit({ ...edit, text: v })} /></Field>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={edit.official} onChange={(e) => setEdit({ ...edit, official: e.target.checked })} /> Contenido oficial (canon) aprobado por el autor</label>
          <div className="flex gap-2">
            <Btn tone="ghost" onClick={async () => { const [f] = await pickFiles('image/*', false); if (f) try { setEdit({ ...edit, image: await importImage(f) }) } catch (er: any) { toast(er.message, 'danger') } }}>Imagen</Btn>
            <Btn tone="good" disabled={!edit.title.trim()} onClick={() => { saveEntry(edit); setEdit(null) }}>Guardar</Btn>
          </div>
        </div>}
      </Modal>
    </div>
  )
}
