import { useCallback, useEffect, useState } from 'react'
import { Btn, Empty, Field, Panel, Text } from '../ui/kit'
import { Die3D } from '../dice3d/Die3D'
import { OUTCOME_TEXT, roll, type RollResult } from '../domain/dice'
import { RULES, type DieSides } from '../rules/config'
import { useStore } from '../store/useStore'

const COLORS = ['#5DEEFF', '#4285FF', '#A56BFF', '#4EE8A0', '#E8F7FF']
const tone = { catastrofico: 'border-doom/60 text-doom bg-doom/10', extraordinario: 'border-gold/60 text-gold bg-gold/10', ordinario: 'border-white/10 text-ink/80' }

export function DiceScreen() {
  const { rolls, addRoll, settings, setSettings, gmMode } = useStore()
  const [sides, setSides] = useState<DieSides>(RULES.defaultDie)
  const [label, setLabel] = useState('')
  const [secret, setSecret] = useState(false)
  const [current, setCurrent] = useState<RollResult | null>(null)
  const [busy, setBusy] = useState(false)

  const launch = useCallback(() => {
    if (busy) return
    setBusy(true)
    setCurrent(roll(sides, label.trim() || undefined, gmMode && secret))
  }, [busy, sides, label, gmMode, secret])

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || (e.target as HTMLElement).closest('input,textarea,select,button')) return
      e.preventDefault()
      launch()
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [launch])

  const history = rolls.filter((r) => !r.secret || gmMode).slice(0, 40)

  return (
    <div className="mx-auto grid max-w-5xl gap-4 p-3 lg:grid-cols-[1fr_20rem]">
      <Panel title="Dados">
        <div className="flex flex-col items-center gap-10 pb-10">
          <Die3D sides={sides} result={current} size={260} onSettled={(r) => { addRoll(r); setBusy(false) }} />
          <Btn tone="gold" className="px-8 py-3 text-sm" disabled={busy} onClick={launch}>Lanzar</Btn>
        </div>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          <div className="flex gap-2 sm:col-span-2" role="group" aria-label="Tipo de dado">
            {RULES.dice.map((d) => (
              <Btn key={d} tone={d === sides ? 'holo' : 'ghost'} aria-pressed={d === sides} disabled={busy} className="flex-1" onClick={() => setSides(d)}>D{d}</Btn>
            ))}
          </div>
          <Field label="Etiqueta (opcional)"><Text value={label} onChange={setLabel} placeholder="Ej.: Ataque con espada" /></Field>
          <Field label="Color del dado">
            <div className="flex items-center gap-2">
              {COLORS.map((c) => (
                <button key={c} aria-label={`Color ${c}`} aria-pressed={settings.diceColor === c} onClick={() => setSettings({ diceColor: c })}
                  className="h-7 w-7 rounded-full border-2" style={{ background: c, borderColor: settings.diceColor === c ? '#fff' : 'transparent' }} />
              ))}
              <input type="color" aria-label="Color personalizado" value={settings.diceColor} onChange={(e) => setSettings({ diceColor: e.target.value })} className="h-7 w-9 bg-transparent" />
            </div>
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={settings.quickRoll} onChange={(e) => setSettings({ quickRoll: e.target.checked })} /> Tirada rápida
          </label>
          {gmMode && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={secret} onChange={(e) => setSecret(e.target.checked)} /> Tirada secreta (solo GM)
            </label>
          )}
        </div>
        <p className="mt-3 text-xs text-ink/50">Atajo: barra espaciadora.</p>
      </Panel>

      <Panel title="Historial">
        {history.length === 0 ? <Empty>Aún no hay tiradas.</Empty> : (
          <ul className="flex max-h-[28rem] flex-col gap-2 overflow-auto">
            {history.map((r) => (
              <li key={r.id} className={`rounded-lg border px-3 py-2 text-sm ${tone[r.outcome]}`}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-display text-lg">{r.value}<span className="text-xs opacity-60"> / D{r.sides}</span></span>
                  <span className="text-[10px] opacity-60">{new Date(r.at).toLocaleTimeString()}</span>
                </div>
                {(r.label || r.secret || r.outcome !== 'ordinario') && (
                  <div className="text-xs">
                    {r.secret && '🔒 '}{r.label}{r.label && r.outcome !== 'ordinario' && ' · '}{r.outcome !== 'ordinario' && OUTCOME_TEXT[r.outcome]}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  )
}
