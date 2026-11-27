import { motion } from 'motion/react'
import { useState } from 'react'
import { useStore, type Screen } from '../store/useStore'
import { Orb } from '../ui/Orb'
import { Btn } from '../ui/kit'
import { authError, joinOnlineCampaign, openCampaignProfile, useOnline } from '../online/supabase'
import { sfx } from '../sfx/audio'

type Entry = { label: string; screen: Screen; hint: string; create?: boolean }

export function MainMenu() {
  const { go, createCharacter, edit, characters, campaigns, toast } = useStore()
  const { session, profile, memberships, refresh } = useOnline()
  const [inviteCode, setInviteCode] = useState('')
  const [joining, setJoining] = useState(false)
  const pjs = characters.filter((c) => c.kind === 'pj').length
  const totalCampaigns = Math.max(campaigns.length, memberships.length)

  const groups: { title: string; items: Entry[] }[] = [
    { title: 'Jugar', items: [
      { label: 'Crear personaje', screen: 'editor', hint: 'Un FAERIT nuevo, con su Don y 25 puntos por repartir', create: true },
      { label: 'Mis personajes', screen: 'personajes', hint: pjs ? `${pjs} ${pjs === 1 ? 'ficha guardada' : 'fichas guardadas'}` : 'Todavía no tienes fichas' },
      { label: 'Dados', screen: 'dados', hint: 'D6, D20 y D60' },
    ] },
    { title: 'Dirigir y Campañas', items: [
      { label: 'Campañas', screen: 'campanas', hint: totalCampaigns ? `${totalCampaigns} en curso · Fichas, roles y diario` : 'Unirse, gestionar fichas, roles y misiones' },
      { label: 'Game Master', screen: 'gm', hint: 'Aprobar fichas, combates y recompensas' },
    ] },
    { title: 'Consultar', items: [
      { label: 'Enciclopedia', screen: 'enciclopedia', hint: 'El universo ORBISE' },
      { label: 'Reglamento', screen: 'reglamento', hint: 'Atributos, dados y combate' },
    ] },
  ]

  const open = (it: Entry) => { sfx.open(); if (it.create) edit(createCharacter().id); else go(it.screen) }

  async function handleQuickJoin(e: React.FormEvent) {
    e.preventDefault()
    const clean = inviteCode.trim().toUpperCase()
    if (!clean) return
    if (!session) {
      toast('Inicia sesión primero para unirte con un código online', 'warn')
      go('cuenta')
      return
    }
    setJoining(true)
    const { campaignId, error } = await joinOnlineCampaign(clean)
    setJoining(false)
    if (error) {
      toast(authError(error), 'danger')
      return
    }
    setInviteCode('')
    toast('¡Te has unido a la campaña!', 'ok')
    await refresh()
    if (campaignId) openCampaignProfile(campaignId)
    else go('campanas')
  }

  return (
    <div className="grid min-h-[calc(100dvh-2.5rem)] items-center gap-6 lg:grid-cols-[1.15fr_1fr]">
      <div className="flex flex-col items-center lg:items-start">
        {/* Lienzo cuadrado: el orbe y su anillo caben siempre, sea cual sea la proporción de la pantalla */}
        <Orb className="aspect-square w-full max-w-[min(100%,46vh)] lg:max-w-[min(100%,74vh)]" />
        <motion.div className="pointer-events-none -mt-[12%] text-center lg:text-left"
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.1, duration: 0.9, ease: 'easeOut' }}>
          <h1 className="orbise-wordmark">ORBISE</h1>
          <p className="mt-2 pl-1 text-lg text-ink/70">Mesa de rol del universo ORBISE</p>
        </motion.div>
      </div>

      <motion.nav aria-label="Menú principal" className="pb-6 lg:pb-0"
        initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.4, duration: 0.6 }}>

        {/* Acceso rápido desde el inicio: unirse a campaña por código o abrir campañas activas */}
        <section className="mb-6 rounded-xl border border-holo/30 bg-black/35 p-3.5 backdrop-blur">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="font-display text-xs tracking-wider text-holo uppercase">Unirse a una campaña</h2>
            {session ? (
              <span className="text-[11px] text-good">● {profile?.display_name ?? 'Conectado'}</span>
            ) : (
              <button onClick={() => go('cuenta')} className="text-[11px] text-gold hover:underline">Inicia sesión para unirte →</button>
            )}
          </div>
          <form onSubmit={handleQuickJoin} className="flex gap-2">
            <input
              className="holo-input font-mono tracking-widest uppercase text-sm"
              value={inviteCode}
              maxLength={8}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="CÓDIGO (ej. K7Q2M9XA)"
              aria-label="Código de invitación de campaña"
            />
            <Btn type="submit" tone="gold" disabled={joining || inviteCode.trim().length < 4}>
              {joining ? 'Uniendo…' : 'Unirme'}
            </Btn>
          </form>

          {memberships.length > 0 && (
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5 pt-2 border-t border-white/10">
              <span className="text-[11px] text-ink/50">Tus campañas:</span>
              {memberships.map((m) => (
                <button
                  key={m.campaign.id}
                  type="button"
                  onClick={() => { sfx.open(); openCampaignProfile(m.campaign.id) }}
                  className="rounded-md border border-holo/40 bg-holo/10 px-2 py-0.5 text-xs text-holo hover:bg-holo/20 transition"
                >
                  {m.campaign.name} <span className="text-[10px] text-ink/60">({m.role === 'gm' ? 'Master' : 'Jugador'})</span>
                </button>
              ))}
            </div>
          )}
        </section>

        {groups.map((g) => (
          <section key={g.title} className="mb-7">
            <h2 className="mb-2 font-display text-sm text-energy/80">{g.title}</h2>
            <ul>
              {g.items.map((it) => (
                <li key={it.label}>
                  <button onClick={() => open(it)} onMouseEnter={sfx.hover}
                    className={`menu-entry group ${it.create ? 'menu-entry--primary' : ''}`}>
                    <span className="menu-shard" aria-hidden />
                    <span className="block font-display text-2xl leading-tight sm:text-3xl">{it.label}</span>
                    <span className="mt-0.5 block text-sm text-ink/55 group-hover:text-ink/80">{it.hint}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
        <div className="flex gap-5 text-sm">
          <button onClick={() => { sfx.click(); go('cuenta') }} className="text-holo underline-offset-4 hover:underline">
            {profile ? `Cuenta: ${profile.display_name}` : 'Iniciar sesión'}
          </button>
          <button onClick={() => { sfx.click(); go('config') }} className="text-ink/50 underline-offset-4 hover:text-holo hover:underline">Configuración</button>
        </div>
        <p className="mt-4 text-xs text-ink/35">Funciona con y sin conexión. Tus fichas se guardan en este dispositivo y en tus campañas.</p>
      </motion.nav>
    </div>
  )
}
