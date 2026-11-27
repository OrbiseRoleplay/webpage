import { useState } from 'react'
import { displayName, now, uid } from '../domain/character'
import { randomInt } from '../domain/dice'
import type { Campaign, Visibility } from '../domain/schema'
import { importImage, pickFiles } from '../io/images'
import { useStore } from '../store/useStore'
import { Btn, Empty, Field, Panel, Tabs, Text, confirmAction } from '../ui/kit'
import { Missions } from './gm/Missions'

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
const inviteCode = () => Array.from({ length: 8 }, () => CHARS[randomInt(CHARS.length) - 1]).join('')
const VIS: Visibility[] = ['publico', 'privado', 'jugadorGM', 'soloGM']
type Tab = 'general' | 'misiones' | 'diario' | 'escenarios'

export function CampaignsScreen() {
  const { campaigns, characters, saveCampaign, deleteCampaign, saveCharacter, gmMode, toast } = useStore()
  const [sel, setSel] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('general')
  const camp = campaigns.find((c) => c.id === sel)
  const upd = (p: Partial<Campaign>) => camp && saveCampaign({ ...camp, ...p })

  const create = () => {
    const c: Campaign = { id: uid(), name: 'Nueva campaña', description: '', inviteCode: inviteCode(), createdAt: now(), characterIds: [], missions: [], journal: [], scenarios: [], paused: false }
    saveCampaign(c); setSel(c.id); setTab('general')
  }
  const assign = (id: string, on: boolean) => {
    if (!camp) return
    upd({ characterIds: on ? [...camp.characterIds, id] : camp.characterIds.filter((x) => x !== id) })
    const ch = characters.find((c) => c.id === id)
    if (ch) saveCharacter({ ...ch, campaignId: on ? camp.id : null })
  }
  const addImage = async (cb: (url: string) => void) => {
    const [f] = await pickFiles('image/*', false)
    if (f) importImage(f).then(cb).catch((e: Error) => toast(e.message, 'danger'))
  }
  const journal = camp ? [...camp.journal].filter((j) => gmMode || j.visibility !== 'soloGM').sort((a, b) => a.date.localeCompare(b.date)) : []

  return (
    <div className="grid gap-4 md:grid-cols-[240px_1fr]">
      <Panel title="Campañas" actions={<Btn onClick={create}>Nueva</Btn>}>
        {campaigns.length === 0 && <Empty>Sin campañas.</Empty>}
        <ul className="space-y-1">
          {campaigns.map((c) => (
            <li key={c.id}><button onClick={() => setSel(c.id)} className={`w-full rounded border px-2 py-1 text-left text-sm ${sel === c.id ? 'border-holo text-holo' : 'border-white/10'}`}>
              {c.name || 'Sin nombre'}{c.paused && <span className="text-xs text-gold"> · pausada</span>}</button></li>
          ))}
        </ul>
      </Panel>

      {!camp ? <Empty>Selecciona o crea una campaña.</Empty> : (
        <Panel title={camp.name || 'Campaña'}>
          <Tabs<Tab> value={tab} onChange={setTab} tabs={[{ id: 'general', label: 'General' }, { id: 'misiones', label: 'Misiones' }, { id: 'diario', label: 'Diario y cronología' }, { id: 'escenarios', label: 'Escenarios' }]} />
          <div className="mt-3">
            {tab === 'general' && (
              <div className="space-y-3">
                <Field label="Nombre"><Text value={camp.name} onChange={(v) => upd({ name: v })} /></Field>
                <Field label="Descripción"><Text area value={camp.description} onChange={(v) => upd({ description: v })} /></Field>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  Código de invitación: <b className="font-display tracking-[0.3em] text-gold">{camp.inviteCode}</b>
                  <Btn tone="ghost" onClick={() => upd({ inviteCode: inviteCode() })}>Regenerar</Btn>
                </div>
                <p className="text-xs text-ink/50">Unirse con este código desde otro dispositivo requiere modo online (no configurado). Por ahora es solo un identificador local.</p>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={camp.paused} onChange={(e) => upd({ paused: e.target.checked })} /> Sesión pausada</label>
                <div>
                  <div className="mb-1 text-xs tracking-wider text-holo/70 uppercase">Personajes de la campaña</div>
                  <div className="flex flex-wrap gap-3 text-sm">
                    {characters.filter((c) => !c.isTemplate).map((c) => (
                      <label key={c.id} className="flex items-center gap-1"><input type="checkbox" checked={camp.characterIds.includes(c.id)} onChange={(e) => assign(c.id, e.target.checked)} />{displayName(c)}</label>
                    ))}
                  </div>
                </div>
                <Btn tone="doom" onClick={() => { if (confirmAction(`¿Eliminar la campaña "${camp.name}"?`)) { deleteCampaign(camp.id); setSel(null) } }}>Eliminar campaña</Btn>
              </div>
            )}
            {tab === 'misiones' && <Missions camp={camp} chars={characters} gm={gmMode} onChange={(missions) => upd({ missions })} />}
            {tab === 'diario' && (
              <div className="space-y-2">
                <Btn onClick={() => upd({ journal: [...camp.journal, { id: uid(), date: now().slice(0, 10), title: 'Nueva entrada', text: '', visibility: 'publico' }] })}>Nueva entrada</Btn>
                {journal.length === 0 && <Empty>Diario vacío.</Empty>}
                {journal.map((j) => {
                  const set = (p: Partial<typeof j>) => upd({ journal: camp.journal.map((x) => (x.id === j.id ? { ...x, ...p } : x)) })
                  return (
                    <div key={j.id} className="grid gap-2 rounded border border-white/10 p-2 sm:grid-cols-3">
                      <Field label="Fecha"><input type="date" className="holo-input" value={j.date} onChange={(e) => set({ date: e.target.value })} /></Field>
                      <Field label="Título"><Text value={j.title} onChange={(v) => set({ title: v })} /></Field>
                      <Field label="Visibilidad"><select className="holo-input" value={j.visibility} onChange={(e) => set({ visibility: e.target.value as Visibility })}>{VIS.map((v) => <option key={v}>{v}</option>)}</select></Field>
                      <Field label="Texto" className="sm:col-span-3"><Text area value={j.text} onChange={(v) => set({ text: v })} /></Field>
                      <div className="sm:col-span-3 text-right"><Btn tone="ghost" onClick={() => upd({ journal: camp.journal.filter((x) => x.id !== j.id) })}>Eliminar</Btn></div>
                    </div>
                  )
                })}
              </div>
            )}
            {tab === 'escenarios' && (
              <div className="space-y-2">
                <Btn onClick={() => upd({ scenarios: [...camp.scenarios, { id: uid(), name: 'Nuevo escenario', description: '' }] })}>Nuevo escenario</Btn>
                {camp.scenarios.length === 0 && <Empty>Sin escenarios.</Empty>}
                <div className="grid gap-3 sm:grid-cols-2">
                  {camp.scenarios.map((s) => {
                    const set = (p: Partial<typeof s>) => upd({ scenarios: camp.scenarios.map((x) => (x.id === s.id ? { ...x, ...p } : x)) })
                    return (
                      <div key={s.id} className="space-y-2 rounded border border-white/10 p-2">
                        {s.image && <img src={s.image} alt={s.name} className="h-32 w-full rounded object-cover" />}
                        <Text value={s.name} onChange={(v) => set({ name: v })} />
                        <Text area value={s.description} onChange={(v) => set({ description: v })} />
                        <div className="flex gap-2">
                          <Btn tone="ghost" onClick={() => addImage((image) => set({ image }))}>{s.image ? 'Cambiar imagen' : 'Añadir imagen'}</Btn>
                          <Btn tone="ghost" onClick={() => upd({ scenarios: camp.scenarios.filter((x) => x.id !== s.id) })}>Eliminar</Btn>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </Panel>
      )}
    </div>
  )
}
