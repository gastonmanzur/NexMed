export type DemoSectionId =
  | 'dashboard'
  | 'agenda'
  | 'professionals'
  | 'specialties'
  | 'patients'
  | 'invitations'
  | 'settings'
  | 'notifications'
  | 'subscription';

export const demoData = {
  organizationName: 'Centro Médico Demo NexMed',
  userName: 'Admin Demo',
  sections: [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'agenda', label: 'Agenda' },
    { id: 'professionals', label: 'Profesionales' },
    { id: 'specialties', label: 'Especialidades' },
    { id: 'patients', label: 'Pacientes' },
    { id: 'invitations', label: 'Invitaciones' },
    { id: 'settings', label: 'Configuración' },
    { id: 'notifications', label: 'Recordatorios' },
    { id: 'subscription', label: 'Suscripción' }
  ] as { id: DemoSectionId; label: string }[],
  professionals: [
    { name: 'Dra. Laura Méndez', specialty: 'Clínica médica', status: 'Activa' },
    { name: 'Dr. Martín Rojas', specialty: 'Odontología', status: 'Activo' },
    { name: 'Lic. Camila Torres', specialty: 'Kinesiología', status: 'Activa' },
    { name: 'Est. Valentina Suárez', specialty: 'Estética facial', status: 'Activa' }
  ],
  patients: [
    { name: 'Sofía Ramírez', coverage: 'Plan Integral Salud', memberId: 'PI-458221', emergencyContact: 'Laura Ramírez · +54 11 5555 1010' },
    { name: 'Carlos Benítez', coverage: 'Obra Social Federal', memberId: 'OSF-885214', emergencyContact: 'Marta Benítez · +54 11 5555 2020' },
    { name: 'Mariana López', coverage: 'Prepaga Central', memberId: 'PC-745100', emergencyContact: 'Diego López · +54 11 5555 3030' },
    { name: 'Federico Gómez', coverage: 'Particular', memberId: 'PART-1001', emergencyContact: 'Carla Gómez · +54 11 5555 4040' }
  ],
  appointments: [
    { day: 'Lun', hour: '09:00', patient: 'Sofía Ramírez', type: 'Consulta inicial', status: 'Confirmado', professional: 'Dra. Laura Méndez' },
    { day: 'Mar', hour: '11:30', patient: 'Carlos Benítez', type: 'Revisión odontológica', status: 'Confirmado', professional: 'Dr. Martín Rojas' },
    { day: 'Mié', hour: '14:00', patient: 'Mariana López', type: 'Sesión de kinesiología', status: 'Pendiente', professional: 'Lic. Camila Torres' },
    { day: 'Jue', hour: '16:30', patient: 'Federico Gómez', type: 'Tratamiento estético', status: 'Confirmado', professional: 'Est. Valentina Suárez' }
  ],
  specialties: [
    { name: 'Consulta inicial', description: 'Evaluación de primera consulta', status: 'Activa' },
    { name: 'Control mensual', description: 'Seguimiento periódico', status: 'Activa' },
    { name: 'Tratamiento estético', description: 'Protocolos faciales y corporales', status: 'Activa' },
    { name: 'Revisión odontológica', description: 'Control preventivo odontológico', status: 'Activa' },
    { name: 'Sesión de kinesiología', description: 'Rehabilitación funcional', status: 'Activa' }
  ]
};
