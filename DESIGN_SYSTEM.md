# DESIGN_SYSTEM.md — Interfaz holográfica ORBISE

## Paleta (tokens Tailwind en `src/index.css`)

| Token | Hex | Uso |
|---|---|---|
| `void` | #060B14 | Fondo |
| `panel` | #101C2D | Paneles |
| `holo` | #5DEEFF | Acento principal, resistencia |
| `electric` | #4285FF | Secundario |
| `energy` | #A56BFF | Dones, modo GM |
| `gold` | #FFD66B | Éxito extraordinario, OMEGA, COINS, vitalidad amarilla |
| `doom` | #FF3C55 | Fracaso catastrófico, vitalidad roja, borrar |
| `good` | #4EE8A0 | Positivo, guardado |
| `ink` | #E8F7FF | Texto |

## Tipografía
`font-display` = **Unbounded** (ancha, rotunda; títulos y menú, en minúscula de frase). `font-sans` = **Atkinson Hyperlegible** (lectura). Ambas OFL, empaquetadas para uso sin conexión. Sin etiquetas en mayúsculas espaciadas.

## Componentes (`src/ui/kit.tsx`)
`Panel` (cristal + líneas de escaneo + aparición holográfica), `Btn` (tonos holo/gold/doom/good/energy/ghost), `Field`, `Text`, `Num`, `Bar` (barra animada que tiembla al bajar), `Counter` (número animado), `Tabs`, `Modal`, `Toasts`, `Empty`. `Gallery` (carrusel con gestos táctiles), `Ambient` (partículas), `SaveIndicator`.

## Clases utilitarias
`.holo-panel`, `.scanlines`, `.scan-sweep` (barrido de escaneo), `.glitch`, `.text-glow`, `.text-gold-glow`, `.text-doom-glow`, `.holo-input`.

## Accesibilidad
- `--fx` (0–1) escala brillos según la intensidad visual; «Desactivar destellos» lo limita a 0,4 y quita los flashes de pantalla.
- «Reducir movimiento» añade `.no-motion` (anula animaciones) y acorta las tiradas a ~0,3 s.
- Foco visible en cian, roles ARIA en pestañas/diálogos/carrusel, textos sobre fondo oscuro con contraste alto.

## Motivos de ORBISE
- **El orbe** (`src/ui/Orb.tsx`): cristal facetado con caras en tonos ópalo, anillo orbital violeta, núcleo dorado. Cristaliza al entrar: es el único momento animado sin interacción.
- **La lluvia verde** (`#4EE8A0`): la mutación que despertó los Dones. Cae a través del orbe y, muy tenue, en el fondo de todas las pantallas.
- **Fragmento de cristal** (rombo) como marcador de la entrada activa del menú.
- Logotipo con relleno ópalo cian → violeta → oro (`.orbise-wordmark`).
