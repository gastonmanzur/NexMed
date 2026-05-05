import type { ReactElement } from 'react';
import { Card } from '@starter/ui';

export const OrganizationReminderRulesPage = (): ReactElement => {
  return (
    <main style={{ maxWidth: 760, margin: '2rem auto', padding: '1rem' }}>
      <Card title="Recordatorios de pacientes">
        <p>
          Los recordatorios ahora se calculan automáticamente por algoritmo desde la fecha de reserva/reprogramación:
          <strong> mitad (t1), mitad restante (t2) y último aviso (1 día antes o 1 minuto en testing).</strong>
        </p>
        <p>
          Esta pantalla queda informativa para evitar configuraciones ambiguas con offsets manuales.
        </p>
      </Card>
    </main>
  );
};
