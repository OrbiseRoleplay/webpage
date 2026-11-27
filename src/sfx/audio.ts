// Sonidos 100% procedurales (Web Audio). Sin archivos externos ni licencias.
import { useStore } from '../store/useStore'

type Channel = 'ui' | 'dados' | 'combate' | 'notificaciones' | 'ambiente'
let ctx: AudioContext | null = null
const ac = () => (ctx ??= new AudioContext())

function gainFor(ch: Channel) {
  const v = useStore.getState().settings.volume
  return v.master * v[ch]
}

function tone(ch: Channel, freq: number, dur: number, type: OscillatorType = 'sine', endFreq?: number, delay = 0, vol = 0.25) {
  const g0 = gainFor(ch) * vol
  if (g0 <= 0) return
  const a = ac()
  const t = a.currentTime + delay
  const o = a.createOscillator()
  const g = a.createGain()
  o.type = type
  o.frequency.setValueAtTime(freq, t)
  if (endFreq) o.frequency.exponentialRampToValueAtTime(endFreq, t + dur)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(g0, t + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g).connect(a.destination)
  o.start(t)
  o.stop(t + dur + 0.05)
}

function noise(ch: Channel, dur: number, vol = 0.2, delay = 0, lowpass = 1200) {
  const g0 = gainFor(ch) * vol
  if (g0 <= 0) return
  const a = ac()
  const t = a.currentTime + delay
  const buf = a.createBuffer(1, Math.ceil(a.sampleRate * dur), a.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length)
  const src = a.createBufferSource()
  const f = a.createBiquadFilter()
  const g = a.createGain()
  src.buffer = buf
  f.type = 'lowpass'
  f.frequency.value = lowpass
  g.gain.value = g0
  src.connect(f).connect(g).connect(a.destination)
  src.start(t)
}

export const sfx = {
  click: () => tone('ui', 880, 0.06, 'triangle', 1320, 0, 0.12),
  hover: () => tone('ui', 1500, 0.03, 'sine', undefined, 0, 0.04),
  open: () => { tone('ui', 420, 0.18, 'sine', 900, 0, 0.12); tone('ui', 840, 0.2, 'sine', 1400, 0.05, 0.06) },
  save: () => { tone('notificaciones', 660, 0.09, 'sine'); tone('notificaciones', 990, 0.12, 'sine', undefined, 0.08) },
  notify: () => tone('notificaciones', 1200, 0.15, 'sine', 900, 0, 0.12),
  diceSpin: () => { for (let i = 0; i < 6; i++) tone('dados', 300 + i * 90, 0.07, 'square', undefined, i * 0.09, 0.05); noise('dados', 0.5, 0.06, 0, 3000) },
  diceLand: () => { tone('dados', 180, 0.25, 'sine', 90, 0, 0.3); noise('dados', 0.15, 0.15, 0, 800); tone('dados', 1400, 0.3, 'sine', 2200, 0.02, 0.06) },
  catastrophe: () => { tone('dados', 110, 1.1, 'sawtooth', 38, 0, 0.3); tone('dados', 116, 1.0, 'square', 40, 0.02, 0.12); noise('dados', 0.9, 0.3, 0.05, 500) },
  extraordinary: () => { [523, 659, 784, 1047, 1319].forEach((f, i) => tone('dados', f, 0.6, 'triangle', f * 1.01, i * 0.09, 0.16)); tone('dados', 200, 1.2, 'sine', 800, 0, 0.1) },
  hit: () => { noise('combate', 0.25, 0.35, 0, 600); tone('combate', 140, 0.3, 'sine', 60, 0, 0.3) },
  shatter: () => { for (let i = 0; i < 8; i++) tone('combate', 2000 + Math.random() * 2000, 0.08, 'triangle', 600, i * 0.03, 0.06); noise('combate', 0.3, 0.15, 0, 5000) },
  heal: () => [440, 554, 659].forEach((f, i) => tone('combate', f, 0.3, 'sine', undefined, i * 0.08, 0.1)),
  reward: () => [784, 988, 1175, 1568].forEach((f, i) => tone('notificaciones', f, 0.4, 'triangle', undefined, i * 0.1, 0.12)),
}

export function vibrate(pattern: number | number[]) {
  if (useStore.getState().settings.haptics && 'vibrate' in navigator) navigator.vibrate(pattern)
}
