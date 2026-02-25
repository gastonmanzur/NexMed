import { ReactNode } from "react";

import { Button } from "../Button";
import { Card } from "../Card";

type Props = {
  visible: boolean;
  title?: string;
  dateTimeText: string;
  clinicName: string;
  professionalName: string;
  details?: string;
  ctaText: string;
  disabled?: boolean;
  loading?: boolean;
  loadingText?: string;
  secondaryText?: string;
  onSubmit: () => void;
  onSecondary?: () => void;
  children?: ReactNode;
};

export function DesktopSummaryCard({ visible, title = "Confirmación", dateTimeText, clinicName, professionalName, details, ctaText, disabled, loading, loadingText = "Procesando...", secondaryText, onSubmit, onSecondary, children }: Props) {
  if (!visible) return null;

  return (
    <Card className="desktop-confirm-card">
      <h3>{title}</h3>
      <p>{`Seleccionaste: ${dateTimeText}`}</p>
      <p>Profesional: {professionalName || "Profesional a confirmar"}</p>
      <p>Clínica: {clinicName}</p>
      {details && <p>{details}</p>}
      {children}
      <div className="booking-summary-actions">
        {secondaryText && onSecondary && <Button type="button" className="btn-outline" onClick={onSecondary}>{secondaryText}</Button>}
        <Button type="button" disabled={disabled || loading} onClick={onSubmit}>{loading ? loadingText : ctaText}</Button>
      </div>
    </Card>
  );
}
