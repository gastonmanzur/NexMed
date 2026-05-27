export const demoData = {
  organizationName: 'Centro Médico Demo NexMed',
  userName: 'Admin Demo',
  professionals: [
    { name: 'Dra. Laura Méndez', specialty: 'Clínica médica' },
    { name: 'Dr. Martín Rojas', specialty: 'Odontología' },
    { name: 'Lic. Camila Torres', specialty: 'Kinesiología' },
    { name: 'Est. Valentina Suárez', specialty: 'Estética facial' }
  ],
  patients: [
    { name: 'Sofía Ramírez', coverage: 'Plan Integral Salud', emergencyContact: 'Laura Ramírez · +54 11 5555 1010' },
    { name: 'Carlos Benítez', coverage: 'Obra Social Federal', emergencyContact: 'Marta Benítez · +54 11 5555 2020' },
    { name: 'Mariana López', coverage: 'Prepaga Central', emergencyContact: 'Diego López · +54 11 5555 3030' },
    { name: 'Federico Gómez', coverage: 'Particular', emergencyContact: 'Carla Gómez · +54 11 5555 4040' }
  ],
  appointments: [
    { hour: '09:00', patient: 'Sofía Ramírez', type: 'Consulta inicial', status: 'Confirmado', professional: 'Dra. Laura Méndez' },
    { hour: '11:30', patient: 'Carlos Benítez', type: 'Revisión odontológica', status: 'Confirmado', professional: 'Dr. Martín Rojas' },
    { hour: '14:00', patient: 'Mariana López', type: 'Sesión de kinesiología', status: 'Pendiente', professional: 'Lic. Camila Torres' },
    { hour: '16:30', patient: 'Federico Gómez', type: 'Tratamiento estético', status: 'Confirmado', professional: 'Est. Valentina Suárez' }
  ],
  specialties: ['Consulta inicial', 'Control mensual', 'Tratamiento estético', 'Revisión odontológica', 'Sesión de kinesiología']
};
