import { Button } from "./Button";

type Props = {
  visible: boolean;
  dateTimeText: string;
  clinicName: string;
  professionalName: string;
  disabled: boolean;
  loading: boolean;
  onReserve: () => void;
};

export function MobileStickyBookingBar({ visible, dateTimeText, clinicName, professionalName, disabled, loading, onReserve }: Props) {
  if (!visible) return null;

  return (
    <div className="mobile-sticky-booking-bar">
      <div>
        <strong>Turno seleccionado</strong>
        <div>{dateTimeText || "Elegí fecha y horario"}</div>
        <small>Clínica: {clinicName}</small>
        <small>Profesional: {professionalName || "A confirmar"}</small>
      </div>
      <Button type="button" disabled={disabled || loading} onClick={onReserve}>{loading ? "Reservando..." : "Reservar"}</Button>
    </div>
  );
}
