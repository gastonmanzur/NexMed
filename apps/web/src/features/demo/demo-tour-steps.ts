export type DemoTourStep = {
  id: string;
  title: string;
  description: string;
};

export const demoTourSteps: DemoTourStep[] = [
  {
    id: 'demo-dashboard',
    title: 'Bienvenido al panel de tu centro',
    description:
      'Desde acá podés ver el estado general de tu operación: turnos, pacientes, profesionales y recordatorios en un solo lugar.'
  },
  {
    id: 'demo-agenda',
    title: 'Agenda clara y organizada',
    description:
      'Visualizá la semana completa, filtrá por profesional o estado, y gestioná turnos de forma simple y profesional.'
  },
  {
    id: 'demo-professionals',
    title: 'Gestioná tus profesionales',
    description:
      'Cargá profesionales, asigná especialidades y mantené organizado el equipo de atención de tu centro.'
  },
  {
    id: 'demo-specialties',
    title: 'Organizá tus especialidades',
    description: 'Definí los servicios del centro para ordenar la agenda y facilitar la reserva de turnos.'
  },
  {
    id: 'demo-patients',
    title: 'Pacientes vinculados al centro',
    description:
      'Accedé rápidamente al listado de pacientes asociados y consultá su información cuando lo necesites.'
  },
  {
    id: 'demo-patient-detail',
    title: 'Datos importantes siempre disponibles',
    description:
      'Consultá información personal, obra social, contacto de emergencia y datos relevantes para mejorar la atención.'
  },
  {
    id: 'demo-invite',
    title: 'Vinculá pacientes fácilmente',
    description:
      'Compartí un link o código QR para que tus pacientes se registren y queden asociados al centro.'
  },
  {
    id: 'demo-settings',
    title: 'Configurá tu centro a tu manera',
    description:
      'Personalizá la información del centro y ajustá NexMed a la forma de trabajo de tu equipo.'
  },
  {
    id: 'demo-closing',
    title: 'NexMed está listo para ordenar tu centro',
    description:
      'Gestioná agenda, profesionales, pacientes e invitaciones desde una plataforma moderna, simple y preparada para crecer con tu equipo.'
  }
];
