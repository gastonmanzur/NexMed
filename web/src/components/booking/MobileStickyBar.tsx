import { Button } from "../Button";

type Props = {
  visible: boolean;
  dateTimeText: string;
  clinicName: string;
  professionalName: string;
  ctaText: string;
  disabled?: boolean;
  loading?: boolean;
  loadingText?: string;
  secondaryText?: string;
  onSubmit: () => void;
  onSecondary?: () => void;
};

export function MobileStickyBar({ visible, dateTimeText, clinicName, professionalName, ctaText, disabled, loading, loadingText = "Procesando...", secondaryText, onSubmit, onSecondary }: Props) {
  if (!visible) return null;

  return (
    <div className="mobile-sticky-booking-bar">
      <div>
        <strong>Turno seleccionado</strong>
        <div>{dateTimeText || "Elegí fecha y horario"}</div>
        <small>Clínica: {clinicName}</small>
        <small>Profesional: {professionalName || "A confirmar"}</small>
      </div>
      <div className="mobile-sticky-actions">
        {secondaryText && onSecondary && <Button type="button" className="btn-outline" onClick={onSecondary}>{secondaryText}</Button>}
        <Button type="button" disabled={disabled || loading} onClick={onSubmit}>{loading ? loadingText : ctaText}</Button>
      </div>
    </div>
  );
}
