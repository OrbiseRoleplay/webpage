import { useEffect, useRef, useState } from 'react'
import type { Character } from '../../domain/schema'
import { Campaign, EncyclopediaEntry } from '../../domain/schema'
import { Btn, Field, Panel } from '../../ui/kit'
import { backupAll, useStore } from '../../store/useStore'
import { download, exportJson, exportOrbise, parseOrbise } from '../../io/orbise'
import { migrateCharacter } from '../../io/migrate'
import { pickFiles } from '../../io/images'
import { audienceOf, exportPdf, type Variant } from '../../io/pdf'
import { exportPng } from '../../io/png'
import { SheetView } from './SheetView'

const OPTIONS: { id: string; label: string; variant: Variant; printable: boolean; gmOnly?: boolean }[] = [
  { id: 'completa', label: 'Ficha completa', variant: 'completa', printable: false },
  { id: 'compacta', label: 'Ficha compacta', variant: 'compacta', printable: false },
  { id: 'combate', label: 'Ficha de combate', variant: 'combate', printable: false },
  { id: 'narrativa', label: 'Ficha narrativa', variant: 'narrativa', printable: false },
  { id: 'imprimible', label: 'Ficha imprimible (fondo blanco)', variant: 'completa', printable: true },
  { id: 'publica', label: 'Ficha pública para compartir', variant: 'publica', printable: false },
  { id: 'gm', label: 'Expediente confidencial GM', variant: 'gm', printable: false, gmOnly: true },
]

export function ExportPanel({ character }: { character: Character }) {
  const { gmMode, toast, importCharacter, saveCampaign, saveEntry } = useStore()
  const [sel, setSel] = useState('completa')
  const [busy, setBusy] = useState(false)
  const [capture, setCapture] = useState(false)
  const sheet = useRef<HTMLDivElement>(null)
  const opts = OPTIONS.filter((o) => !o.gmOnly || gmMode)
  const opt = opts.find((o) => o.id === sel) ?? opts[0]
  const aud = audienceOf(opt.variant)

  const run = async (f: () => unknown | Promise<unknown>, ok: string) => {
    setBusy(true)
    try { await f(); toast(ok, 'ok') } catch (e: any) { toast(`Error al exportar: ${e?.message ?? e}`, 'danger') }
    setBusy(false)
  }

  // El nodo de la ficha solo existe durante la captura PNG
  useEffect(() => {
    if (!capture) return
    let alive = true
    requestAnimationFrame(() => requestAnimationFrame(async () => {
      try {
        if (alive && sheet.current) { await exportPng(sheet.current, character, opt.variant); toast('PNG exportado', 'ok') }
      } catch (e: any) { toast(`Error al exportar PNG: ${e?.message ?? e}`, 'danger') }
      if (alive) setCapture(false)
    }))
    return () => { alive = false }
  }, [capture]) // eslint-disable-line

  const importFiles = async () => {
    try {
      for (const f of await pickFiles('.orbise,.json,application/json', true)) {
        try { importCharacter(parseOrbise(await f.text())); toast(`Importado: ${f.name}`, 'ok') }
        catch (e: any) { toast(`${f.name}: ${e?.message ?? 'archivo inválido'}`, 'danger') }
      }
    } catch (e: any) { toast(`No se pudo importar: ${e?.message ?? e}`, 'danger') }
  }

  const backup = () => run(() => download(`orbise-copia-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(backupAll())), 'Copia de seguridad exportada')

  const restore = async () => {
    try {
      const [f] = await pickFiles('.json,application/json', false)
      if (!f) return
      let raw: any
      try { raw = JSON.parse(await f.text()) } catch { return toast('La copia no es JSON válido.', 'danger') }
      if (raw?.app !== 'ORBISE' || raw.kind !== 'backup') return toast('El archivo no es una copia de seguridad de ORBISE.', 'danger')
      let ok = 0, bad = 0
      for (const c of Array.isArray(raw.characters) ? raw.characters : []) {
        try { importCharacter(migrateCharacter(c)); ok++ } catch { bad++ }
      }
      for (const c of Array.isArray(raw.campaigns) ? raw.campaigns : []) { const r = Campaign.safeParse(c); r.success ? (saveCampaign(r.data), ok++) : bad++ }
      for (const e of Array.isArray(raw.encyclopedia) ? raw.encyclopedia : []) { const r = EncyclopediaEntry.safeParse(e); r.success ? (saveEntry(r.data), ok++) : bad++ }
      toast(`Restaurados ${ok} elementos${bad ? `, ${bad} descartados por inválidos` : ''}`, bad ? 'warn' : 'ok')
    } catch (e: any) { toast(`No se pudo restaurar: ${e?.message ?? e}`, 'danger') }
  }

  return (
    <Panel title="Exportar / importar">
      <div className="grid gap-4">
        <Field label="Formato de ficha">
          <select className="holo-input" value={opt.id} onChange={(e) => setSel(e.target.value)}>
            {opts.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </Field>
        <div className="flex flex-wrap gap-2">
          <Btn disabled={busy} onClick={() => run(() => exportPdf(character, opt.variant, opt.printable), 'PDF exportado')}>PDF</Btn>
          <Btn disabled={busy || capture} onClick={() => setCapture(true)}>PNG</Btn>
          <Btn tone="gold" disabled={busy} onClick={() => run(() => exportJson(character, aud), 'JSON exportado')}>JSON</Btn>
          <Btn tone="gold" disabled={busy} onClick={() => run(() => exportOrbise(character, aud), '.orbise exportado')}>.orbise</Btn>
        </div>
        <p className="text-xs text-ink/50">
          El .orbise conserva las imágenes y se puede reimportar. Los archivos respetan la visibilidad: lo privado nunca sale en versiones públicas.
        </p>
        <div className="flex flex-wrap gap-2 border-t border-white/10 pt-3">
          <Btn tone="energy" onClick={importFiles}>Importar (.orbise / .json)</Btn>
          <Btn tone="ghost" onClick={backup}>Copia de seguridad completa</Btn>
          <Btn tone="ghost" onClick={restore}>Restaurar copia</Btn>
        </div>
      </div>
      {capture && (
        <div style={{ position: 'fixed', left: -10000, top: 0 }} aria-hidden>
          <div ref={sheet}><SheetView character={character} variant={opt.variant} printable={opt.printable} /></div>
        </div>
      )}
    </Panel>
  )
}
