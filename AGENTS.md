# AGENTS.md — Organización y contratos

Reglas para cualquier agente (humano o IA) que modifique ORBISE ROLEPLAY.

## Reglas comunes

1. **Contratos compartidos (solo AGENTE 00 los modifica):**
   - `src/rules/config.ts` — reglamento. Ningún valor de regla fuera de aquí.
   - `src/domain/schema.ts` — modelo de datos (Zod). Cambiarlo exige subir `FORMAT_VERSION` y añadir migración en `src/io/migrate.ts`.
   - `src/domain/character.ts`, `dice.ts`, `combat.ts` — lógica pura.
   - `src/store/useStore.ts` — estado global y persistencia.
   - `src/ui/kit.tsx` — componentes base (`Panel`, `Btn`, `Field`, `Text`, `Num`, `Bar`, `Counter`, `Tabs`, `Modal`, `Empty`).
2. Cada agente edita **solo sus archivos**. Si necesita cambiar un contrato, lo pide al Director.
3. Tiradas: **siempre** `roll()` de `domain/dice.ts` (crypto, sin sesgo). La animación muestra el valor ya calculado; nunca al revés.
4. Críticos: 1 = FRACASO CATASTRÓFICO, máximo = ¡ÉXITO EXTRAORDINARIO!. Sin consecuencias automáticas.
5. Exportar/compartir: pasar SIEMPRE por `viewFor(c, audiencia)` para no filtrar datos privados.
6. Sin recursos externos con licencia: sonidos en `src/sfx/audio.ts` (procedurales), geometría procedural.
7. `npm run typecheck` y `npm test` deben pasar antes de entregar.

## Asignación de archivos

| Agente | Responsabilidad | Archivos |
|---|---|---|
| 00 Director | Arquitectura, contratos, integración | `rules/`, `domain/`, `store/`, `App.tsx`, docs |
| 01 UI/UX | Sistema de diseño, menú, splash, ajustes | `ui/`, `index.css`, `screens/MainMenu.tsx`, `Splash.tsx`, `SettingsScreen.tsx` |
| 02 Personajes | Ficha y galería | `screens/CharacterList.tsx`, `screens/editor/*` (salvo `ExportPanel.tsx`) |
| 03 Reglamento | Atributos, dones, vitalidad | `screens/editor/AttributesTab.tsx`, `GiftTab.tsx`, `VitalsTab.tsx`, `screens/RulesScreen.tsx` |
| 04 Combate | Tiradas enfrentadas | `screens/CombatScreen.tsx`, `screens/combat/*` |
| 05 VFX + 06 SFX | Dados 3D y efectos | `dice3d/*`, `screens/DiceScreen.tsx` |
| 07 Inventario | Economía y objetos | `screens/editor/InventoryTab.tsx` |
| 08 Game Master | Panel GM, campañas | `screens/GameMasterScreen.tsx`, `screens/CampaignsScreen.tsx`, `screens/gm/*` |
| 09 Online | Supabase (bloqueado: sin credenciales) | `docs/ONLINE.md` |
| 10 Exportación | PDF, PNG, JSON, .orbise | `io/orbise.ts`, `io/pdf.ts`, `io/png.ts`, `screens/editor/ExportPanel.tsx` |
| 11 QA | Pruebas | `src/**/*.test.ts` |
| 12 Seguridad | Validación, privacidad | `io/images.ts`, `io/migrate.ts`, `viewFor` |

## Contratos de componentes

```ts
// dice3d/Die3D.tsx — AGENTE 05
export interface Die3DProps {
  sides: 6 | 20 | 60
  result: RollResult | null // cuando cambia result.id, anima hasta mostrar result.value
  size?: number             // px, por defecto 220
  onSettled?: (r: RollResult) => void
}

// screens/editor/ExportPanel.tsx — AGENTE 10
export function ExportPanel(props: { character: Character }): JSX.Element
```

## Registro de progreso

Ver `CHANGELOG.md`.
