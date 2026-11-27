// Genera public/icon-192.png y public/icon-512.png (cristal ópalo + anillo). Sin dependencias: rasterizador y PNG a mano.
// Uso: node scripts/make-icons.mjs
import { writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t)

function draw(S) {
  const k = S / 512, cx = 256 * k, cy = 256 * k, R = 150 * k
  const P = (r, a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)]
  const out = [...Array(6)].map((_, i) => P(R, (Math.PI / 3) * i - Math.PI / 2))
  const inn = [...Array(6)].map((_, i) => P(R * 0.5, (Math.PI / 3) * i - Math.PI / 2 + Math.PI / 6))
  const cols = ['#1c86a8', '#5a3fc0', '#12507e', '#3b2a8f', '#0f6f86', '#1b3f8f'].map(hex)
  const tris = []
  for (let i = 0; i < 6; i++) {
    const j = (i + 1) % 6, p = (i + 5) % 6
    tris.push([out[i], out[j], inn[i], cols[i]], [inn[i], inn[p], out[i], cols[(i + 3) % 6]], [[cx, cy], inn[i], inn[p], i === 1 ? hex('#8a6a2a') : cols[(i + 2) % 6]])
  }
  const side = (a, b, p) => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0])
  const inTri = (t, p) => { const d1 = side(t[0], t[1], p), d2 = side(t[1], t[2], p), d3 = side(t[2], t[0], p); return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0)) }
  const edgeDist = (t, p) => Math.min(...[[0, 1], [1, 2], [2, 0]].map(([a, b]) => {
    const A = t[a], B = t[b], dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy)
    return Math.abs(dy * (p[0] - A[0]) - dx * (p[1] - A[1])) / L
  }))
  const bg0 = hex('#12284a'), bg1 = hex('#060B14'), gold = hex('#FFD66B'), violet = hex('#A56BFF'), edge = hex('#c8fbff')
  const cosr = Math.cos(0.35), sinr = Math.sin(0.35)

  const sample = (x, y) => {
    let c = mix(bg0, bg1, Math.min(1, Math.hypot(x - cx, y - 220 * k) / (360 * k)))
    // anillo: mitad trasera (por detrás del cristal)
    const rx = (x - cx) * cosr - (y - cy) * sinr, ry = (x - cx) * sinr + (y - cy) * cosr
    const ring = Math.abs(Math.hypot(rx / (205 * k), ry / (62 * k)) - 1) * 62 * k < 3 * k
    if (ring && ry < 0) c = violet
    for (const t of tris) if (inTri(t, [x, y])) { c = edgeDist(t, [x, y]) < 1.2 * k ? mix(t[3], edge, 0.55) : t[3]; break }
    const dc = Math.hypot(x - cx, y - cy) / (34 * k)
    if (dc < 1) c = mix(c, gold, 0.95 * (1 - dc))
    if (ring && ry >= 0) c = violet
    return c
  }

  const raw = Buffer.alloc((S * 4 + 1) * S)
  for (let y = 0; y < S; y++) {
    raw[y * (S * 4 + 1)] = 0
    for (let x = 0; x < S; x++) {
      let acc = [0, 0, 0]
      for (const [ox, oy] of [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]]) acc = acc.map((v, i) => v + sample(x + ox, y + oy)[i] / 4)
      const o = y * (S * 4 + 1) + 1 + x * 4
      raw[o] = acc[0]; raw[o + 1] = acc[1]; raw[o + 2] = acc[2]; raw[o + 3] = 255
    }
  }
  return png(S, raw)
}

const CRC = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c })
const crc = (b) => { let c = -1; for (const x of b) c = CRC[(c ^ x) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0 }
const chunk = (type, data) => { const t = Buffer.from(type), l = Buffer.alloc(4), c = Buffer.alloc(4); l.writeUInt32BE(data.length); c.writeUInt32BE(crc(Buffer.concat([t, data]))); return Buffer.concat([l, t, data, c]) }
function png(S, raw) {
  const ih = Buffer.alloc(13); ih.writeUInt32BE(S, 0); ih.writeUInt32BE(S, 4); ih[8] = 8; ih[9] = 6
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))])
}

for (const s of [192, 512]) writeFileSync(new URL(`../public/icon-${s}.png`, import.meta.url), draw(s))
console.log('Iconos generados: public/icon-192.png, public/icon-512.png')
