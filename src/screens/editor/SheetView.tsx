// Vista HTML de la ficha, pensada solo para capturarla a PNG. Siempre pasa por viewFor.
import type { ReactNode } from 'react'
import type { Character } from '../../domain/schema'
import { ATTRIBUTES } from '../../rules/config'
import { attrValue, displayName, mainImage, pointsLeft, viewFor } from '../../domain/character'
import { audienceOf, FLAGS, SECTION_LABEL, type Variant } from '../../io/pdf'

export function SheetView({ character, variant, printable }: { character: Character; variant: Variant; printable: boolean }) {
  const v = viewFor(character, audienceOf(variant))
  const F = FLAGS[variant]
  const gm = variant === 'gm'
  const T = printable
    ? { bg: '#fff', panel: '#fff', title: '#0a5a73', text: '#1e202a', dim: '#646976', gold: '#966400', violet: '#643cb4', line: '#aab4c3', red: '#b4001e' }
    : { bg: '#060B14', panel: '#101C2D', title: '#5DEEFF', text: '#DCE8F5', dim: '#8296AC', gold: '#FFD66B', violet: '#A878FF', line: '#284B64', red: '#FF3C55' }
  const vitColor = { vitAmarilla: T.gold, vitRoja: T.red, resistencia: T.title }
  const img = mainImage(v)
  const id = v.identity
  const g = v.gift

  const box = { background: T.panel, border: `1px solid ${T.line}`, borderRadius: 8 }
  const H = ({ children, color = T.title }: { children: ReactNode; color?: string }) => (
    <h3 style={{ color, borderBottom: `1px solid ${T.line}`, margin: '22px 0 10px', paddingBottom: 4, fontSize: 15, letterSpacing: 2, textTransform: 'uppercase' }}>{children}</h3>
  )
  const P = ({ children, color = T.text }: { children: ReactNode; color?: string }) => (
    <p style={{ margin: '3px 0', color, whiteSpace: 'pre-wrap', fontSize: 13 }}>{children}</p>
  )
  const fields = [['Descripción', g.description], ['Fortaleza', g.strength], ['Debilidad', g.weakness], ['Limitaciones', g.limitations], ['Manifestación', g.manifestation]]
    .filter(([l]) => (F.gift === 'completo' || !['Descripción', 'Manifestación'].includes(l))).filter(([, s]) => s.trim())
  const left = pointsLeft(v)

  return (
    <div style={{ width: 794, padding: 32, background: T.bg, color: T.text, fontFamily: 'system-ui, sans-serif', boxSizing: 'border-box' }}>
      <div style={{ ...box, padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: 6, color: T.title }}>ORBISE</div>
          <div style={{ fontSize: 11, color: T.dim, letterSpacing: 3 }}>ROLEPLAY / FICHA DE PERSONAJE</div>
        </div>
        <div style={{ textAlign: 'right', color: gm ? T.red : T.violet, fontWeight: 700, textTransform: 'uppercase' }}>
          {F.label}{gm && <div style={{ fontSize: 11 }}>CONFIDENCIAL - solo Game Master</div>}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16, marginTop: 16 }}>
        <div style={{ ...box, width: 160, height: 200, flexShrink: 0, overflow: 'hidden' }}>
          {img && <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />}
        </div>
        <div>
          <div style={{ fontSize: 26, fontWeight: 700, color: T.title }}>{displayName(v)}</div>
          {id.alias && <P color={T.violet}>"{id.alias}"</P>}
          <P>{[id.society, id.profession].filter(Boolean).join(' / ')}</P>
          <P color={T.gold}><b>Nivel {id.level} - XP {id.experience}</b></P>
          <P color={T.dim}>{[id.gender, id.age && `${id.age} años`, id.height, id.weight].filter(Boolean).join(' / ')}</P>
          {id.residence && <P>Residencia: {id.residence}</P>}
          {id.reputation && <P>Reputación: {id.reputation}</P>}
          {id.titles.length > 0 && <P color={T.gold}>Títulos: {id.titles.join(', ')}</P>}
          {F.phys && id.physicalTraits && <P>Rasgos físicos: {id.physicalTraits}</P>}
        </div>
      </div>

      {(g.name || g.giftClass || g.description) && <>
        <H>Don</H>
        <P><b style={{ fontSize: 16 }}>{g.name || 'Sin nombre'}</b></P>
        <P color={g.giftClass === 'OMEGA' ? T.gold : T.violet}><b>{g.giftClass ? `Clase ${g.giftClass}` : 'Clase pendiente de asignación'}</b></P>
        {F.gift !== 'corto' && fields.map(([l, s]) => <P key={l}>{l}: {s}</P>)}
        {F.gift !== 'corto' && g.techniques.filter((t) => t.unlocked).map((t) => (
          <P key={t.id}>- <b>{t.name}</b>{t.cost ? ` (coste ${t.cost})` : ''}{t.description && `: ${t.description}`}</P>
        ))}
        {gm && g.gmNotes && <P color={T.red}>Notas GM: {g.gmNotes}</P>}
      </>}

      <H>Atributos</H>
      <P color={T.dim}>Puntos restantes: {left === Infinity ? 'ilimitados' : left}</P>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 6 }}>
        {ATTRIBUTES.filter((a) => a.group !== 'vital').map((a) => (
          <div key={a.key} style={{ ...box, padding: '6px 10px', display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            <span>{a.label}</span>
            <span><small style={{ color: T.dim }}>{v.points[a.key]} pt{v.bonus[a.key] ? ` +${v.bonus[a.key]}` : ''}  </small><b style={{ color: T.title, fontSize: 16 }}>{attrValue(v, a.key)}</b></span>
          </div>
        ))}
      </div>

      <H>Vitalidad y resistencia</H>
      {ATTRIBUTES.filter((a) => a.group === 'vital').map((a) => {
        const max = attrValue(v, a.key), cur = v.current[a.key as keyof typeof v.current]
        return (
          <div key={a.key} style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '6px 0', fontSize: 13 }}>
            <span style={{ width: 150 }}>{a.label}</span>
            <div style={{ ...box, flex: 1, height: 12, overflow: 'hidden' }}>
              <div style={{ width: `${max > 0 ? Math.max(0, Math.min(100, (cur / max) * 100)) : 0}%`, height: '100%', background: vitColor[a.key as keyof typeof vitColor] }} />
            </div>
            <b style={{ width: 80, textAlign: 'right', color: vitColor[a.key as keyof typeof vitColor] }}>{cur} / {max}</b>
          </div>
        )
      })}

      {F.cond && v.conditions.length > 0 && <>
        <H>Estados y heridas</H>
        {v.conditions.map((k) => <P key={k.id}>- [{k.kind}] {k.name}{k.notes && `: ${k.notes}`}</P>)}
      </>}

      {F.inv && <>
        <H>Inventario</H>
        <P color={T.gold}><b style={{ fontSize: 16 }}>COINS: {v.coins}</b></P>
        {F.inv.map((sec) => {
          const items = v.items.filter((i) => i.section === sec)
          return items.length > 0 && (
            <div key={sec}>
              <P color={T.title}><b>{SECTION_LABEL[sec]}</b></P>
              {items.map((i) => (
                <div key={i.id} style={{ marginLeft: 12 }}>
                  <P><b>- {i.name || 'Sin nombre'} x{i.quantity}{i.equipped ? ' [equipado]' : ''}</b> <span style={{ color: T.dim }}>({i.rarity.replace('_', ' ')}{i.price ? `, ${i.price} COINS` : ''})</span></P>
                  {[i.description, i.effects && `Efectos: ${i.effects}`, i.requirements && `Requisitos: ${i.requirements}`].filter(Boolean).map((s, k) => <P key={k} color={T.dim}>{s}</P>)}
                  {gm && i.gmNotes && <P color={T.red}>GM: {i.gmNotes}</P>}
                </div>
              ))}
            </div>
          )
        })}
      </>}

      {F.story && v.story.length > 0 && <>
        <H>Historia</H>
        {v.story.map((s) => (
          <div key={s.id} style={{ marginBottom: 8 }}>
            <P color={T.violet}><b>{s.title || 'Sin título'}{s.date && ` - ${s.date}`} [{s.section}{gm ? `, ${s.visibility}` : ''}]</b></P>
            <P>{s.text}</P>
          </div>
        ))}
      </>}

      {F.prog && <>
        <H>Progresión</H>
        <P>Nivel {id.level} / Experiencia {id.experience}</P>
        {v.rewards.map((r) => <P key={r.id} color={T.dim}>- {r.date.slice(0, 10)} {r.kind}{r.amount ? ` ${r.amount}` : ''}: {r.description} ({r.source})</P>)}
      </>}

      {gm && v.history.length > 0 && <>
        <H color={T.red}>Historial de cambios</H>
        {v.history.slice(-60).map((h, i) => <P key={i} color={T.dim}>{h.date.slice(0, 16).replace('T', ' ')} {h.by}: {h.change}</P>)}
      </>}
    </div>
  )
}
