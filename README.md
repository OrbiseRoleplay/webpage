# ORBISE ROLEPLAY

Aplicación para dirigir partidas de rol en el universo literario **ORBISE**. Funciona sin conexión y sin registro; los datos se guardan en el propio dispositivo (IndexedDB).

## Arranque

```powershell
npm install
npm run dev        # http://localhost:5173
npm test           # Vitest (lógica de reglas, dados, combate, exportación)
npm run typecheck
npm run build      # build de producción + PWA instalable
```

## Qué incluye (v0.1, modo local)

| Área | Estado |
|---|---|
| Fichas FAERIT: identidad, galería (carrusel, ampliar, principal, ocultar, reordenar) | ✅ |
| Don único con clase asignada solo por el GM, técnicas, imágenes y notas privadas | ✅ |
| 13 atributos oficiales, presupuesto de 25 puntos, bonos e incrementos del GM | ✅ |
| Vitalidad amarilla/roja, resistencia, heridas y estados | ✅ |
| Inventario 10/15/3/10 + propiedades, arrastrar y soltar, 150 COINS, transacciones | ✅ |
| Historia (18 apartados + propios) con visibilidad por entrada | ✅ |
| Progresión y recompensas con origen y fecha | ✅ |
| Dados 3D D6/D20/D60 con críticos (1 = catastrófico, máximo = extraordinario) | ✅ |
| Combate reactivo por tiradas enfrentadas, confirmación del GM | ✅ |
| Panel GM, NPC/enemigos/plantillas, tiradas secretas, narración, deshacer | ✅ |
| Campañas, misiones, diario, escenarios, códigos de invitación | ✅ (local) |
| Exportación PDF (6 variantes + imprimible), PNG, JSON, `.orbise`, copia de seguridad | ✅ |
| Enciclopedia modular (contenido marcado oficial / provisional) | ✅ |
| Sonidos procedurales con 6 volúmenes, ajustes de movimiento y destellos | ✅ |
| Cuentas, sincronización online, tiradas autoritativas en servidor | ⛔ bloqueado: ver `docs/ONLINE.md` |

## Estructura

```
src/rules/config.ts     Reglamento centralizado (único lugar con valores de reglas)
src/domain/             Esquema Zod + lógica pura (personaje, dados, combate)
src/store/useStore.ts   Estado global + autoguardado IndexedDB
src/io/                 .orbise, migraciones, imágenes, PDF, PNG
src/dice3d/             Dados 3D (React Three Fiber)
src/sfx/audio.ts        Sonidos Web Audio procedurales
src/ui/                 Sistema de diseño holográfico
src/screens/            Pantallas
```

## Seguridad: lo que hay y lo que no

- Imágenes importadas: tipo permitido, ≤15 MB, decodificadas y re-codificadas a WebP (no se guarda el archivo original).
- Archivos `.orbise`/`.json`: validados con Zod, versionados y con migraciones; versiones futuras se rechazan.
- Exportaciones públicas y de jugador pasan por `viewFor()`, que elimina secretos y notas del GM.
- **Modo GM local no es seguridad**: en un dispositivo, su dueño controla todos los datos. La protección real de permisos, secretos y tiradas solo existirá con el backend online (RLS + tiradas en servidor).

## Licencias

Sin recursos externos: sonidos generados por código, geometría procedural, fuentes del sistema. Dependencias (todas MIT salvo indicación): react, react-dom, three, @react-three/fiber, zustand, idb-keyval (Apache-2.0), zod, jspdf, html-to-image, motion, tailwindcss, vite, vitest.
