# NexMed — Checklist QA funcional manual (Etapa 9)

> Objetivo: validar flujos críticos end-to-end antes de staging/producción.

## 1) Flujos del centro

### Auth y contexto
- [ ] Login con usuario owner/admin/staff.
- [ ] Refresh de sesión al recargar (sin reenviar credenciales).
- [ ] Logout y logout-all.
- [ ] Cambio de organización activa y navegación asociada.

### Organización y onboarding
- [ ] Crear organización nueva.
- [ ] Ver onboarding status.
- [ ] Completar perfil (timezone, contacto, ciudad, país).
- [ ] Editar perfil organizacional existente.

### Operación diaria
- [ ] Alta y edición de profesionales.
- [ ] Alta y edición de especialidades.
- [ ] Crear reglas de disponibilidad.
- [ ] Crear excepción de disponibilidad (bloqueo parcial y día completo).
- [ ] Crear turno manual.
- [ ] Cancelar turno.
- [ ] Reprogramar turno.
- [ ] Configurar reminder rules.
- [ ] Ver dashboard-summary con datos consistentes.

## 2) Flujos del paciente

### Join y perfil
- [ ] Abrir join link/QR sin sesión iniciada.
- [ ] Login/registro y resolve join.
- [ ] Ver organizaciones vinculadas.
- [ ] Editar perfil paciente (teléfono, documento, fecha de nacimiento).

### Reserva y seguimiento
- [ ] Ver catálogo (profesionales/especialidades) de una organización vinculada.
- [ ] Consultar disponibilidad.
- [ ] Reservar turno self-service.
- [ ] Ver “mis turnos” (upcoming/history).
- [ ] Cancelar turno según política.
- [ ] Reprogramar turno según política.
- [ ] Crear solicitud de waitlist.
- [ ] Cancelar solicitud de waitlist.
- [ ] Ver notificaciones/eventos de paciente.

## 3) Flujos transversales

### Permisos
- [ ] Owner/Admin/Staff: acceso esperado a operaciones del centro.
- [ ] Paciente: sin acceso a endpoints/rutas del centro.
- [ ] Usuario sin membresía activa: bloqueado en rutas de organización.

### Errores esperados y resiliencia
- [ ] 400 en datos inválidos (fechas, ids, payloads).
- [ ] 401 en token inválido/expirado.
- [ ] 403 en permisos insuficientes.
- [ ] 404 en recursos inexistentes.
- [ ] 409 en conflicto de disponibilidad de turno.
- [ ] Mensajes de error visibles y recuperación posible desde la UI.

## 4) Regresión mínima por fix crítico

Si se corrige un bug en:
- auth → revalidar login + refresh + logout.
- disponibilidad → revalidar consulta de slots + creación de turno.
- appointments → revalidar crear/cancelar/reprogramar + waitlist.
- permisos → revalidar matriz por rol.
