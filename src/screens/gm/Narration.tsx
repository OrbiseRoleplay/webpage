import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { importImage, pickFiles } from '../../io/images'
import { useStore } from '../../store/useStore'
import { Btn, Field, Panel, Text } from '../../ui/kit'

/** Modo narración: editor + presentación a pantalla completa para los jugadores. */
export function Narration() {
  const toast = useStore((s) => s.toast)
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [image, setImage] = useState<string>()
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!show) return
    const k = (e: KeyboardEvent) => e.key === 'Escape' && setShow(false)
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [show])

  const pick = async () => {
    const [f] = await pickFiles('image/*', false)
    if (f) importImage(f).then(setImage).catch((e: Error) => toast(e.message, 'danger'))
  }

  return (
    <Panel title="Modo narración">
      <div className="grid gap-2">
        <Field label="Título"><Text value={title} onChange={setTitle} /></Field>
        <Field label="Texto"><Text area value={text} onChange={setText} /></Field>
        <div className="flex flex-wrap gap-2">
          <Btn tone="ghost" onClick={pick}>{image ? 'Cambiar imagen' : 'Imagen ambiental'}</Btn>
          {image && <Btn tone="ghost" onClick={() => setImage(undefined)}>Quitar imagen</Btn>}
          <Btn tone="gold" onClick={() => setShow(true)} disabled={!text && !title && !image}>Presentar a pantalla completa</Btn>
        </div>
      </div>
      {show && (
        <motion.div className="fixed inset-0 z-[70] flex flex-col items-center justify-center gap-6 bg-black p-8 text-center"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={() => setShow(false)}>
          {image && <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />}
          <div className="relative max-w-4xl space-y-6">
            {title && <h2 className="font-display text-4xl tracking-[0.3em] text-gold uppercase sm:text-6xl">{title}</h2>}
            <p className="text-2xl leading-relaxed whitespace-pre-wrap sm:text-4xl">{text}</p>
          </div>
          <span className="absolute bottom-4 text-xs text-ink/40">Clic o Esc para cerrar</span>
        </motion.div>
      )}
    </Panel>
  )
}
