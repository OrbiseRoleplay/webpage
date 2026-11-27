import { OUTCOME_TEXT, type RollResult } from '../../domain/dice'
import { Die3D } from '../../dice3d/Die3D'

const OUTCOME_CLS = { catastrofico: 'text-doom', extraordinario: 'text-gold', ordinario: 'text-ink/60' } as const

/** Un dado + valor numérico + crítico destacado (funciona aunque Die3D no pinte nada). */
export function DieBox({ title, r }: { title: string; r: RollResult | null }) {
  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <div className="text-[10px] tracking-widest text-holo/70 uppercase">{title}</div>
      <Die3D sides={r?.sides ?? 20} result={r} size={140} />
      <div className="font-display text-3xl">{r ? r.value : '—'}{r && <span className="ml-1 text-xs text-ink/50">D{r.sides}</span>}</div>
      {r && r.outcome !== 'ordinario' && (
        <div className={`rounded border px-2 py-0.5 font-display text-xs tracking-widest ${r.outcome === 'catastrofico' ? 'border-doom bg-doom/15' : 'border-gold bg-gold/15'} ${OUTCOME_CLS[r.outcome]}`}>
          {OUTCOME_TEXT[r.outcome]}
        </div>
      )}
    </div>
  )
}
