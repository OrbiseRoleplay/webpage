# CHANGELOG

## 0.1.0 — 2026-11-27 · Primera versión funcional (modo local)

### AGENTE 00 Director
- Arquitectura React 19 + TS + Vite 8 + Tailwind 4, contratos en `AGENTS.md`.
- Reglamento centralizado (`rules/config.ts`), esquema Zod versionado, migraciones, store con autoguardado IndexedDB y recuperación de datos dañados.
- Integración y QA: selector inestable de Zustand en combate (bucle infinito), acceso a combate desde el panel GM, dado atascado con pocos FPS, logotipo desbordado en móvil.

### AGENTE 01 UI/UX
- Sistema de diseño holográfico, pantalla inicial, menú principal, partículas, notificaciones, indicador de guardado, configuración de accesibilidad y volumen.

### AGENTE 02/03/07 Personajes · Reglamento · Inventario
- Ficha completa: identidad, galería en carrusel, don con emblema por clase (OMEGA animado), atributos con presupuesto de 25 puntos, vitalidad y estados, inventario con arrastrar y soltar, COINS, historia con visibilidad, progresión e historial.

### AGENTE 04/08 Combate · Game Master (Sonnet)
- Combate por tiradas enfrentadas, 4 reacciones, límite de 3 defensas, resolución manual de empates y críticos, confirmación de daños por el GM.
- Panel GM, campañas, misiones, diario, escenarios, narración.

### AGENTE 05/06 VFX · SFX (Sonnet)
- Dados 3D D6/D20/D60 (pentakis dodecaedro) que aterrizan en la cara del resultado real; efectos de fracaso catastrófico y éxito extraordinario; sonidos procedurales.

### AGENTE 10 Exportación (Sonnet)
- PDF vectorial en 6 variantes + imprimible, PNG, JSON, `.orbise` con imágenes, importación, copia de seguridad y restauración.

### AGENTE 11 QA
- 30 tests (reglas de personaje, dados, combate, geometría de dados, exportación/privacidad). Recorrido manual en el navegador, escritorio y móvil.

### Bloqueado
- AGENTE 09 Online: sin credenciales Supabase (`docs/ONLINE.md`).
