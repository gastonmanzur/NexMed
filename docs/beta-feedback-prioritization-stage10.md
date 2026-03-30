# NexMed — Criterio de priorización post-beta (Etapa 10)

## Clasificación funcional
- **bug crítico**: rompe flujo core (reservar/cancelar/reprogramar/login).
- **bug no bloqueante**: error real con workaround viable.
- **mejora UX**: reduce fricción, claridad o tiempo de tarea.
- **mejora operativa**: mejora gestión diaria del centro.
- **feature futura**: propuesta fuera del alcance inmediato.

## Matriz de prioridad
1. **P0 (bloqueante)**
   - Impacto alto + frecuencia alta en flujo core.
   - Acción: corregir antes de ampliar beta.

2. **P1 (alto impacto)**
   - Impacto alto pero no bloqueante total.
   - Acción: siguiente sprint.

3. **P2 (mejora rápida)**
   - Bajo riesgo/alto valor UX u operativo.
   - Acción: quick wins post-beta.

4. **P3 (futura)**
   - Valor estratégico, requiere validación adicional.
   - Acción: discovery + roadmap extendido.

## Reglas de decisión
- Si hay conflicto entre feature nueva y bug en flujo core, **priorizar bug**.
- Si un feedback se repite en >=3 organizaciones beta, subir prioridad.
- Toda decisión `wont_fix` debe registrar motivo en `adminNotes`.
