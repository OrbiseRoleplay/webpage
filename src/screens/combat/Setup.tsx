import { useState } from 'react'
import { displayName } from '../../domain/character'
import { useStore } from '../../store/useStore'
import { Btn, Empty, Panel } from '../../ui/kit'

/** Preparación: elegir participantes y ordenar turnos. */
export function Setup() {
  const characters = useStore((s) => s.characters).filter((c) => !c.isTemplate)
  const { setCombat, toast } = useStore()
  const [ids, setIds] = useState<string[]>([])
  const move = (i: number, d: number) => {
    const n = [...ids]; const j = i + d
    if (j < 0 || j >= n.length) return
    ;[n[i], n[j]] = [n[j], n[i]]
    setIds(n)
  }
  const name = (id: string) => displayName(characters.find((c) => c.id === id)!)
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Panel title="Participantes">
        {characters.length === 0 && <Empty>No hay personajes. Crea alguno en Personajes o Game Master.</Empty>}
        <ul className="space-y-1">
          {characters.map((c) => (
            <li key={c.id}>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input type="checkbox" checked={ids.includes(c.id)}
                  onChange={(e) => setIds(e.target.checked ? [...ids, c.id] : ids.filter((x) => x !== c.id))} />
                {displayName(c)} <span className="text-xs text-ink/50">({c.kind})</span>
              </label>
            </li>
          ))}
        </ul>
      </Panel>
      <Panel title="Orden de turnos" actions={
        <Btn tone="gold" disabled={ids.length < 2} onClick={() => {
          setCombat({ active: true, round: 1, participantIds: ids, turnIndex: 0, log: [] })
          toast('Combate iniciado', 'gold')
        }}>Iniciar combate</Btn>}>
        {ids.length === 0 && <Empty>Marca al menos 2 participantes.</Empty>}
        <ol className="space-y-1">
          {ids.map((id, i) => (
            <li key={id} className="flex items-center gap-2 text-sm">
              <span className="w-5 text-ink/50">{i + 1}.</span><span className="flex-1">{name(id)}</span>
              <Btn tone="ghost" onClick={() => move(i, -1)} aria-label="Subir">▲</Btn>
              <Btn tone="ghost" onClick={() => move(i, 1)} aria-label="Bajar">▼</Btn>
            </li>
          ))}
        </ol>
      </Panel>
    </div>
  )
}
