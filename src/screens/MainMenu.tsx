import { motion } from 'motion/react'
import { useStore, type Screen } from '../store/useStore'
import { Orb } from '../ui/Orb'
import { useOnline } from '../online/supabase'
import { sfx } from '../sfx/audio'

type Entry = { label: string; screen: Screen; hint: string; create?: boolean }

export function MainMenu() {
  const { go, createCharacter, edit, characters, campaigns } = useStore()
  const profile = useOnline((s) => s.profile)
  const pjs = characters.filter((c) => c.kind === 'pj').length

  const groups: { title: string; items: Entry[] }[] = [
    { title: 'Jugar', items: [
      { label: 'Crear personaje', screen: 'editor', hint: 'Un FAERIT nuevo, con su Don y 25 puntos por repartir', create: true },
      { label: 'Mis personajes', screen: 'personajes', hint: pjs ? `${pjs} ${pjs === 1 ? 'ficha guardada' : 'fichas guardadas'}` : 'Todavía no tienes fichas' },
      { label: 'Dados', screen: 'dados', hint: 'D6, D20 y D60' },
    ] },
    { title: 'Dirigir', items: [
      { label: 'Campañas', screen: 'campanas', hint: campaigns.length ? `${campaigns.length} en curso` : 'Misiones, diario y escenarios' },
      { label: 'Game Master', screen: 'gm', hint: 'Aprobar fichas, combates y recompensas' },
    ] },
    { title: 'Consultar', items: [
      { label: 'Enciclopedia', screen: 'enciclopedia', hint: 'El universo ORBISE' },
      { label: 'Reglamento', screen: 'reglamento', hint: 'Atributos, dados y combate' },
    ] },
  ]

  const open = (it: Entry) => { sfx.open(); if (it.create) edit(createCharacter().id); else go(it.screen) }

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
        <p className="mt-4 text-xs text-ink/35">Funciona sin conexión. Tus fichas se guardan en este dispositivo.</p>
      </motion.nav>
    </div>
  )
}
