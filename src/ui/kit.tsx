// Componentes base del sistema de diseño holográfico. Ver DESIGN_SYSTEM.md.
import { motion, AnimatePresence, animate, useMotionValue, useTransform } from 'motion/react'
import { useEffect, useState, type ReactNode, type ButtonHTMLAttributes } from 'react'
import { useStore } from '../store/useStore'
import { sfx } from '../sfx/audio'

export function Panel({ children, className = '', title, actions }: { children: ReactNode; className?: string; title?: ReactNode; actions?: ReactNode }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12, filter: 'blur(4px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.35 }}
      className={`holo-panel scanlines p-4 ${className}`}
    >
      {(title || actions) && (
        <header className="mb-3 flex items-center justify-between gap-2">
          {title && <h2 className="font-display text-[15px] font-medium text-holo">{title}</h2>}
          <div className="flex flex-wrap gap-2">{actions}</div>
        </header>
      )}
      {children}
    </motion.section>
  )
}

type Tone = 'holo' | 'gold' | 'doom' | 'good' | 'energy' | 'ghost'
const toneCls: Record<Tone, string> = {
  holo: 'border-holo/50 text-holo hover:bg-holo/10 hover:shadow-[0_0_18px_rgb(93_238_255/0.35)]',
  gold: 'border-gold/60 text-gold hover:bg-gold/10 hover:shadow-[0_0_18px_rgb(255_214_107/0.35)]',
  doom: 'border-doom/60 text-doom hover:bg-doom/10',
  good: 'border-good/60 text-good hover:bg-good/10',
  energy: 'border-energy/60 text-energy hover:bg-energy/10',
  ghost: 'border-white/10 text-ink/80 hover:bg-white/5',
}

export function Btn({ tone = 'holo', className = '', onClick, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: Tone }) {
  return (
    <button
      {...rest}
      onClick={(e) => { sfx.click(); onClick?.(e) }}
      className={`rounded-lg border px-3 py-1.5 font-display text-[12.5px] font-medium transition active:scale-95 disabled:pointer-events-none disabled:opacity-40 ${toneCls[tone]} ${className}`}
    >
      {children}
    </button>
  )
}

export function Field({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-sm text-holo/75">{label}</span>
      {children}
    </label>
  )
}

export function Text({ value, onChange, area, ...rest }: { value: string; onChange: (v: string) => void; area?: boolean; placeholder?: string; disabled?: boolean }) {
  return area
    ? <textarea className="holo-input" value={value} onChange={(e) => onChange(e.target.value)} {...rest} />
    : <input className="holo-input" value={value} onChange={(e) => onChange(e.target.value)} {...rest} />
}

export function Num({ value, onChange, min, max, disabled }: { value: number | null; onChange: (v: number) => void; min?: number; max?: number; disabled?: boolean }) {
  return <input type="number" className="holo-input" value={value ?? ''} min={min} max={max} disabled={disabled}
    onChange={(e) => onChange(Number(e.target.value))} />
}

/** Número que se anima al cambiar. */
export function Counter({ value, className = '' }: { value: number; className?: string }) {
  const mv = useMotionValue(value)
  const rounded = useTransform(mv, (v) => Math.round(v).toString())
  useEffect(() => { const c = animate(mv, value, { duration: 0.6, ease: 'easeOut' }); return c.stop }, [value, mv])
  return <motion.span className={className}>{rounded}</motion.span>
}

/** Barra dinámica de vitalidad/resistencia. Destella al bajar. */
export function Bar({ value, max, color, label, icon }: { value: number; max: number; color: string; label: string; icon?: string }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0
  const [prev, setPrev] = useState(value)
  const [hit, setHit] = useState(0)
  useEffect(() => { if (value < prev) setHit((h) => h + 1); setPrev(value) }, [value]) // eslint-disable-line
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs tracking-wider uppercase">
        <span style={{ color }}>{icon} {label}</span>
        <span><Counter value={value} /> / {max}</span>
      </div>
      <motion.div key={hit} animate={hit ? { x: [0, -4, 4, -2, 0] } : {}} transition={{ duration: 0.3 }}
        className="relative h-3 overflow-hidden rounded-full border border-white/10 bg-black/40">
        <motion.div className="absolute inset-y-0 left-0 rounded-full" initial={false}
          animate={{ width: `${pct}%` }} transition={{ type: 'spring', stiffness: 120, damping: 20 }}
          style={{ background: `linear-gradient(90deg, ${color}aa, ${color})`, boxShadow: `0 0 12px ${color}` }} />
      </motion.div>
    </div>
  )
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: string }[]; value: T; onChange: (t: T) => void }) {
  return (
    <div role="tablist" className="flex gap-1 overflow-x-auto pb-1">
      {tabs.map((t) => (
        <button key={t.id} role="tab" aria-selected={value === t.id} onClick={() => { sfx.click(); onChange(t.id) }}
          className={`relative shrink-0 rounded-md px-3 py-2 font-display text-[12.5px] transition ${value === t.id ? 'text-holo' : 'text-ink/60 hover:text-ink'}`}>
          {value === t.id && <motion.span layoutId="tab-ind" className="absolute inset-0 rounded-md border border-holo/40 bg-holo/10" />}
          <span className="relative">{t.label}</span>
        </button>
      ))}
    </div>
  )
}

export function Modal({ open, onClose, children, title }: { open: boolean; onClose: () => void; children: ReactNode; title?: string }) {
  useEffect(() => {
    if (!open) return
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [open, onClose])
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div role="dialog" aria-modal aria-label={title} className="holo-panel max-h-[90vh] w-full max-w-3xl overflow-auto p-4"
            initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-[15px] font-medium text-holo">{title}</h3>
              <Btn tone="ghost" onClick={onClose} aria-label="Cerrar">✕</Btn>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function Toasts() {
  const toasts = useStore((s) => s.toasts)
  const color = { info: '#5DEEFF', ok: '#4EE8A0', warn: '#FFD66B', gold: '#FFD66B', danger: '#FF3C55' }
  useEffect(() => { if (toasts.length) sfx.notify() }, [toasts.length])
  return (
    <div className="pointer-events-none fixed right-3 bottom-3 z-[60] flex flex-col gap-2" aria-live="polite">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div key={t.id} initial={{ opacity: 0, x: 40, filter: 'blur(6px)' }} animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }} exit={{ opacity: 0, x: 40 }}
            className="holo-panel px-4 py-2 text-sm" style={{ borderColor: color[t.tone], color: color[t.tone] }}>
            {t.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="py-6 text-center text-sm text-ink/50">{children}</p>
}

/** Confirmación nativa: suficiente para acciones destructivas locales. */
export const confirmAction = (msg: string) => window.confirm(msg)
