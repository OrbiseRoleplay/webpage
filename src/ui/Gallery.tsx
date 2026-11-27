// Carrusel holográfico + editor de imágenes reutilizable (galería del personaje e imágenes del don).
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import type { ImageAsset } from '../domain/schema'
import { importImage, pickFiles } from '../io/images'
import { useStore } from '../store/useStore'
import { Btn, Empty, Field, Modal, Text, confirmAction } from './kit'

interface Props {
  images: ImageAsset[]
  onChange: (imgs: ImageAsset[]) => void
  mainId?: string | null
  onMain?: (id: string) => void
  readOnly?: boolean
}

export function Gallery({ images, onChange, mainId, onMain, readOnly }: Props) {
  const toast = useStore((s) => s.toast)
  const [i, setI] = useState(0)
  const [dir, setDir] = useState(1)
  const [zoom, setZoom] = useState(false)
  const [touchX, setTouchX] = useState<number | null>(null)
  const idx = Math.min(i, Math.max(0, images.length - 1))
  const cur = images[idx]
  const go = (d: number) => { if (!images.length) return; setDir(d); setI((idx + d + images.length) % images.length) }
  const patch = (p: Partial<ImageAsset>) => onChange(images.map((x) => (x.id === cur.id ? { ...x, ...p } : x)))

  async function add() {
    const added: ImageAsset[] = []
    for (const f of await pickFiles('image/png,image/jpeg,image/webp,image/gif')) {
      try { added.push({ id: crypto.randomUUID(), dataUrl: await importImage(f), title: f.name.replace(/\.\w+$/, ''), description: '', visible: true }) }
      catch (e: any) { toast(`${f.name}: ${e.message}`, 'danger') }
    }
    if (added.length) { onChange([...images, ...added]); setI(images.length); toast(`${added.length} imagen(es) añadidas`, 'ok') }
  }
  async function replaceCur() {
    const [f] = await pickFiles('image/png,image/jpeg,image/webp,image/gif', false)
    if (f) try { patch({ dataUrl: await importImage(f) }) } catch (e: any) { toast(e.message, 'danger') }
  }
  function move(d: number) {
    const j = idx + d
    if (j < 0 || j >= images.length) return
    const next = [...images];[next[idx], next[j]] = [next[j], next[idx]]
    onChange(next); setI(j)
  }

  return (
    <div>
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-holo/25 bg-black/50 sm:aspect-[16/9]"
        onTouchStart={(e) => setTouchX(e.touches[0].clientX)}
        onTouchEnd={(e) => { if (touchX !== null) { const dx = e.changedTouches[0].clientX - touchX; if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1) } setTouchX(null) }}
        onKeyDown={(e) => { if (e.key === 'ArrowLeft') go(-1); if (e.key === 'ArrowRight') go(1) }} tabIndex={0} aria-label="Carrusel de imágenes">
        {!images.length && <div className="grid h-full place-items-center"><Empty>Sin imágenes</Empty></div>}
        <AnimatePresence initial={false} custom={dir}>
          {cur && (
            <motion.img key={cur.id} src={cur.dataUrl} alt={cur.title} onClick={() => setZoom(true)}
              className={`absolute inset-0 h-full w-full cursor-zoom-in object-contain ${cur.visible ? '' : 'opacity-40'}`}
              custom={dir} initial={{ x: `${dir * 60}%`, opacity: 0, filter: 'blur(8px) hue-rotate(60deg)' }}
              animate={{ x: 0, opacity: cur.visible ? 1 : 0.4, filter: 'blur(0px) hue-rotate(0deg)' }} exit={{ x: `${-dir * 60}%`, opacity: 0 }} transition={{ duration: 0.4 }} />
          )}
        </AnimatePresence>
        {cur && <span className="scan-sweep" />}
        {images.length > 1 && <>
          <button aria-label="Imagen anterior" onClick={() => go(-1)} className="absolute top-1/2 left-2 -translate-y-1/2 rounded-full border border-holo/40 bg-void/70 px-3 py-2 text-holo">◂</button>
          <button aria-label="Imagen siguiente" onClick={() => go(1)} className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full border border-holo/40 bg-void/70 px-3 py-2 text-holo">▸</button>
        </>}
        {cur && <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-void/90 p-3">
          <p className="font-display text-sm tracking-wider">{cur.title}{cur.id === mainId && <span className="ml-2 text-gold">★ Principal</span>}{!cur.visible && <span className="ml-2 text-ink/50">(oculta)</span>}</p>
          {cur.description && <p className="line-clamp-2 text-xs text-ink/70">{cur.description}</p>}
        </div>}
      </div>
      <div className="mt-2 flex justify-center gap-1.5" role="tablist" aria-label="Posición">
        {images.map((im, j) => (
          <button key={im.id} aria-label={`Imagen ${j + 1}`} aria-selected={j === idx} onClick={() => { setDir(j > idx ? 1 : -1); setI(j) }}
            className={`h-1.5 rounded-full transition-all ${j === idx ? 'w-6 bg-holo shadow-[0_0_8px_#5DEEFF]' : 'w-2 bg-ink/30'}`} />
        ))}
      </div>

      {!readOnly && (
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap gap-2">
            <Btn tone="good" onClick={add}>+ Añadir imágenes</Btn>
            {cur && <>
              {onMain && <Btn tone="gold" disabled={cur.id === mainId} onClick={() => onMain(cur.id)}>★ Principal</Btn>}
              <Btn tone="ghost" onClick={() => move(-1)} disabled={idx === 0}>◂ Mover</Btn>
              <Btn tone="ghost" onClick={() => move(1)} disabled={idx === images.length - 1}>Mover ▸</Btn>
              <Btn tone="ghost" onClick={() => patch({ visible: !cur.visible })}>{cur.visible ? 'Ocultar' : 'Mostrar'}</Btn>
              <Btn tone="ghost" onClick={replaceCur}>Reemplazar</Btn>
              <Btn tone="doom" onClick={() => confirmAction('¿Eliminar esta imagen?') && onChange(images.filter((x) => x.id !== cur.id))}>Eliminar</Btn>
            </>}
          </div>
          {cur && <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Título"><Text value={cur.title} onChange={(v) => patch({ title: v })} /></Field>
            <Field label="Descripción"><Text value={cur.description} onChange={(v) => patch({ description: v })} /></Field>
          </div>}
        </div>
      )}
      <Modal open={zoom && !!cur} onClose={() => setZoom(false)} title={cur?.title}>
        {cur && <img src={cur.dataUrl} alt={cur.title} className="mx-auto max-h-[75vh] w-auto rounded-lg" />}
        {cur?.description && <p className="mt-2 text-sm text-ink/80">{cur.description}</p>}
      </Modal>
    </div>
  )
}
