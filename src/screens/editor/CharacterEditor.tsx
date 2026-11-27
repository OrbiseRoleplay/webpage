import { useState } from 'react'
import { useStore } from '../../store/useStore'
import type { Character } from '../../domain/schema'
import { displayName, mainImage } from '../../domain/character'
import { Btn, Empty, Panel, Tabs } from '../../ui/kit'
import { IdentityTab } from './IdentityTab'
import { GalleryTab } from './GalleryTab'
import { GiftTab } from './GiftTab'
import { AttributesTab } from './AttributesTab'
import { VitalsTab } from './VitalsTab'
import { InventoryTab } from './InventoryTab'
import { StoryTab } from './StoryTab'
import { ProgressTab } from './ProgressTab'
import { ExportPanel } from './ExportPanel'

/** Props comunes de cada pestaña. `set` guarda al instante (autoguardado); `change` registra en el historial. */
export interface TabProps { c: Character; set: (next: Character, change?: string) => void; locked: boolean; gm: boolean }

const TABS = [
  { id: 'identidad', label: 'Identidad' }, { id: 'galeria', label: 'Galería' }, { id: 'don', label: 'Don' },
  { id: 'atributos', label: 'Atributos' }, { id: 'vitalidad', label: 'Vitalidad' }, { id: 'inventario', label: 'Inventario' },
  { id: 'historia', label: 'Historia' }, { id: 'progresion', label: 'Progresión' }, { id: 'exportar', label: 'Exportar' },
] as const
type TabId = (typeof TABS)[number]['id']

export function CharacterEditor() {
  const { characters, editingId, saveCharacter, gmMode, go } = useStore()
  const [tab, setTab] = useState<TabId>('identidad')
  const c = characters.find((x) => x.id === editingId)
  if (!c) return <Panel><Empty>Personaje no encontrado.</Empty><Btn onClick={() => go('personajes')}>Volver</Btn></Panel>

  // Ficha aprobada en campaña: el jugador ya no puede tocar reparto ni valores de juego (el GM sí).
  const locked = c.approved && !gmMode
  const props: TabProps = { c, set: (n, change) => saveCharacter(n, change), locked, gm: gmMode }
  const img = mainImage(c)

  return (
    <div className="space-y-3">
      <Panel>
        <div className="flex items-center gap-4">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border border-holo/40 bg-black/40">
            {img ? <img src={img} alt="" className="h-full w-full object-cover" /> : <span className="grid h-full place-items-center text-holo/40">◎</span>}
            <span className="scan-sweep" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate font-display text-lg tracking-widest text-glow">{displayName(c)}</h2>
            <p className="text-xs text-ink/60">{c.identity.society} · Nivel {c.identity.level} · {c.approved ? <span className="text-good">Ficha aprobada</span> : <span className="text-gold">Pendiente de aprobación del GM</span>}</p>
          </div>
        </div>
        <div className="mt-3"><Tabs tabs={[...TABS]} value={tab} onChange={setTab} /></div>
      </Panel>
      {tab === 'identidad' && <IdentityTab {...props} />}
      {tab === 'galeria' && <GalleryTab {...props} />}
      {tab === 'don' && <GiftTab {...props} />}
      {tab === 'atributos' && <AttributesTab {...props} />}
      {tab === 'vitalidad' && <VitalsTab {...props} />}
      {tab === 'inventario' && <InventoryTab {...props} />}
      {tab === 'historia' && <StoryTab {...props} />}
      {tab === 'progresion' && <ProgressTab {...props} />}
      {tab === 'exportar' && <ExportPanel character={c} />}
    </div>
  )
}
