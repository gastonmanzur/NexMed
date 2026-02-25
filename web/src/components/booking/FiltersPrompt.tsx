import { Professional, Specialty } from "../../types";

type Props = {
  open: boolean;
  specialties: Specialty[];
  professionals: Professional[];
  onPickSpecialty: (value: string) => void;
  onPickProfessional: (value: string) => void;
  onClose: () => void;
};

export function FiltersPrompt({ open, specialties, professionals, onPickProfessional, onPickSpecialty, onClose }: Props) {
  if (!open) return null;

  return (
    <div className="booking-filters-prompt-backdrop" role="presentation" onClick={onClose}>
      <div className="booking-filters-prompt" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h4>Para reservar, elegí un profesional o una especialidad</h4>
        <div className="grid-2">
          <label className="booking-filter">
            <span>Elegir especialidad</span>
            <select className="input" defaultValue="" onChange={(e) => e.target.value && onPickSpecialty(e.target.value)}>
              <option value="" disabled>Seleccionar</option>
              {specialties.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
          </label>
          <label className="booking-filter">
            <span>Elegir profesional</span>
            <select className="input" defaultValue="" onChange={(e) => e.target.value && onPickProfessional(e.target.value)}>
              <option value="" disabled>Seleccionar</option>
              {professionals.map((p) => <option key={p._id} value={p._id}>{p.displayName || `${p.firstName} ${p.lastName}`.trim()}</option>)}
            </select>
          </label>
        </div>
      </div>
    </div>
  );
}
