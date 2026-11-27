import { attrValue, displayName, mainImage } from '../../domain/character'
import type { Character } from '../../domain/schema'
import { Bar } from '../../ui/kit'

export const VITAL_COLORS = { vitAmarilla: '#FFD66B', vitRoja: '#FF3C55', resistencia: '#5DEEFF' } as const

/** Panel de un combatiente: retrato, barras, estados y defensas restantes. */
export function Fighter({ c, role, defenses }: { c: Character | undefined; role: string; defenses: number }) {
  if (!c) return <p className="text-sm text-ink/50">{role}: sin seleccionar</p>
  const img = mainImage(c)
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-holo/30 bg-black/40">
          {img && <img src={img} alt={displayName(c)} className="h-full w-full object-cover" />}
        </div>
        <div>
          <div className="text-[10px] tracking-widest text-holo/70 uppercase">{role} · {c.kind}</div>
          <div className="font-display text-sm">{displayName(c)}</div>
          <div className="text-xs text-ink/60">Defensas sólidas restantes: {defenses}</div>
        </div>
      </div>
      <Bar value={c.current.vitAmarilla} max={attrValue(c, 'vitAmarilla')} color={VITAL_COLORS.vitAmarilla} label="Vit. amarilla" icon="💛" />
      <Bar value={c.current.vitRoja} max={attrValue(c, 'vitRoja')} color={VITAL_COLORS.vitRoja} label="Vit. roja" icon="❤️" />
      <Bar value={c.current.resistencia} max={attrValue(c, 'resistencia')} color={VITAL_COLORS.resistencia} label="Resistencia" icon="💧" />
      {c.conditions.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {c.conditions.map((k) => <span key={k.id} title={k.notes} className="rounded border border-white/15 px-1.5 py-0.5 text-[10px]">{k.name}</span>)}
        </div>
      )}
    </div>
  )
}
