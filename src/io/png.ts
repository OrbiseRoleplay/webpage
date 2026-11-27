import { toPng } from 'html-to-image'
import { download, fileBase } from './orbise'
import type { Character } from '../domain/schema'
import type { Variant } from './pdf'

/** Captura el nodo de SheetView (ya filtrado con viewFor) y lo descarga como PNG @2x. */
export async function exportPng(node: HTMLElement, c: Character, variant: Variant) {
  await document.fonts?.ready
  const url = await toPng(node, { pixelRatio: 2 })
  download(`${fileBase(c)}-${variant}.png`, await (await fetch(url)).blob())
}
