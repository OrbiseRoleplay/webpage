import { motion } from 'motion/react'
import { useState } from 'react'
import { useStore } from '../store/useStore'
import { Btn, Empty, Panel, confirmAction } from '../ui/kit'
import { displayName, mainImage } from '../domain/character'
import { parseOrbise } from '../io/orbise'
import { pickFiles } from '../io/images'

export function CharacterList() {
  const { characters, createCharacter, edit, duplicate, deleteCharacter, importCharacter, toast, gmMode } = useStore()
  const [q, setQ] = useState('')
  const list = characters.filter((c) => c.kind === 'pj' || gmMode).filter((c) => displayName(c).toLowerCase().includes(q.toLowerCase()))

  async function doImport() {
    for (const f of await pickFiles('.orbise,.json,application/json')) {
      try { importCharacter(parseOrbise(await f.text())); toast(`Importado: ${f.name}`, 'ok') }
      catch (e: any) { toast(`${f.name}: ${e.message}`, 'danger') }
    }
  }

  return (
    <Panel title={`Personajes (${list.length})`} actions={<>
      <input className="holo-input !w-40" placeholder="Buscar…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar personaje" />
      <Btn tone="ghost" onClick={doImport}>Importar</Btn>
      <Btn tone="good" onClick={() => edit(createCharacter().id)}>+ Crear</Btn>
    </>}>
      {!list.length && <Empty>Aún no hay personajes. Crea tu primer FAERIT.</Empty>}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((c, i) => {
          const img = mainImage(c)
          return (
            <motion.article key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              className="holo-panel flex gap-3 overflow-hidden p-3">
              <button onClick={() => edit(c.id)} className="relative h-24 w-20 shrink-0 overflow-hidden rounded-lg border border-holo/30 bg-black/40" aria-label={`Abrir ${displayName(c)}`}>
                {img ? <img src={img} alt="" className="h-full w-full object-cover" /> : <span className="grid h-full place-items-center text-2xl text-holo/40">◎</span>}
                <span className="scan-sweep" />
              </button>
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-display text-sm tracking-wider text-ink">{displayName(c)}</h3>
                <p className="truncate text-xs text-ink/60">{c.identity.alias && `«${c.identity.alias}» · `}{c.identity.society} · Nv {c.identity.level}</p>
                <p className="mt-1 text-xs">
                  {c.gift.name ? <span className="text-energy">{c.gift.name}</span> : <span className="text-ink/40">Sin don</span>}
                  {c.gift.giftClass && <span className={`ml-2 font-display ${c.gift.giftClass === 'OMEGA' ? 'text-gold' : 'text-holo'}`}>[{c.gift.giftClass}]</span>}
                </p>
                <p className="mt-1 text-[10px] tracking-widest uppercase">
                  {c.kind !== 'pj' && <span className="mr-2 text-doom">{c.kind}</span>}
                  {c.approved ? <span className="text-good">✓ Aprobada</span> : <span className="text-gold/70">Pendiente de aprobación</span>}
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  <Btn onClick={() => edit(c.id)}>Editar</Btn>
                  <Btn tone="ghost" onClick={() => { duplicate(c.id); toast('Personaje duplicado', 'ok') }}>Duplicar</Btn>
                  <Btn tone="doom" onClick={() => confirmAction(`¿Eliminar a ${displayName(c)}? No se puede deshacer.`) && deleteCharacter(c.id)}>Eliminar</Btn>
                </div>
              </div>
            </motion.article>
          )
        })}
      </div>
    </Panel>
  )
}
