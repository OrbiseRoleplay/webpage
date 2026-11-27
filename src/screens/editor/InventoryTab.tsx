import { motion } from 'motion/react'
import { useState } from 'react'
import type { Character, InventorySection, Item } from '../../domain/schema'
import { displayName } from '../../domain/character'
import { importImage, pickFiles } from '../../io/images'
import { useStore } from '../../store/useStore'
import { Btn, Counter, Empty, Field, Modal, Num, Panel, Text, confirmAction } from '../../ui/kit'
import type { TabProps } from './CharacterEditor'

const SECTIONS: { id: InventorySection; label: string; icon: string }[] = [
  { id: 'equipamiento', label: 'Equipamiento', icon: '🜲' }, { id: 'consumibles', label: 'Consumibles', icon: '⚗' },
  { id: 'armas', label: 'Armas', icon: '⚔' }, { id: 'otros', label: 'Otros objetos', icon: '◈' }, { id: 'propiedades', label: 'Propiedades', icon: '⌂' },
]
const RARITY: Record<Item['rarity'], { label: string; color: string }> = {
  comun: { label: 'Común', color: '#9fb3c8' }, poco_comun: { label: 'Poco común', color: '#4EE8A0' }, raro: { label: 'Raro', color: '#4285FF' },
  epico: { label: 'Épico', color: '#A56BFF' }, legendario: { label: 'Legendario', color: '#FFD66B' },
}

const cap = (c: Character, s: InventorySection) => (s === 'propiedades' ? Infinity : c.capacity[s])
const used = (c: Character, s: InventorySection) => c.items.filter((i) => i.section === s).length

