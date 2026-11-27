import { Counter, Empty, Panel } from '../../ui/kit'
import type { TabProps } from './CharacterEditor'

const KIND_LABEL: Record<string, string> = {
  experiencia: 'Experiencia', nivel: 'Nivel', puntos: 'Puntos de atributo', coins: 'COINS', habilidad: 'Habilidad', tecnica: 'Técnica',
  objeto: 'Objeto', propiedad: 'Propiedad', titulo: 'Título', reputacion: 'Reputación', desbloqueo: 'Desbloqueo',
}

export function ProgressTab({ c }: TabProps) {
  return (
    <div className="space-y-3">
      <Panel title="Progresión">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div><p className="text-xs text-holo/70 uppercase">Nivel</p><p className="font-display text-3xl text-glow"><Counter value={c.identity.level} /></p></div>
          <div><p className="text-xs text-holo/70 uppercase">Experiencia</p><p className="font-display text-3xl"><Counter value={c.identity.experience} /></p></div>
          <div><p className="text-xs text-holo/70 uppercase">Títulos</p><p className="font-display text-3xl text-gold"><Counter value={c.identity.titles.length} /></p></div>
        </div>
        <p className="mt-3 text-[11px] text-ink/50">La progresión la controla el Game Master. No hay experiencia fija para subir de nivel. Las recompensas se entregan desde el panel GM.</p>
      </Panel>
      <Panel title={`Recompensas recibidas (${c.rewards.length})`}>
        {!c.rewards.length && <Empty>Aún sin recompensas.</Empty>}
        <ol className="relative space-y-2 border-l border-holo/20 pl-4">
          {[...c.rewards].reverse().map((r) => (
            <li key={r.id} className="relative">
              <span className="absolute top-1.5 -left-[21px] h-2.5 w-2.5 rounded-full bg-gold shadow-[0_0_8px_#FFD66B]" />
              <p className="text-sm"><b className="text-gold">{KIND_LABEL[r.kind]}</b>{r.amount ? ` +${r.amount}` : ''} {r.description && `— ${r.description}`}</p>
              <p className="text-[11px] text-ink/50">{new Date(r.date).toLocaleString('es')} · Origen: {r.source}</p>
            </li>
          ))}
        </ol>
      </Panel>
      <Panel title="Historial de modificaciones">
        {!c.history.length && <Empty>Sin cambios registrados.</Empty>}
        <ul className="max-h-64 space-y-1 overflow-auto text-xs">
          {[...c.history].reverse().map((h, i) => <li key={i} className="text-ink/60"><span className="text-ink/40">{new Date(h.date).toLocaleString('es')}</span> · <b>{h.by}</b> · {h.change}</li>)}
        </ul>
      </Panel>
    </div>
  )
}
