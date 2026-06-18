import type { ReactElement } from 'react';

export const ProfessionalClinicalHistoryPage = (): ReactElement => (
  <section className="professional-dashboard">
    <div className="pro-hero">
      <div>
        <span>Historia clínica</span>
        <h1>Historia clínica</h1>
        <p>Seleccioná un paciente desde Agenda del día o Pacientes para ver su historia clínica.</p>
      </div>
      <div className="pro-hero__status">Disponible por paciente</div>
    </div>
    <section className="pro-panel">
      <header className="pro-section-header"><div><span>Acceso contextual</span><h2>Seleccioná un paciente</h2></div></header>
      <div className="pro-empty"><strong>Historia clínica</strong><p>Seleccioná un paciente desde Agenda del día o Pacientes para ver su historia clínica.</p></div>
    </section>
  </section>
);
