// Exportación a PDF vectorial (jsPDF). Siempre pasa por viewFor(c, audiencia).
import { jsPDF } from 'jspdf'
import type { Character, InventorySection } from '../domain/schema'
import { ATTRIBUTES } from '../rules/config'
import { attrValue, displayName, mainImage, pointsLeft, viewFor, type Audience } from '../domain/character'
import { fileBase } from './orbise'

export type Variant = 'completa' | 'compacta' | 'combate' | 'narrativa' | 'publica' | 'gm'

export const audienceOf = (v: Variant): Audience => (v === 'publica' ? 'publico' : v === 'gm' ? 'gm' : 'jugador')

/** Qué incluye cada variante (compartido con la vista PNG). */
export const FLAGS: Record<Variant, { label: string; gift: 'corto' | 'combate' | 'completo'; inv: InventorySection[] | null; story: boolean; prog: boolean; cond: boolean; phys: boolean }> = {
  completa: { label: 'Ficha completa', gift: 'completo', inv: ['equipamiento', 'consumibles', 'armas', 'otros', 'propiedades'], story: true, prog: true, cond: true, phys: true },
  compacta: { label: 'Ficha compacta', gift: 'corto', inv: null, story: false, prog: false, cond: false, phys: false },
  combate: { label: 'Ficha de combate', gift: 'combate', inv: ['armas', 'equipamiento', 'consumibles'], story: false, prog: false, cond: true, phys: false },
  narrativa: { label: 'Ficha narrativa', gift: 'completo', inv: null, story: true, prog: false, cond: false, phys: true },
  publica: { label: 'Ficha pública', gift: 'completo', inv: null, story: true, prog: false, cond: false, phys: true },
  gm: { label: 'Expediente confidencial GM', gift: 'completo', inv: ['equipamiento', 'consumibles', 'armas', 'otros', 'propiedades'], story: true, prog: true, cond: true, phys: true },
}

export const SECTION_LABEL: Record<InventorySection, string> = {
  equipamiento: 'Equipamiento', consumibles: 'Consumibles', armas: 'Armas', otros: 'Otros', propiedades: 'Propiedades',
}

type RGB = [number, number, number]

/** helvetica solo cubre Latin-1: quita emojis y símbolos fuera de rango. */
const sx = (s: string) => s.replace(/[^\n -ÿ–—‘’“”…€]/g, '')

/** jsPDF no acepta webp: se convierte a JPEG vía canvas. */
async function toJpeg(url: string) {
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    const cv = document.createElement('canvas')
    cv.width = img.naturalWidth
    cv.height = img.naturalHeight
    const g = cv.getContext('2d')!
    g.fillStyle = '#060B14'
    g.fillRect(0, 0, cv.width, cv.height)
    g.drawImage(img, 0, 0)
    return { d: cv.toDataURL('image/jpeg', 0.9), w: cv.width, h: cv.height }
  } catch { return null }
}

