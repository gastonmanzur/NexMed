# NexMed — Checklist de ejecución beta cerrada (Etapa 10)

## 1) Preparación
- [ ] Definir organizaciones beta (allowlist explícita).
- [ ] Confirmar `betaEnabled=true` en organizaciones seleccionadas.
- [ ] Definir usuarios responsables por organización (owner/admin/staff/paciente).
- [ ] Validar ambiente estable (auth, agenda, turnos, paciente self-service, notificaciones).

## 2) Flujos a observar
- [ ] Login y contexto de organización activa.
- [ ] Flujo operativo del centro: profesionales, agenda, turnos.
- [ ] Flujo paciente: reserva, cancelación, reprogramación.
- [ ] Flujo de feedback in-app: envío + confirmación.

## 3) Operación de seguimiento
- [ ] Revisión diaria de `/api/admin/feedback`.
- [ ] Triaging por estado: `new -> triaged -> planned/resolved/wont_fix`.
- [ ] Registro de bloqueantes con SLA < 24h.
- [ ] Comunicación de cambios/fixes con organizaciones beta.

## 4) Criterio de salida de beta cerrada
- [ ] 0 bugs críticos abiertos en flujos core.
- [ ] Tendencia decreciente de feedback repetido en UX operativa.
- [ ] Tiempo de resolución de incidentes dentro del objetivo.
- [ ] Backlog post-beta priorizado y aprobado.
