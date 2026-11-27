import { useEffect, useRef, useState } from 'react'
import { useStore } from '../../store/useStore'
import type { Character } from '../../domain/schema'
import { displayName, mainImage } from '../../domain/character'
import { openCampaignProfile, syncCharacterToCampaign, useOnline } from '../../online/supabase'
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
  const { characters, campaigns, editingId, saveCharacter, gmMode, go } = useStore()
  const { memberships, refresh } = useOnline()
  const [tab, setTab] = useState<TabId>('identidad')
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const c = characters.find((x) => x.id === editingId)

  useEffect(() => {
    return () => {
      if (syncTimer.current) clearTimeout(syncTimer.current)
    }
  }, [])

  if (!c) return <Panel><Empty>Personaje no encontrado.</Empty><Btn onClick={() => go('personajes')}>Volver</Btn></Panel>

  const linkedCampaign =
    campaigns.find((camp) => camp.id === c.campaignId || camp.characterIds.includes(c.id)) ??
    memberships.find((m) => m.campaign.id === c.campaignId)?.campaign

  // Ficha aprobada en campaña: el jugador ya no puede tocar reparto ni valores de juego (el GM sí).
  const locked = c.approved && !gmMode
  const handleSave = (next: Character, change?: string) => {
    saveCharacter(next, change)
    const targetCampaignId = next.campaignId || linkedCampaign?.id
    if (targetCampaignId) {
      if (syncTimer.current) clearTimeout(syncTimer.current)
      syncTimer.current = setTimeout(() => {
        syncCharacterToCampaign(next, targetCampaignId).then(() => refresh())
      }, 600)
    }
  }
  const props: TabProps = { c, set: handleSave, locked, gm: gmMode }
  const img = mainImage(c)

  return (
    <div className="space-y-3">
      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border border-holo/40 bg-black/40">
              {img ? <img src={img} alt="" className="h-full w-full object-cover" /> : <span className="grid h-full place-items-center text-holo/40">◎</span>}
              <span className="scan-sweep" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate font-display text-lg tracking-widest text-glow">{displayName(c)}</h2>
              <p className="text-xs text-ink/60">
                {c.identity.society} · Nivel {c.identity.level} ·{' '}
                {c.approved ? <span className="text-good">Ficha aprobada</span> : <span className="text-gold">Pendiente de aprobación del GM</span>}
              </p>
              {linkedCampaign && (
                <p className="mt-0.5 text-xs text-holo">
                  Campaña: <strong>{linkedCampaign.name}</strong>
                </p>
              )}
            </div>
          </div>

          {linkedCampaign && (
            <Btn tone="holo" onClick={() => openCampaignProfile(linkedCampaign.id)}>
              Ir al perfil de la campaña →
            </Btn>
          )}
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