export function InventoryTab({ c, set, locked, gm }: TabProps) {
  const { characters, saveCharacter, toast } = useStore()
  const [editing, setEditing] = useState<Item | null>(null)
  const [over, setOver] = useState<InventorySection | null>(null)
  const [coinDelta, setCoinDelta] = useState(0)
  const [coinReason, setCoinReason] = useState('')
  const canManage = !locked // añadir/eliminar/transferir

  const upItem = (it: Item, change?: string) => set({ ...c, items: c.items.map((x) => (x.id === it.id ? it : x)) }, change)

  function moveTo(it: Item, s: InventorySection) {
    if (it.section === s) return
    if (used(c, s) >= cap(c, s)) return toast(`Sin espacio en ${s}`, 'warn')
    upItem({ ...it, section: s, equipped: false }, `Objeto ${it.name} → ${s}`)
  }
  function add(s: InventorySection) {
    if (used(c, s) >= cap(c, s)) return toast('Sección llena. El GM puede ampliar la capacidad.', 'warn')
    const it: Item = { id: crypto.randomUUID(), section: s, name: 'Nuevo objeto', description: '', quantity: 1, price: 0, rarity: 'comun', durability: '', effects: '', requirements: '', gmNotes: '', equipped: false }
    set({ ...c, items: [...c.items, it] }, `Objeto añadido en ${s}`)
    setEditing(it)
  }
  function consume(it: Item) {
    const q = it.quantity - 1
    set({ ...c, items: q > 0 ? c.items.map((x) => (x.id === it.id ? { ...x, quantity: q } : x)) : c.items.filter((x) => x.id !== it.id) }, `Consumido: ${it.name}`)
    toast(`${it.name} consumido`, 'ok')
  }
  function transfer(it: Item, toId: string) {
    const to = characters.find((x) => x.id === toId)
    if (!to) return
    const s = it.section
    if (s !== 'propiedades' && to.items.filter((i) => i.section === s).length >= to.capacity[s]) return toast(`${displayName(to)} no tiene espacio`, 'warn')
    set({ ...c, items: c.items.filter((x) => x.id !== it.id) }, `Transferido ${it.name} a ${displayName(to)}`)
    saveCharacter({ ...to, items: [...to.items, { ...it, equipped: false }] }, `Recibido ${it.name} de ${displayName(c)}`)
    setEditing(null)
    toast(`${it.name} transferido a ${displayName(to)}`, 'ok')
  }
  function applyCoins() {
    if (!coinDelta || !coinReason.trim()) return toast('Indica cantidad y motivo', 'warn')
    set({ ...c, coins: c.coins + coinDelta, transactions: [{ id: crypto.randomUUID(), date: new Date().toISOString(), amount: coinDelta, reason: coinReason.trim(), by: gm ? 'GM' : 'jugador' }, ...c.transactions] }, `COINS ${coinDelta > 0 ? '+' : ''}${coinDelta}: ${coinReason}`)
    setCoinDelta(0); setCoinReason('')
  }

  const total = Object.values(c.capacity).reduce((a, b) => a + b, 0)

  return (
    <div className="space-y-3">
      <Panel title="Economía" actions={<span className="text-xs text-ink/50">{c.items.filter((i) => i.section !== 'propiedades').length}/{total} espacios</span>}>
        <p className="font-display text-3xl text-gold text-gold-glow"><Counter value={c.coins} /> <span className="text-sm">COINS</span></p>
        {gm ? (
          <div className="mt-3 grid gap-2 sm:grid-cols-[8rem_1fr_auto]">
            <Num value={coinDelta} onChange={setCoinDelta} />
            <Text value={coinReason} onChange={setCoinReason} placeholder="Motivo (obligatorio)" />
            <Btn tone="gold" onClick={applyCoins}>Aplicar</Btn>
          </div>
        ) : <p className="mt-1 text-[11px] text-ink/50">El saldo de COINS lo modifica el Game Master.</p>}
        {!!c.transactions.length && <ul className="mt-3 max-h-40 space-y-1 overflow-auto text-xs">
          {c.transactions.map((t) => (
            <li key={t.id} className="flex justify-between gap-2 border-b border-white/5 py-1">
              <span className="text-ink/60">{new Date(t.date).toLocaleString('es')} · {t.by} · {t.reason}</span>
              <span className={t.amount >= 0 ? 'text-good' : 'text-doom'}>{t.amount > 0 ? '+' : ''}{t.amount}</span>
            </li>
          ))}
        </ul>}
      </Panel>

      {SECTIONS.map((s) => {
        const items = c.items.filter((i) => i.section === s.id)
        const slots = s.id === 'propiedades' ? 0 : Math.max(0, cap(c, s.id) - items.length)
        return (
          <Panel key={s.id} title={`${s.icon} ${s.label} · ${items.length}${s.id === 'propiedades' ? '' : `/${cap(c, s.id)}`}`}
            actions={canManage && <Btn tone="good" onClick={() => add(s.id)}>+ Añadir</Btn>}>
            <div
              onDragOver={(e) => { e.preventDefault(); setOver(s.id) }} onDragLeave={() => setOver(null)}
              onDrop={(e) => { e.preventDefault(); setOver(null); const it = c.items.find((x) => x.id === e.dataTransfer.getData('text/item')); if (it) moveTo(it, s.id) }}
              className={`grid grid-cols-3 gap-2 rounded-lg p-1 transition sm:grid-cols-5 lg:grid-cols-8 ${over === s.id ? 'bg-holo/10 ring-1 ring-holo' : ''}`}>
              {items.map((it) => (
                <motion.button key={it.id} layout draggable onDragStart={(e: any) => e.dataTransfer.setData('text/item', it.id)}
                  onClick={() => setEditing(it)} whileHover={{ y: -3 }}
                  title={`${it.name}\n${RARITY[it.rarity].label}${it.description ? `\n${it.description}` : ''}${it.effects ? `\nEfectos: ${it.effects}` : ''}`}
                  className={`group relative aspect-square overflow-hidden rounded-lg border bg-black/40 p-1 text-left ${it.equipped ? 'ring-2 ring-holo' : ''}`}
                  style={{ borderColor: `${RARITY[it.rarity].color}88`, boxShadow: `inset 0 0 18px ${RARITY[it.rarity].color}22` }}>
                  {it.image ? <img src={it.image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-80" /> : <span className="absolute inset-0 grid place-items-center text-2xl opacity-40">{s.icon}</span>}
                  <span className="absolute inset-x-0 bottom-0 truncate bg-void/80 px-1 text-[10px]">{it.name}</span>
                  {it.quantity > 1 && <span className="absolute top-0.5 right-1 font-display text-[10px] text-gold">×{it.quantity}</span>}
                  {it.equipped && <span className="absolute top-0.5 left-1 text-[9px] text-holo">EQ</span>}
                </motion.button>
              ))}
              {Array.from({ length: Math.min(slots, 16) }, (_, k) => <div key={k} className="aspect-square rounded-lg border border-dashed border-white/10" aria-hidden />)}
              {s.id === 'propiedades' && !items.length && <div className="col-span-full"><Empty>Sin propiedades.</Empty></div>}
            </div>
          </Panel>
        )
      })}

      <ItemModal item={editing && c.items.find((x) => x.id === editing.id) || null} onClose={() => setEditing(null)} character={c}
        canManage={canManage} gm={gm} onChange={upItem} onMove={moveTo} onConsume={consume} onTransfer={transfer}
        onDelete={(it) => { if (confirmAction(`¿Eliminar ${it.name}?`)) { set({ ...c, items: c.items.filter((x) => x.id !== it.id) }, `Eliminado ${it.name}`); setEditing(null) } }} />
    </div>
  )
}

function ItemModal({ item, onClose, character, canManage, gm, onChange, onMove, onConsume, onTransfer, onDelete }: {
  item: Item | null; onClose: () => void; character: Character; canManage: boolean; gm: boolean
  onChange: (i: Item) => void; onMove: (i: Item, s: InventorySection) => void; onConsume: (i: Item) => void; onTransfer: (i: Item, to: string) => void; onDelete: (i: Item) => void
}) {
  const { characters, toast } = useStore()
  if (!item) return <Modal open={false} onClose={onClose}>{null}</Modal>
  const up = (p: Partial<Item>) => onChange({ ...item, ...p })
  const ro = !canManage
  const t = (k: 'name' | 'description' | 'durability' | 'effects' | 'requirements', label: string, area = false) =>
    <Field label={label}><Text area={area} value={item[k]} disabled={ro} onChange={(v) => up({ [k]: v })} /></Field>
  return (
    <Modal open onClose={onClose} title={item.name || 'Objeto'}>
      <div className="grid gap-3 sm:grid-cols-[8rem_1fr]">
        <button disabled={ro} className="aspect-square overflow-hidden rounded-lg border border-holo/30 bg-black/40 text-xs text-ink/50"
          onClick={async () => { const [f] = await pickFiles('image/*', false); if (f) try { up({ image: await importImage(f) }) } catch (e: any) { toast(e.message, 'danger') } }}>
          {item.image ? <img src={item.image} alt="" className="h-full w-full object-cover" /> : 'Añadir imagen'}
        </button>
        <div className="grid gap-2 sm:grid-cols-2">
          {t('name', 'Nombre')}
          <Field label="Rareza"><select className="holo-input" disabled={ro} value={item.rarity} onChange={(e) => up({ rarity: e.target.value as Item['rarity'] })}>
            {Object.entries(RARITY).map(([k, r]) => <option key={k} value={k}>{r.label}</option>)}</select></Field>
          <Field label="Cantidad"><Num value={item.quantity} min={0} disabled={ro} onChange={(v) => up({ quantity: Math.max(0, v | 0) })} /></Field>
          <Field label="Precio (COINS)"><Num value={item.price} min={0} disabled={ro} onChange={(v) => up({ price: Math.max(0, v) })} /></Field>
          {t('durability', 'Durabilidad')}
          {t('requirements', 'Requisitos')}
        </div>
      </div>
      <div className="mt-2 grid gap-2">
        {t('description', 'Descripción', true)}
        {t('effects', 'Efectos', true)}
        {gm && <Field label="Observaciones del GM (privadas)"><Text area value={item.gmNotes} onChange={(v) => up({ gmNotes: v })} /></Field>}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {(item.section === 'equipamiento' || item.section === 'armas') && <Btn onClick={() => up({ equipped: !item.equipped })}>{item.equipped ? 'Desequipar' : 'Equipar'}</Btn>}
        {item.section === 'consumibles' && <Btn tone="good" onClick={() => { onConsume(item); if (item.quantity <= 1) onClose() }}>Consumir</Btn>}
        {canManage && <select className="holo-input !w-auto" value="" aria-label="Mover a sección" onChange={(e) => e.target.value && onMove(item, e.target.value as InventorySection)}>
          <option value="">Mover a…</option>{SECTIONS.filter((s) => s.id !== item.section).map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>}
        {canManage && <select className="holo-input !w-auto" value="" aria-label="Transferir a personaje" onChange={(e) => e.target.value && onTransfer(item, e.target.value)}>
          <option value="">Transferir a…</option>{characters.filter((x) => x.id !== character.id).map((x) => <option key={x.id} value={x.id}>{displayName(x)}</option>)}
        </select>}
        {canManage && <Btn tone="doom" onClick={() => onDelete(item)}>Eliminar</Btn>}
      </div>
    </Modal>
  )
}
