import { useStore, DEFAULT_SETTINGS, type Settings } from '../store/useStore'
import { Btn, Field, Panel, confirmAction } from '../ui/kit'
import { sfx } from '../sfx/audio'

const VOL: { k: keyof Settings['volume']; label: string; test: () => void }[] = [
  { k: 'master', label: 'General', test: sfx.click }, { k: 'ui', label: 'Interfaz', test: sfx.open },
  { k: 'dados', label: 'Dados', test: sfx.diceLand }, { k: 'combate', label: 'Combate', test: sfx.hit },
  { k: 'notificaciones', label: 'Notificaciones', test: sfx.notify }, { k: 'ambiente', label: 'Ambiente', test: sfx.hover },
]

export function SettingsScreen() {
  const { settings: s, setSettings } = useStore()
  const toggle = (k: 'reducedMotion' | 'noFlashes' | 'quickRoll' | 'haptics', label: string) => (
    <label className="flex items-center justify-between gap-3 py-1.5 text-sm">
      {label}<input type="checkbox" className="h-5 w-5 accent-[#5DEEFF]" checked={s[k]} onChange={(e) => setSettings({ [k]: e.target.checked })} />
    </label>
  )
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Panel title="Visuales y accesibilidad">
        <Field label={`Intensidad visual (${Math.round(s.visualIntensity * 100)}%)`}>
          <input type="range" min={0} max={1} step={0.05} value={s.visualIntensity} className="w-full accent-[#5DEEFF]" onChange={(e) => setSettings({ visualIntensity: Number(e.target.value) })} />
        </Field>
        {toggle('reducedMotion', 'Reducir movimiento')}
        {toggle('noFlashes', 'Desactivar destellos')}
        {toggle('quickRoll', 'Tirada rápida de dados')}
        {toggle('haptics', 'Vibración en dispositivos compatibles')}
      </Panel>
      <Panel title="Volumen">
        {VOL.map(({ k, label, test }) => (
          <Field key={k} label={`${label} (${Math.round(s.volume[k] * 100)}%)`}>
            <div className="flex items-center gap-2">
              <input type="range" min={0} max={1} step={0.05} value={s.volume[k]} className="w-full accent-[#A56BFF]" onChange={(e) => setSettings({ volume: { ...s.volume, [k]: Number(e.target.value) } })} />
              <Btn tone="ghost" onClick={test} aria-label={`Probar ${label}`}>▶</Btn>
            </div>
          </Field>
        ))}
      </Panel>
      <Panel title="Restablecer">
        <Btn tone="doom" onClick={() => confirmAction('¿Restablecer ajustes por defecto?') && setSettings(DEFAULT_SETTINGS)}>Ajustes por defecto</Btn>
        <p className="mt-2 text-[11px] text-ink/50">Las copias de seguridad completas están en Ficha → Exportar. Los datos se guardan automáticamente en este dispositivo (IndexedDB).</p>
      </Panel>
    </div>
  )
}
