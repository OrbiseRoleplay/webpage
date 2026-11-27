import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState, type ComponentType } from 'react'
import { useStore, type Screen } from './store/useStore'
import { Toasts } from './ui/kit'
import { Ambient, SaveIndicator } from './ui/Ambient'
import { Splash } from './screens/Splash'
import { MainMenu } from './screens/MainMenu'
import { CharacterList } from './screens/CharacterList'
import { CharacterEditor } from './screens/editor/CharacterEditor'
import { DiceScreen } from './screens/DiceScreen'
import { CombatScreen } from './screens/CombatScreen'
import { GameMasterScreen } from './screens/GameMasterScreen'
import { CampaignsScreen } from './screens/CampaignsScreen'
import { EncyclopediaScreen } from './screens/EncyclopediaScreen'
import { RulesScreen } from './screens/RulesScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { AccountScreen } from './screens/AccountScreen'
import { sfx } from './sfx/audio'

const SCREENS: Record<Screen, ComponentType> = {
  menu: MainMenu, personajes: CharacterList, editor: CharacterEditor, dados: DiceScreen, combate: CombatScreen,
  gm: GameMasterScreen, campanas: CampaignsScreen, enciclopedia: EncyclopediaScreen, reglamento: RulesScreen, config: SettingsScreen, cuenta: AccountScreen,
}

const TITLES: Record<Screen, string> = {
  menu: '', personajes: 'Mis personajes', editor: 'Ficha de personaje', dados: 'Dados', combate: 'Combate reactivo',
  gm: 'Game Master', campanas: 'Campañas', enciclopedia: 'Enciclopedia', reglamento: 'Reglamento', config: 'Configuración', cuenta: 'Cuenta',
}

const BACK: Partial<Record<Screen, Screen>> = { editor: 'personajes', combate: 'gm' }

export default function App() {
  const { screen, go, loaded, settings, gmMode } = useStore()
  const [splash, setSplash] = useState(true)
  const S = SCREENS[screen]

  useEffect(() => {
    document.documentElement.style.setProperty('--fx', String(settings.noFlashes ? Math.min(settings.visualIntensity, 0.4) : settings.visualIntensity))
    document.documentElement.classList.toggle('no-motion', settings.reducedMotion)
  }, [settings])

  return (
    <div className="relative min-h-full">
      <Ambient />
      <AnimatePresence>{(splash || !loaded) && <Splash onDone={() => setSplash(false)} />}</AnimatePresence>
      {screen !== 'menu' && (
        <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-holo/15 bg-void/80 px-3 py-2 backdrop-blur">
          <button onClick={() => { sfx.click(); go(BACK[screen] ?? 'menu') }} className="font-display text-sm text-holo" aria-label="Volver">
            ◂ {TITLES[BACK[screen] ?? 'menu'] || 'Menú'}
          </button>
          <h1 className="font-display text-base font-medium text-ink">{TITLES[screen]}</h1>
          <div className="ml-auto flex items-center gap-3">
            <SaveIndicator />
            {gmMode && <span className="rounded border border-energy/50 px-2 py-0.5 font-display text-[10px] tracking-widest text-energy">MODO GM</span>}
          </div>
        </header>
      )}
      <AnimatePresence mode="wait">
        <motion.main key={screen} className={`relative z-10 mx-auto p-3 sm:p-5 ${screen === 'menu' ? 'max-w-[1600px] lg:px-12' : 'max-w-6xl'}`}
          initial={{ opacity: 0, scale: 0.985, filter: 'blur(6px)' }} animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0, scale: 1.01, filter: 'blur(6px)' }} transition={{ duration: 0.25 }}>
          <S />
        </motion.main>
      </AnimatePresence>
      <Toasts />
    </div>
  )
}
