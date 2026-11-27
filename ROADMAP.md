# ROADMAP

| Fase | Estado |
|---|---|
| 01 Arquitectura, dependencias, sistema de diseño | ✅ |
| 02 Menú, navegación, interfaz holográfica | ✅ |
| 03 Personajes, atributos, galería | ✅ |
| 04 Persistencia local, importación/exportación | ✅ |
| 05 Dones, inventario, historia, progresión | ✅ |
| 06 Dados animados y críticos | ✅ |
| 07 Combate reactivo | ✅ |
| 08 Panel GM local | ✅ |
| 09 Campañas, misiones, NPC, escenarios | ✅ local (unirse con código requiere fase 10) |
| 10 Cuentas, backend, sincronización | ⛔ bloqueado: sin credenciales Supabase (`docs/ONLINE.md`) |
| 11 Sonidos, animaciones avanzadas, optimización | 🟡 sonidos y animaciones hechos; falta carga diferida de jsPDF/three |
| 12 Pruebas, seguridad, documentación | 🟡 30 tests unitarios + verificación manual; falta Playwright E2E |

## Pendiente
- Pruebas E2E con Playwright (crear ficha → combate → exportar).
- Carga diferida (`import()`) de pantallas de dados/exportación para reducir el bundle inicial.
- Subida de imágenes en misiones (`Mission.images` existe en el esquema).
- Mensajería GM/jugadores y susurros (requieren backend).
- Reglas pendientes de definición oficial (ver `src/rules/config.ts → PENDING_RULES`): se resuelven a mano.
