import type { PatientOrganizationLinkStatus, PatientProfileDto } from '@starter/shared-types';
import type { ReactElement } from 'react';
import { useEffect, useId, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';

const FALLBACK = '—';

export type PatientDetailModalData = {
  patientProfile: PatientProfileDto;
  email: string | null;
  avatarUrl?: string | null;
  linkedAt: string | null;
  linkStatus?: PatientOrganizationLinkStatus | null;
  totalAppointments: number | null;
  lastAppointmentAt: string | null;
  ownerName: string | null;
};

type PatientDetailModalProps = {
  patient: PatientDetailModalData | null;
  isOpen?: boolean;
  loading?: boolean;
  error?: string;
  onClose: () => void;
};

export const getPatientFullName = (patient: { firstName: string | null; lastName: string | null }): string =>
  `${patient.firstName ?? ''} ${patient.lastName ?? ''}`.trim() || 'Paciente sin nombre';

const formatDate = (value: string | null): string => (value ? new Date(value).toLocaleDateString('es-AR') : FALLBACK);
const formatDateTime = (value: string | null): string => (value ? new Date(value).toLocaleString('es-AR') : FALLBACK);
const formatValue = (value: string | number | null | undefined): string => (value === null || value === undefined || value === '' ? FALLBACK : String(value));

const DetailRow = ({ label, value }: { label: string; value: string | number | null | undefined }): ReactElement => (
  <p><span>{label}</span>{formatValue(value)}</p>
);

export const PatientDetailModal = ({ patient, isOpen = false, loading = false, error = '', onClose }: PatientDetailModalProps): ReactElement | null => {
  const modalTitleId = useId();
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!patient && !isOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, patient]);

  const initials = useMemo(
    () => patient ? `${patient.patientProfile.firstName?.[0] ?? ''}${patient.patientProfile.lastName?.[0] ?? ''}`.toUpperCase() || 'P' : 'P',
    [patient]
  );
  const address = patient
    ? [patient.patientProfile.address, patient.patientProfile.city, patient.patientProfile.province].filter(Boolean).join(', ')
    : '';

  if (!patient && !isOpen) return null;

  const patientProfile = patient?.patientProfile;

  return createPortal(
    <div className="nx-patient-modal" role="dialog" aria-modal="true" aria-labelledby={modalTitleId}>
      <button className="nx-patient-modal__overlay" type="button" aria-label="Cerrar detalle del paciente" onClick={onClose} />
      <div className="nx-patient-modal__content">
        <button
          ref={closeButtonRef}
          className="nx-patient-modal__close"
          type="button"
          aria-label="Cerrar detalle del paciente"
          onClick={onClose}
        >
          Cerrar
        </button>
        <header className="nx-patient-modal__header">
          <span className="nx-patient-avatar nx-patient-avatar--large">{initials}</span>
          <div>
            <h2 id={modalTitleId}>{patientProfile ? getPatientFullName(patientProfile) : 'Datos del paciente'}</h2>
            {patientProfile?.relationshipToOwner ? <p className="nx-muted">{patientProfile.relationshipToOwner} · Responsable de cuenta: {patient?.ownerName ?? FALLBACK}</p> : null}
          </div>
        </header>
        {loading ? <p className="nx-patients-status">Cargando detalle...</p> : null}
        {error ? <p className="nx-patients-status nx-patients-status--error">{error}</p> : null}
        {patient && !loading && !error ? (
          <section className="nx-patient-modal__grid">
            <article className="nx-patient-block">
              <h3>Datos personales</h3>
              <DetailRow label="Tipo de perfil" value={patient.patientProfile.isPrimaryProfile ? 'Titular' : 'Familiar'} />
              <DetailRow label="Relación con titular" value={patient.patientProfile.relationshipToOwner} />
              <DetailRow label="Documento" value={patient.patientProfile.documentId} />
              <DetailRow label="Nacimiento" value={formatDate(patient.patientProfile.dateOfBirth)} />
              <DetailRow label="Sexo / género" value={patient.patientProfile.sex} />
              <DetailRow label="Teléfono" value={patient.patientProfile.phone} />
              <DetailRow label="Email" value={patient.email} />
              <DetailRow label="Dirección" value={address} />
            </article>
            <article className="nx-patient-block">
              <h3>Cobertura médica</h3>
              <DetailRow label="Obra social / prepaga" value={patient.patientProfile.insuranceProvider} />
              <DetailRow label="N° de afiliado" value={patient.patientProfile.insuranceMemberId} />
              <DetailRow label="Plan" value={patient.patientProfile.insurancePlan} />
            </article>
            <article className="nx-patient-block">
              <h3>Contacto de emergencia</h3>
              <DetailRow label="Nombre" value={patient.patientProfile.emergencyContactName} />
              <DetailRow label="Teléfono" value={patient.patientProfile.emergencyContactPhone} />
              <DetailRow label="Relación" value={patient.patientProfile.emergencyContactRelationship} />
            </article>
            <article className="nx-patient-block">
              <h3>Información de salud</h3>
              <DetailRow label="Grupo sanguíneo" value={patient.patientProfile.bloodType} />
              <DetailRow label="Alergias" value={patient.patientProfile.allergies} />
              <DetailRow label="Medicación habitual" value={patient.patientProfile.regularMedication} />
              <DetailRow label="Preexistentes" value={patient.patientProfile.preexistingConditions} />
              <DetailRow label="Observaciones médicas" value={patient.patientProfile.medicalNotes} />
            </article>
            <article className="nx-patient-block">
              <h3>Actividad y vinculación</h3>
              <DetailRow label="Responsable de cuenta" value={patient.ownerName} />
              <DetailRow label="Relación con titular" value={patient.patientProfile.relationshipToOwner} />
              <DetailRow label="Vinculación" value={formatDate(patient.linkedAt)} />
              <DetailRow label="Turnos" value={patient.totalAppointments} />
              <DetailRow label="Último turno" value={formatDateTime(patient.lastAppointmentAt)} />
            </article>
          </section>
        ) : null}
      </div>
    </div>,
    document.body
  );
};
