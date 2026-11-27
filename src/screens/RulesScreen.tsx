import { ATTRIBUTES, PENDING_RULES, RULES } from '../rules/config'
import { Panel } from '../ui/kit'

export function RulesScreen() {
  return (
    <div className="space-y-3">
      <Panel title="Atributos oficiales">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-holo/70 uppercase"><th className="py-1">Atributo</th><th>Base</th><th>Incremento por punto</th></tr></thead>
            <tbody>
              {ATTRIBUTES.map((a) => (
                <tr key={a.key} className="border-t border-white/5">
                  <td className="py-1.5">{a.icon} {a.label}</td><td>{a.base}</td>
                  <td>{a.perPoint}{a.provisional && <span className="ml-1 text-[10px] text-gold uppercase">provisional</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-ink/60">Presupuesto inicial: {RULES.initialPoints} puntos. Referencia visual de atributos generales: {RULES.attributeVisualRef} (no es un límite). No existe tope permanente.</p>
      </Panel>
      <Panel title="Dados y críticos">
        <p className="text-sm">Dados oficiales: D6, D20 (habitual) y D60.</p>
        <ul className="mt-2 space-y-1 text-sm">
          <li><b className="text-doom">1</b> → FRACASO CATASTRÓFICO: consecuencias fatales determinadas por el GM.</li>
          <li><b className="text-gold">Máximo del dado</b> (6, 20 o 60) → ¡ÉXITO EXTRAORDINARIO!: consecuencias increíbles determinadas por el GM.</li>
          <li>La app no aplica daño, muerte ni recompensas automáticas por críticos.</li>
        </ul>
      </Panel>
      <Panel title="Combate reactivo">
        <p className="text-sm">El atacante declara y tira; el objetivo elige reacción y tira; se comparan resultados sin modificadores; el GM confirma las consecuencias.</p>
        <ul className="mt-2 space-y-1 text-sm">
          {Object.values(RULES.reactions).map((r) => <li key={r.label}><b className="text-holo">{r.label}:</b> {r.success}</li>)}
          <li><b className="text-doom">Reacción fallida:</b> el objetivo recibe el ataque o sus consecuencias.</li>
          <li>Defensa sólida exitosa: máximo {RULES.reactions.defenderse.maxSuccessPerCombat} por combate.</li>
        </ul>
      </Panel>
      <Panel title="Dones y economía">
        <p className="text-sm">Un único don por personaje FAERIT. Clases: {RULES.giftClasses.join(', ')} (asignadas solo por el GM, sin multiplicadores automáticos).</p>
        <p className="mt-1 text-sm">Inicio: {RULES.startingCoins} COINS. Espacios: equipamiento {RULES.inventory.equipamiento}, consumibles {RULES.inventory.consumibles}, armas {RULES.inventory.armas}, otros {RULES.inventory.otros}; propiedades aparte.</p>
      </Panel>
      <Panel title="Reglas pendientes (resolución manual del GM)" className="!border-gold/40">
        <ul className="list-inside list-disc space-y-0.5 text-sm text-gold/90">{PENDING_RULES.map((r) => <li key={r}>{r}</li>)}</ul>
      </Panel>
    </div>
  )
}
