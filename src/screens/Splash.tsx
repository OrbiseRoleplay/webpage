import { motion } from 'motion/react'
import { useEffect } from 'react'
import { useStore } from '../store/useStore'

/** Entrada: el nombre se condensa desde la lluvia y se disuelve hacia el menú, donde cristaliza el orbe. Clic para saltar. */
export function Splash({ onDone }: { onDone: () => void }) {
  const reduced = useStore((s) => s.settings.reducedMotion)
  useEffect(() => { const t = setTimeout(onDone, reduced ? 300 : 2200); return () => clearTimeout(t) }, [onDone, reduced])
  return (
    <motion.div className="fixed inset-0 z-[100] flex cursor-pointer flex-col items-center justify-center bg-void" onClick={onDone}
      exit={{ opacity: 0, filter: 'blur(14px)' }} transition={{ duration: 0.7 }}>
      <motion.h1 className="orbise-wordmark" initial={{ opacity: 0, y: -40, filter: 'blur(14px)', scaleY: 1.6 }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)', scaleY: 1 }} transition={{ duration: 1.3, ease: [0.2, 0.8, 0.2, 1] }}>
        ORBISE
      </motion.h1>
      <motion.p className="mt-3 text-lg text-ink/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1, duration: 0.6 }}>Roleplay</motion.p>
    </motion.div>
  )
}
