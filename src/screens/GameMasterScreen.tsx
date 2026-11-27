import { useState } from 'react'
import { RULES, type DieSides } from '../rules/config'
import { displayName, newCharacter, now, uid } from '../domain/character'
import { OUTCOME_TEXT, roll, type RollResult } from '../domain/dice'
import { canUseGmTools, useOnline } from '../online/supabase'
import { useStore } from '../store/useStore'
import { Btn, Empty, Panel } from '../ui/kit'
import { CharacterGM } from './gm/CharacterGM'
import { Narration } from './gm/Narration'

export function GameMasterScreen() {
  const { gmMode, setGm, characters, createCharacter, importCharacter, undoLast, addRoll, go } = useStore()
  const { session, profile, roles, userRoles, memberships } = useOnline()
  const hasOnlineGmRole = canUseGmTools(profile, roles, userRoles, memberships)
  const [sel, setSel] = useState<string | null>(null)
  const [sides, setSides] = useState<DieSides>(RULES.defaultDie)
  const [secret, setSecret] = useState<RollResult | null>(null)
  const current = characters.find((c) => c.id === sel)
  const templates = characters.filter((c) => c.isTemplate)

  const make = (kind: 'npc' | 'enemigo') => {
    const c = createCharacter({ kind, identity: { ...newCharacter().identity, firstName: kind === 'npc' ? 'Nuevo NPC' : 'Nuevo enemigo' } })
    setSel(c.id)
  }
  const instantiate = (id: string) => {
    const t = characters.find((c) => c.id === id)!
    const c = { ...structuredClone(t), id: uid(), isTemplate: false, createdAt: now(), updatedAt: now(), history: [], identity: { ...t.identity, firstName: `${t.identity.firstName} (instancia)`.trim() } }
    importCharacter(c)
    setSel(c.id)
  }

  return (
    <div className="space-y-4">
      <Panel title="Modo Game Master">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={gmMode} onChange={(e) => setGm(e.target.checked)} /> Activar modo GM
          </label>
          {session && (
            <span className={`rounded border px-2 py-0.5 text-xs ${hasOnlineGmRole ? 'border-good/50 bg-good/10 text-good' : 'border-white/15 text-ink/60'}`}>
              {hasOnlineGmRole ? `✓ Permiso online verificado (${profile?.display_name})` : 'Rol online: Jugador'}
            </span>
          )}
        </div>
        {!session && (
          <p className="mt-2 rounded border border-gold/40 bg-gold/10 p-2 text-xs text-gold">
            Modo sin cuenta: este interruptor activa las herramientas de GM en este dispositivo. Inicia sesión en Cuenta para usar permisos online (Admin / Master).
          </p>
        )}
      </Panel>

      {gmMode && (
        <>
          <Panel title="Herramientas" actions={<>
            <Btn tone="doom" onClick={() => go('combate')}>⚔ Combate</Btn>
            <Btn onClick={() => make('npc')}>Crear NPC</Btn>
            <Btn onClick={() => make('enemigo')}>Crear enemigo</Btn>
            <Btn tone="ghost" onClick={undoLast}>Deshacer</Btn>
          </>}>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span>Tirada secreta:</span>
              <select className="holo-input !w-auto" value={sides} onChange={(e) => setSides(Number(e.target.value) as DieSides)}>
                {RULES.dice.map((d) => <option key={d} value={d}>D{d}</option>)}
              </select>
              <Btn tone="energy" onClick={() => { const r = roll(sides, 'Secreta (GM)', true); addRoll(r); setSecret(r) }}>Tirar en secreto</Btn>
              {secret && <span>D{secret.sides}: <b className="font-display text-lg">{secret.value}</b> {secret.outcome !== 'ordinario' && <span className={secret.outcome === 'catastrofico' ? 'text-doom' : 'text-gold'}>{OUTCOME_TEXT[secret.outcome]}</span>}</span>}
              <Btn tone="holo" onClick={() => go('cuenta')}>Compartir archivos / Roles</Btn>
            </div>
          </Panel>

          <Narration />

          <Panel title="Plantillas">
            {templates.length === 0 ? <Empty>Marca un personaje como plantilla en su panel para reutilizarlo.</Empty> : (
              <ul className="space-y-1 text-sm">
                {templates.map((t) => (
                  <li key={t.id} className="flex items-center gap-2"><span className="flex-1">{displayName(t)} ({t.kind})</span>
                    <Btn onClick={() => instantiate(t.id)}>Instanciar</Btn>
                    <Btn tone="ghost" onClick={() => setSel(t.id)}>Editar</Btn></li>
                ))}
              </ul>
            )}
          </Panel>

          <div className="grid gap-4 md:grid-cols-[240px_1fr]">
            <Panel title="Personajes">
              {characters.length === 0 && <Empty>Sin personajes.</Empty>}
              <ul className="space-y-1">
                {characters.map((c) => (
                  <li key={c.id}>
                    <button onClick={() => setSel(c.id)} className={`w-full rounded border px-2 py-1 text-left text-sm ${sel === c.id ? 'border-holo text-holo' : 'border-white/10'}`}>
                      {displayName(c)} <span className="text-xs text-ink/50">{c.kind}{c.isTemplate ? ' · plantilla' : ''}{c.approved ? ' ✓' : ''}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </Panel>
            {current ? <CharacterGM key={current.id} c={current} /> : <Empty>Selecciona un personaje.</Empty>}
          </div>
        </>
      )}
    </div>
  )
}
