import { useEffect, useState } from 'react'
import { displayName, mainImage, now, uid } from '../domain/character'
import { randomInt } from '../domain/dice'
import type { Campaign, Character, Visibility } from '../domain/schema'
import { importImage, pickFiles } from '../io/images'
import {
  authError,
  createOnlineCampaign,
  joinOnlineCampaign,
  regenerateOnlineInvite,
  removeCharacterFromCampaign,
  supabase,
  syncCharacterToCampaign,
  useOnline,
  type CampaignRole,
} from '../online/supabase'
import { useStore } from '../store/useStore'
import { Btn, Empty, Field, Panel, Tabs, Text, confirmAction } from '../ui/kit'
import { Missions } from './gm/Missions'

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
const inviteCode = () => Array.from({ length: 8 }, () => CHARS[randomInt(CHARS.length) - 1]).join('')
const VIS: Visibility[] = ['publico', 'privado', 'jugadorGM', 'soloGM']
type Tab = 'fichas' | 'participantes' | 'general' | 'misiones' | 'diario' | 'escenarios'

export function CampaignsScreen() {
  const { campaigns, characters, saveCampaign, deleteCampaign, saveCharacter, createCharacter, edit, importCharacter, gmMode, toast } = useStore()
  const {
    session,
    profile,
    memberships,
    users,
    campaignParticipants,
    campaignRoles,
    campaignMemberRoles,
    campaignCharacters,
    activeCampaignId,
    setActiveCampaignId,
    refresh,
  } = useOnline()

  const [sel, setSel] = useState<string | null>(activeCampaignId ?? campaigns[0]?.id ?? null)
  const [tab, setTab] = useState<Tab>('fichas')
  const [joinCode, setJoinCode] = useState('')
  const [newName, setNewName] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (activeCampaignId) {
      setSel(activeCampaignId)
      setActiveCampaignId(null)
    } else if (!sel && campaigns.length > 0) {
      setSel(campaigns[0].id)
    }
  }, [activeCampaignId, campaigns, sel, setActiveCampaignId])

  const camp = campaigns.find((c) => c.id === sel)
  const onlineMembership = memberships.find((m) => m.campaign.id === sel)
  const isCampaignMaster = Boolean(
    gmMode ||
    profile?.is_admin ||
    onlineMembership?.role === 'gm' ||
    !onlineMembership // campaña creada localmente
  )

  const upd = async (p: Partial<Campaign>) => {
    if (!camp) return
    const next = { ...camp, ...p }
    saveCampaign(next)
    if (supabase && session && onlineMembership && isCampaignMaster) {
      await supabase
        .from('campaigns')
        .update({
          name: next.name,
          description: next.description,
          paused: next.paused,
        })
        .eq('id', camp.id)
    }
  }

  const create = async () => {
    const title = newName.trim() || 'Nueva campaña'
    setBusy(true)
    if (supabase && session) {
      const { data, error } = await createOnlineCampaign(title, '')
      setBusy(false)
      if (error) return toast(authError(error), 'danger')
      await refresh()
      if (data) {
        const c: Campaign = {
          id: data.id,
          name: title,
          description: '',
          inviteCode: data.invite_code,
          createdAt: now(),
          characterIds: [],
          missions: [],
          journal: [],
          scenarios: [],
          paused: false,
        }
        saveCampaign(c)
        setSel(c.id)
        setTab('fichas')
        setNewName('')
        toast('Campaña creada', 'ok')
        return
      }
    }
    setBusy(false)
    const c: Campaign = {
      id: uid(),
      name: title,
      description: '',
      inviteCode: inviteCode(),
      createdAt: now(),
      characterIds: [],
      missions: [],
      journal: [],
      scenarios: [],
      paused: false,
    }
    saveCampaign(c)
    setSel(c.id)
    setTab('fichas')
    setNewName('')
  }

  const handleJoinByCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!joinCode.trim()) return
    if (!session) return toast('Inicia sesión en Cuenta para unirte con un código online', 'warn')
    setBusy(true)
    const { campaignId, error } = await joinOnlineCampaign(joinCode)
    setBusy(false)
    if (error) return toast(authError(error), 'danger')
    setJoinCode('')
    toast('¡Te has unido a la campaña!', 'ok')
    await refresh()
    if (campaignId) {
      setSel(campaignId)
      setTab('fichas')
    }
  }

  const assign = async (id: string, on: boolean) => {
    if (!camp) return
    const nextIds = on ? [...new Set([...camp.characterIds, id])] : camp.characterIds.filter((x) => x !== id)
    saveCampaign({ ...camp, characterIds: nextIds })
    const ch = characters.find((c) => c.id === id)
    if (ch) {
      const updated = { ...ch, campaignId: on ? camp.id : null }
      saveCharacter(updated)
      if (supabase && session) {
        if (on) await syncCharacterToCampaign(updated, camp.id)
        else await removeCharacterFromCampaign(ch.id, camp.id)
        await refresh()
      }
    }
  }

  const createCharacterInsideCampaign = async () => {
    if (!camp) return
    const c = createCharacter({ campaignId: camp.id })
    saveCampaign({ ...camp, characterIds: [...new Set([...camp.characterIds, c.id])] })
    if (supabase && session) {
      await syncCharacterToCampaign(c, camp.id)
      await refresh()
    }
    edit(c.id)
  }

  const addImage = async (cb: (url: string) => void) => {
    const [f] = await pickFiles('image/*', false)
    if (f) importImage(f).then(cb).catch((e: Error) => toast(e.message, 'danger'))
  }

  const journal = camp
    ? [...camp.journal].filter((j) => isCampaignMaster || j.visibility !== 'soloGM').sort((a, b) => a.date.localeCompare(b.date))
    : []

  // Combinar fichas locales asignadas a esta campaña con las fichas sincronizadas en Supabase
  const remoteCharsForCamp = campaignCharacters.filter((cc) => cc.campaign_id === camp?.id)
  const localCharsForCamp = characters.filter(
    (c) => !c.isTemplate && (c.campaignId === camp?.id || camp?.characterIds.includes(c.id))
  )
  const combinedCharactersMap = new Map<string, { char: Character; ownerId?: string; isRemoteOnly: boolean }>()
  for (const c of localCharsForCamp) {
    const remote = remoteCharsForCamp.find((r) => r.id === c.id)
    combinedCharactersMap.set(c.id, { char: c, ownerId: remote?.owner_id ?? session?.user.id, isRemoteOnly: false })
  }
  for (const r of remoteCharsForCamp) {
    if (!combinedCharactersMap.has(r.id)) {
      combinedCharactersMap.set(r.id, { char: r.data, ownerId: r.owner_id, isRemoteOnly: true })
    }
  }
  const campaignSheetList = Array.from(combinedCharactersMap.values())

  const participantsForCamp = campaignParticipants.filter((p) => p.campaign_id === camp?.id)
  const rolesForCamp = campaignRoles.filter((r) => r.campaign_id === camp?.id)
  const memberRolesForCamp = campaignMemberRoles.filter((mr) => mr.campaign_id === camp?.id)

  return (
    <div className="grid gap-4 md:grid-cols-[270px_1fr]">
      <div className="space-y-3">
        <Panel title="Unirse con código">
          <form onSubmit={handleJoinByCode} className="flex gap-2">
            <input
              className="holo-input font-mono tracking-widest uppercase text-xs"
              value={joinCode}
              maxLength={8}
              onChange={(e) => setJoinCode(e.target.value)}
              placeholder="K7Q2M9XA"
            />
            <Btn type="submit" tone="gold" disabled={busy || joinCode.trim().length < 4}>Unirme</Btn>
          </form>
        </Panel>

        <Panel title={`Tus campañas (${campaigns.length})`}>
          <div className="mb-3 flex gap-1.5">
            <Text value={newName} onChange={setNewName} placeholder="Nombre de campaña…" />
            <Btn tone="energy" disabled={busy} onClick={create}>+ Crear</Btn>
          </div>
          {campaigns.length === 0 && <Empty>Sin campañas todavía. Únete con un código o crea una nueva.</Empty>}
          <ul className="space-y-1.5">
            {campaigns.map((c) => {
              const m = memberships.find((x) => x.campaign.id === c.id)
              const active = sel === c.id
              return (
                <li key={c.id}>
                  <button
                    onClick={() => setSel(c.id)}
                    className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition ${
                      active ? 'border-holo bg-holo/10 text-holo' : 'border-white/10 hover:border-white/25'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="truncate font-medium">{c.name || 'Sin nombre'}</span>
                      {m && (
                        <span className={`rounded px-1.5 py-0.5 text-[10px] ${m.role === 'gm' ? 'bg-energy/20 text-energy' : 'bg-holo/20 text-holo'}`}>
                          {m.role === 'gm' ? 'Master' : 'Jugador'}
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center justify-between text-[11px] text-ink/50">
                      <span className="font-mono">{c.inviteCode}</span>
                      {c.paused && <span className="text-gold">En pausa</span>}
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        </Panel>
      </div>

      {!camp ? (
        <Panel title="Perfil de campaña">
          <Empty>Selecciona una campaña a la izquierda, únete con un código de invitación o crea una nueva.</Empty>
        </Panel>
      ) : (
        <Panel
          title={
            <div className="flex flex-wrap items-center gap-2">
              <span>{camp.name || 'Campaña'}</span>
              <span className="rounded border border-gold/40 bg-gold/10 px-2 py-0.5 font-mono text-xs tracking-widest text-gold">
                Código: {camp.inviteCode}
              </span>
              {isCampaignMaster ? (
                <span className="rounded border border-energy/50 bg-energy/10 px-2 py-0.5 text-[11px] text-energy">Master de la campaña</span>
              ) : (
                <span className="rounded border border-holo/40 bg-holo/10 px-2 py-0.5 text-[11px] text-holo">Participante</span>
              )}
            </div>
          }
          actions={
            <Btn
              tone="ghost"
              onClick={() => navigator.clipboard.writeText(camp.inviteCode).then(() => toast('Código de invitación copiado', 'ok'))}
            >
              Copiar código
            </Btn>
          }
        >
          {camp.description && <p className="mb-3 text-sm text-ink/70">{camp.description}</p>}

          <Tabs<Tab>
            value={tab}
            onChange={setTab}
            tabs={[
              { id: 'fichas', label: `Fichas (${campaignSheetList.length})` },
              { id: 'participantes', label: `Participantes y Roles (${participantsForCamp.length || 1})` },
              { id: 'misiones', label: `Misiones (${camp.missions.length})` },
              { id: 'diario', label: `Diario (${journal.length})` },
              { id: 'escenarios', label: `Escenarios (${camp.scenarios.length})` },
              { id: 'general', label: 'Ajustes' },
            ]}
          />

          <div className="mt-4">
            {tab === 'fichas' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-holo/25 bg-black/30 p-3">
                  <div>
                    <h3 className="font-display text-xs tracking-wider text-holo uppercase">Fichas de personaje en esta campaña</h3>
                    <p className="text-xs text-ink/60">Crea un personaje directamente aquí o vincula cualquiera de tus fichas guardadas.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Btn tone="gold" onClick={createCharacterInsideCampaign}>+ Crear nueva ficha en la campaña</Btn>
                    {session && (
                      <Btn
                        tone="ghost"
                        onClick={async () => {
                          for (const c of localCharsForCamp) {
                            await syncCharacterToCampaign(c, camp.id)
                          }
                          await refresh()
                          toast('Fichas sincronizadas con la campaña', 'ok')
                        }}
                      >
                        ↻ Sincronizar mis fichas
                      </Btn>
                    )}
                  </div>
                </div>

                {campaignSheetList.length === 0 ? (
                  <Empty>Todavía no hay fichas dentro de esta campaña. Crea una nueva o selecciona una de tus fichas abajo.</Empty>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {campaignSheetList.map(({ char: c, ownerId, isRemoteOnly }) => {
                      const img = mainImage(c)
                      const ownerUser = users.find((u) => u.id === ownerId)
                      const ownerRoles = rolesForCamp.filter((r) =>
                        memberRolesForCamp.some((mr) => mr.user_id === ownerId && mr.role_id === r.id)
                      )

                      return (
                        <article key={c.id} className="holo-panel flex gap-3 p-3">
                          <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-lg border border-holo/30 bg-black/40">
                            {img ? <img src={img} alt="" className="h-full w-full object-cover" /> : <span className="grid h-full place-items-center text-2xl text-holo/40">◎</span>}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1">
                              <h4 className="truncate font-display text-sm text-ink">{displayName(c)}</h4>
                              <span className="text-[10px] text-gold">Nv {c.identity.level}</span>
                            </div>
                            <p className="truncate text-xs text-ink/60">
                              {c.identity.society} {c.gift.name ? `· ${c.gift.name}` : ''}
                            </p>
                            {ownerUser && (
                              <div className="mt-1 flex flex-wrap items-center gap-1 text-[11px] text-ink/60">
                                <span>Jugador: <strong className="text-ink/85">{ownerUser.display_name}</strong></span>
                                {ownerRoles.map((r) => (
                                  <span
                                    key={r.id}
                                    className="rounded border px-1.5 py-0.2 text-[10px]"
                                    style={{ borderColor: r.color, color: r.color, backgroundColor: `${r.color}18` }}
                                  >
                                    {r.name}
                                  </span>
                                ))}
                              </div>
                            )}
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {!isRemoteOnly ? (
                                <>
                                  <Btn onClick={() => edit(c.id)}>Abrir ficha</Btn>
                                  <Btn tone="ghost" onClick={() => assign(c.id, false)}>Quitar de campaña</Btn>
                                </>
                              ) : (
                                <Btn
                                  tone="holo"
                                  onClick={() => {
                                    importCharacter({ ...c, campaignId: camp.id })
                                    toast(`Ficha de ${displayName(c)} guardada en tu dispositivo`, 'ok')
                                  }}
                                >
                                  Abrir / Guardar copia local
                                </Btn>
                              )}
                            </div>
                          </div>
                        </article>
                      )
                    })}
                  </div>
                )}

                {characters.filter((c) => !c.isTemplate).length > 0 && (
                  <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                    <div className="mb-2 text-xs font-display tracking-wider text-holo/80 uppercase">
                      Vincular o desvincular mis fichas guardadas en este dispositivo
                    </div>
                    <div className="flex flex-wrap gap-3 text-sm">
                      {characters.filter((c) => !c.isTemplate).map((c) => {
                        const checked = camp.characterIds.includes(c.id) || c.campaignId === camp.id
                        return (
                          <label key={c.id} className="flex items-center gap-1.5 rounded border border-white/10 px-2.5 py-1 hover:border-holo/40">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => assign(c.id, e.target.checked)}
                            />
                            <span>{displayName(c)}</span>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {tab === 'participantes' && (
              <CampaignParticipantsAndRoles
                campaignId={camp.id}
                isMaster={isCampaignMaster}
                participants={participantsForCamp}
                roles={rolesForCamp}
                memberRoles={memberRolesForCamp}
              />
            )}

            {tab === 'misiones' && <Missions camp={camp} chars={characters} gm={isCampaignMaster} onChange={(missions) => upd({ missions })} />}

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

            {tab === 'general' && (
              <div className="space-y-3">
                <Field label="Nombre de la campaña"><Text value={camp.name} onChange={(v) => upd({ name: v })} disabled={!isCampaignMaster} /></Field>
                <Field label="Descripción"><Text area value={camp.description} onChange={(v) => upd({ description: v })} disabled={!isCampaignMaster} /></Field>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  Código de invitación: <b className="font-display tracking-[0.3em] text-gold">{camp.inviteCode}</b>
                  {isCampaignMaster && (
                    <Btn
                      tone="ghost"
                      onClick={async () => {
                        if (supabase && session && onlineMembership) {
                          const { error } = await regenerateOnlineInvite(camp.id)
                          if (error) return toast(authError(error), 'danger')
                          await refresh()
                          toast('Nuevo código generado', 'ok')
                        } else {
                          upd({ inviteCode: inviteCode() })
                        }
                      }}
                    >
                      Regenerar código
                    </Btn>
                  )}
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={camp.paused} disabled={!isCampaignMaster} onChange={(e) => upd({ paused: e.target.checked })} /> Sesión pausada
                </label>
                {isCampaignMaster && (
                  <Btn
                    tone="doom"
                    onClick={async () => {
                      if (!confirmAction(`¿Eliminar la campaña "${camp.name}"?`)) return
                      if (supabase && session && onlineMembership) {
                        await supabase.from('campaigns').delete().eq('id', camp.id)
                        await refresh()
                      }
                      deleteCampaign(camp.id)
                      setSel(null)
                    }}
                  >
                    Eliminar campaña
                  </Btn>
                )}
              </div>
            )}
          </div>
        </Panel>
      )}
    </div>
  )
}

function CampaignParticipantsAndRoles({
  campaignId,
  isMaster,
  participants,
  roles,
  memberRoles,
}: {
  campaignId: string
  isMaster: boolean
  participants: { campaign_id: string; user_id: string; role: 'gm' | 'player'; joined_at: string }[]
  roles: CampaignRole[]
  memberRoles: { campaign_id: string; user_id: string; role_id: string }[]
}) {
  const { session, users, refresh } = useOnline()
  const toast = useStore((s) => s.toast)
  const [roleName, setRoleName] = useState('')
  const [roleColor, setRoleColor] = useState('#5DEEFF')
  const [roleDesc, setRoleDesc] = useState('')
  const [canEditCamp, setCanEditCamp] = useState(false)
  const [canManageChars, setCanManageChars] = useState(false)

  async function handleCreateRole(e: React.FormEvent) {
    e.preventDefault()
    if (!supabase || !session) return toast('Inicia sesión para crear roles online en la campaña', 'warn')
    if (!roleName.trim()) return
    const { error } = await supabase.from('campaign_roles').insert({
      campaign_id: campaignId,
      name: roleName.trim(),
      color: roleColor,
      description: roleDesc.trim(),
      can_edit_campaign: canEditCamp,
      can_manage_characters: canManageChars,
    })
    if (error) return toast(authError(error), 'danger')
    setRoleName('')
    setRoleDesc('')
    setCanEditCamp(false)
    setCanManageChars(false)
    toast('Rol de campaña creado', 'ok')
    await refresh()
  }

  async function handleDeleteRole(roleId: string, name: string) {
    if (!supabase || !confirmAction(`¿Eliminar el rol "${name}" de esta campaña?`)) return
    const { error } = await supabase.from('campaign_roles').delete().eq('id', roleId)
    if (error) return toast(authError(error), 'danger')
    toast('Rol eliminado', 'ok')
    await refresh()
  }

  async function toggleParticipantRole(userId: string, roleId: string, currentlyHas: boolean) {
    if (!supabase) return
    const q = currentlyHas
      ? supabase.from('campaign_member_roles').delete().eq('campaign_id', campaignId).eq('user_id', userId).eq('role_id', roleId)
      : supabase.from('campaign_member_roles').insert({ campaign_id: campaignId, user_id: userId, role_id: roleId })
    const { error } = await q
    if (error) return toast(authError(error), 'danger')
    toast(currentlyHas ? 'Rol retirado del participante' : 'Rol asignado al participante', 'ok')
    await refresh()
  }

  async function toggleBaseGmRole(userId: string, currentRole: 'gm' | 'player') {
    if (!supabase) return
    const nextRole = currentRole === 'gm' ? 'player' : 'gm'
    const { error } = await supabase
      .from('campaign_members')
      .update({ role: nextRole })
      .eq('campaign_id', campaignId)
      .eq('user_id', userId)
    if (error) return toast(authError(error), 'danger')
    toast(nextRole === 'gm' ? 'Participante ascendido a Co-Master' : 'Participante cambiado a Jugador', 'ok')
    await refresh()
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
      <div className="space-y-3">
        <h3 className="font-display text-xs tracking-wider text-holo uppercase">
          Participantes de la campaña ({participants.length})
        </h3>
        {!session && (
          <p className="text-xs text-ink/60">
            Inicia sesión y crea la campaña en modo online para que otros jugadores se unan con tu código y puedas asignarles roles.
          </p>
        )}
        {participants.length === 0 && session && (
          <Empty>Comparte el código de invitación para que tus jugadores se unan a la campaña.</Empty>
        )}
        <ul className="divide-y divide-white/10 rounded-lg border border-white/10 bg-black/20 p-3">
          {participants.map((p) => {
            const u = users.find((x) => x.id === p.user_id)
            const assignedRoleIds = new Set(memberRoles.filter((mr) => mr.user_id === p.user_id).map((mr) => mr.role_id))
            const assignedRoles = roles.filter((r) => assignedRoleIds.has(r.id))

            return (
              <li key={p.user_id} className="py-2.5 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-medium text-ink">{u?.display_name ?? 'Jugador'}</span>
                    <span className={`ml-2 rounded px-1.5 py-0.5 text-[10px] ${p.role === 'gm' ? 'bg-energy/20 text-energy' : 'bg-holo/20 text-holo'}`}>
                      {p.role === 'gm' ? 'Master' : 'Jugador'}
                    </span>
                    {u?.email && <p className="text-xs text-ink/45">{u.email}</p>}
                  </div>
                  {isMaster && p.user_id !== session?.user.id && (
                    <Btn tone="ghost" onClick={() => toggleBaseGmRole(p.user_id, p.role)}>
                      {p.role === 'gm' ? 'Pasar a Jugador' : 'Hacer Co-Master'}
                    </Btn>
                  )}
                </div>

                {/* Asignación de roles de campaña a este participante */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] text-ink/45">Roles en la campaña:</span>
                  {isMaster ? (
                    roles.length === 0 ? (
                      <span className="text-xs text-ink/40">Crea un rol en el panel derecho para asignarlo aquí.</span>
                    ) : (
                      roles.map((r) => {
                        const has = assignedRoleIds.has(r.id)
                        return (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => toggleParticipantRole(p.user_id, r.id, has)}
                            className={`rounded-md border px-2 py-0.5 text-xs transition ${
                              has ? 'font-medium' : 'border-white/15 text-ink/45 hover:text-ink/80'
                            }`}
                            style={has ? { borderColor: r.color, color: r.color, backgroundColor: `${r.color}1a` } : undefined}
                          >
                            {has ? '✓ ' : '+ '}{r.name}
                          </button>
                        )
                      })
                    )
                  ) : assignedRoles.length > 0 ? (
                    assignedRoles.map((r) => (
                      <span
                        key={r.id}
                        className="rounded-md border px-2 py-0.5 text-xs"
                        style={{ borderColor: r.color, color: r.color, backgroundColor: `${r.color}18` }}
                      >
                        {r.name}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-ink/40">Sin roles especiales</span>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      </div>

      <div className="space-y-3">
        <h3 className="font-display text-xs tracking-wider text-holo uppercase">
          Roles de la campaña ({roles.length})
        </h3>
        {isMaster ? (
          <form onSubmit={handleCreateRole} className="rounded-lg border border-white/10 bg-black/25 p-3 space-y-2.5">
            <p className="text-xs text-ink/70">
              Como Master, puedes crear roles para los participantes de esta campaña (ej. <em>Capitán, Vanguardia, Portador del Orbe, Sub-Master, Facción A</em>).
            </p>
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <Field label="Nombre del rol">
                <Text value={roleName} onChange={setRoleName} placeholder="Ej. Vanguardia / Co-Master…" />
              </Field>
              <Field label="Color">
                <input
                  type="color"
                  value={roleColor}
                  onChange={(e) => setRoleColor(e.target.value)}
                  className="h-10 w-14 cursor-pointer rounded border border-white/15 bg-black/40 p-1"
                />
              </Field>
            </div>
            <Field label="Descripción o privilegios en la partida">
              <Text value={roleDesc} onChange={setRoleDesc} placeholder="Notas o función dentro de la campaña" />
            </Field>
            <div className="space-y-1 text-xs text-ink/80">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={canEditCamp} onChange={(e) => setCanEditCamp(e.target.checked)} />
                <span>Puede editar el diario y escenarios de la campaña</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={canManageChars} onChange={(e) => setCanManageChars(e.target.checked)} />
                <span>Puede revisar y gestionar fichas de la campaña</span>
              </label>
            </div>
            <Btn type="submit" tone="gold" disabled={!roleName.trim()} className="w-full">
              + Crear rol para esta campaña
            </Btn>
          </form>
        ) : (
          <p className="text-xs text-ink/60">El Master de la campaña puede crear y asignar roles a cada participante.</p>
        )}

        {roles.length > 0 && (
          <ul className="divide-y divide-white/10 rounded-lg border border-white/10 bg-black/20 p-3">
            {roles.map((r) => (
              <li key={r.id} className="py-2 flex items-start justify-between gap-2">
                <div>
                  <span
                    className="inline-block rounded border px-2 py-0.5 text-xs font-medium"
                    style={{ borderColor: r.color, color: r.color, backgroundColor: `${r.color}18` }}
                  >
                    {r.name}
                  </span>
                  {r.description && <p className="mt-1 text-xs text-ink/70">{r.description}</p>}
                  <div className="mt-1 flex flex-wrap gap-1 text-[10px] text-ink/50">
                    {r.can_edit_campaign && <span>· Edita diario/escenarios</span>}
                    {r.can_manage_characters && <span>· Gestiona fichas</span>}
                  </div>
                </div>
                {isMaster && (
                  <Btn tone="doom" onClick={() => handleDeleteRole(r.id, r.name)}>Eliminar</Btn>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