export async function exportPdf(c: Character, variant: Variant, printable: boolean) {
  const v = viewFor(c, audienceOf(variant))
  const F = FLAGS[variant]
  const gm = variant === 'gm'
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' })
  const W = 210, H = 297, M = 14, CW = W - 2 * M
  const P = printable
    ? { bg: null, panel: null, title: [10, 90, 115] as RGB, text: [30, 32, 42] as RGB, dim: [100, 105, 118] as RGB, gold: [150, 100, 0] as RGB, violet: [100, 60, 180] as RGB, line: [170, 180, 195] as RGB, red: [180, 0, 30] as RGB }
    : { bg: [6, 11, 20] as RGB, panel: [16, 28, 45] as RGB, title: [93, 238, 255] as RGB, text: [220, 232, 245] as RGB, dim: [130, 150, 172] as RGB, gold: [255, 214, 107] as RGB, violet: [168, 120, 255] as RGB, line: [40, 75, 100] as RGB, red: [255, 60, 85] as RGB }

  let y = M
  const newPage = () => {
    if (P.bg) { pdf.setFillColor(...P.bg); pdf.rect(0, 0, W, H, 'F') }
    y = M
  }
  newPage()
  const need = (h: number) => { if (y + h > H - M) { pdf.addPage(); newPage() } }
  const font = (size: number, color: RGB, bold = false) => {
    pdf.setFont('helvetica', bold ? 'bold' : 'normal'); pdf.setFontSize(size); pdf.setTextColor(...color)
  }
  const box = (x: number, yy: number, w: number, h: number) => {
    if (P.panel) { pdf.setFillColor(...P.panel); pdf.roundedRect(x, yy, w, h, 1.5, 1.5, 'F') }
    else { pdf.setDrawColor(...P.line); pdf.setLineWidth(0.2); pdf.roundedRect(x, yy, w, h, 1.5, 1.5, 'S') }
  }
  const para = (s: string, size = 9.5, color = P.text, x = M, w = CW - (x - M), bold = false) => {
    if (!s.trim()) return
    font(size, color, bold)
    const lh = size * 0.5
    for (const l of pdf.splitTextToSize(sx(s), w) as string[]) { need(lh); pdf.text(l, x, y + lh * 0.8); y += lh }
    y += 1.5
  }
  const field = (label: string, s: string) => s.trim() && para(`${label}: ${s}`)
  const section = (t: string, color = P.title) => {
    need(16); y += 3
    font(11, color, true); pdf.text(sx(t.toUpperCase()), M, y + 4); y += 6
    pdf.setDrawColor(...P.line); pdf.setLineWidth(0.3); pdf.line(M, y, W - M, y); y += 3
  }

  // Cabecera
  box(M, y, CW, 22)
  font(22, P.title, true); pdf.text('ORBISE', M + 5, y + 10)
  font(8, P.dim); pdf.text('ROLEPLAY  /  FICHA DE PERSONAJE', M + 5, y + 16)
  font(10, gm ? P.red : P.violet, true)
  pdf.text(sx(F.label.toUpperCase() + (gm ? '  -  CONFIDENCIAL' : '')), W - M - 5, y + 10, { align: 'right' })
  if (gm) { font(7.5, P.red); pdf.text('Documento reservado al Game Master. No compartir con jugadores.', W - M - 5, y + 16, { align: 'right' }) }
  y += 27

  // Retrato + identidad
  const top = y
  const url = mainImage(v)
  const img = url ? await toJpeg(url) : null
  box(M, y, 40, 50)
  if (img) {
    const k = Math.min(40 / img.w, 50 / img.h)
    const w = img.w * k, h = img.h * k
    pdf.addImage(img.d, 'JPEG', M + (40 - w) / 2, y + (50 - h) / 2, w, h)
  }
  const id = v.identity
  const x0 = M + 46
  y += 2
  para(displayName(v), 16, P.title, x0, CW - 46, true)
  if (id.alias) para(`"${id.alias}"`, 10, P.violet, x0, CW - 46)
  para([id.society, id.profession].filter(Boolean).join('  /  '), 10, P.text, x0, CW - 46)
  para(`Nivel ${id.level}   XP ${id.experience}`, 9.5, P.gold, x0, CW - 46, true)
  const bday = id.birthday.day && id.birthday.month ? `${id.birthday.day}/${id.birthday.month}` : ''
  para([id.gender, id.age && `${id.age} años`, id.height, id.weight, bday && `Cumple ${bday}`].filter(Boolean).join('  /  '), 9, P.dim, x0, CW - 46)
  if (id.residence) para(`Residencia: ${id.residence}`, 9, P.text, x0, CW - 46)
  if (id.reputation) para(`Reputación: ${id.reputation}`, 9, P.text, x0, CW - 46)
  if (id.titles.length) para(`Títulos: ${id.titles.join(', ')}`, 9, P.gold, x0, CW - 46)
  y = Math.max(y, top + 52)
  if (F.phys && id.physicalTraits.trim()) { para('Rasgos físicos: ' + id.physicalTraits) }

  // Don
  const g = v.gift
  if (g.name || g.giftClass || g.description) {
    section('Don')
    para(g.name || 'Sin nombre', 12, P.text, M, CW, true)
    para(g.giftClass ? `Clase ${g.giftClass}` : 'Clase pendiente de asignación', 10, g.giftClass === 'OMEGA' ? P.gold : P.violet, M, CW, true)
    if (F.gift !== 'corto') {
      if (F.gift === 'completo') field('Descripción', g.description)
      field('Fortaleza', g.strength)
      field('Debilidad', g.weakness)
      field('Limitaciones', g.limitations)
      if (F.gift === 'completo') field('Manifestación', g.manifestation)
      const techs = g.techniques.filter((t) => t.unlocked)
      if (techs.length) {
        para('Técnicas', 9, P.title, M, CW, true)
        for (const t of techs) para(`- ${t.name}${t.cost ? ` (coste ${t.cost} resistencia)` : ''}${t.description ? ': ' + t.description : ''}`, 9, P.text, M + 3)
      }
    }
    if (gm && g.gmNotes.trim()) para('Notas GM: ' + g.gmNotes, 9, P.red)
  }

  // Atributos
  section('Atributos')
  const left = pointsLeft(v)
  para(`Puntos restantes: ${left === Infinity ? 'ilimitados' : left}`, 9, P.dim)
  const cw = (CW - 4) / 2
  const generals = ATTRIBUTES.filter((a) => a.group !== 'vital')
  for (let i = 0; i < generals.length; i += 2) {
    need(10)
    generals.slice(i, i + 2).forEach((a, j) => {
      const x = M + j * (cw + 4)
      box(x, y, cw, 8)
      font(8.5, P.text); pdf.text(sx(a.label), x + 2.5, y + 5.2)
      font(11, P.title, true); pdf.text(String(attrValue(v, a.key)), x + cw - 2.5, y + 5.6, { align: 'right' })
      const extra = `${v.points[a.key]} pt${v.bonus[a.key] ? ` +${v.bonus[a.key]}` : ''}`
      font(7, P.dim); pdf.text(extra, x + cw - 11, y + 5.2, { align: 'right' })
    })
    y += 9.5
  }

  // Vitalidad y resistencia
  section('Vitalidad y resistencia')
  const vit: Record<string, RGB> = { vitAmarilla: P.gold, vitRoja: P.red, resistencia: P.title }
  for (const a of ATTRIBUTES.filter((a) => a.group === 'vital')) {
    need(10)
    const max = attrValue(v, a.key), cur = v.current[a.key as keyof typeof v.current]
    font(9, P.text); pdf.text(sx(a.label), M, y + 4.5)
    const bx = M + 50, bw = CW - 50 - 26
    box(bx, y + 1, bw, 4.5)
    const pct = max > 0 ? Math.max(0, Math.min(1, cur / max)) : 0
    pdf.setFillColor(...vit[a.key]); if (pct > 0) pdf.roundedRect(bx, y + 1, bw * pct, 4.5, 1.5, 1.5, 'F')
    font(9.5, vit[a.key], true); pdf.text(`${cur} / ${max}`, W - M, y + 4.8, { align: 'right' })
    y += 8
  }

  // Estados
  if (F.cond && v.conditions.length) {
    section('Estados y heridas')
    for (const k of v.conditions) para(`- [${k.kind}] ${k.name}${k.notes ? ': ' + k.notes : ''}`, 9)
  }

  // COINS e inventario
  if (F.inv) {
    section('Inventario')
    para(`COINS: ${v.coins}`, 11, P.gold, M, CW, true)
    for (const sec of F.inv) {
      const items = v.items.filter((i) => i.section === sec)
      if (!items.length) continue
      const cap = sec in v.capacity ? ` (${items.length}/${v.capacity[sec as keyof typeof v.capacity]})` : ''
      para(SECTION_LABEL[sec] + cap, 9.5, P.title, M, CW, true)
      for (const i of items) {
        para(`- ${i.name || 'Sin nombre'} x${i.quantity}${i.equipped ? ' [equipado]' : ''}  (${i.rarity.replace('_', ' ')}${i.price ? `, ${i.price} COINS` : ''})`, 9, P.text, M + 3, CW - 3, true)
        for (const [l, s] of [['', i.description], ['Efectos', i.effects], ['Requisitos', i.requirements], ['Durabilidad', i.durability], ['GM', gm ? i.gmNotes : '']] as const)
          if (s.trim()) para(l ? `${l}: ${s}` : s, 8.5, l === 'GM' ? P.red : P.dim, M + 6, CW - 6)
      }
    }
  }

  // Historia
  if (F.story && v.story.length) {
    section('Historia')
    for (const s of v.story) {
      para(`${s.title || 'Sin título'}${s.date ? '  -  ' + s.date : ''}  [${s.section}${gm ? ', ' + s.visibility : ''}]`, 10, P.violet, M, CW, true)
      para(s.text, 9.5)
    }
  }

  // Progresión
  if (F.prog) {
    section('Progresión')
    para(`Nivel ${id.level}  /  Experiencia ${id.experience}  /  Puntos invertidos ${Object.values(v.points).reduce((a, b) => a + b, 0)} de ${v.unlimitedPoints ? 'ilimitados' : v.pointBudget}`, 9.5)
    for (const r of v.rewards) para(`- ${r.date.slice(0, 10)}  ${r.kind}${r.amount ? ' ' + r.amount : ''}: ${r.description} (${r.source})`, 9)
  }
  if (gm && v.history.length) {
    section('Historial de cambios', P.red)
    for (const h of v.history.slice(-60)) para(`${h.date.slice(0, 16).replace('T', ' ')}  ${h.by}: ${h.change}`, 8.5, P.dim)
  }

  // Pie
  const n = pdf.getNumberOfPages()
  for (let p = 1; p <= n; p++) {
    pdf.setPage(p)
    font(7.5, gm ? P.red : P.dim)
    pdf.text(sx(`ORBISE ROLEPLAY  -  ${displayName(v)}${gm ? '  -  CONFIDENCIAL' : ''}`), M, H - 6)
    pdf.text(`${p} / ${n}`, W - M, H - 6, { align: 'right' })
  }
  pdf.save(`${fileBase(c)}-${variant}${printable ? '-imprimible' : ''}.pdf`)
}
