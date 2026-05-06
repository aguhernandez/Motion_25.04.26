import type { Athlete } from '../../lib/types';
import { useT } from '../../lib/LanguageContext';
import { getTheme } from '../../lib/theme';

interface GaitData {
  cadence_spm?: number;
  stride_length_cm?: number;
  contact_time_ms?: number;
  vertical_oscillation_cm?: number;
  foot_strike?: 'heel' | 'midfoot' | 'forefoot' | null;
}

interface GaitDataPanelProps {
  data: GaitData;
  onChange: (data: GaitData) => void;
  athlete?: Athlete | null;
}

const FOOT_STRIKE_OPTIONS: { value: GaitData['foot_strike']; label: string }[] = [
  { value: 'heel', label: 'Talón' },
  { value: 'midfoot', label: 'Mediopié' },
  { value: 'forefoot', label: 'Antepié' },
];

function Field({ label, value, unit, onChange, hint, th }: {
  label: string;
  value?: number;
  unit: string;
  onChange: (v: number | undefined) => void;
  hint?: string;
  th: ReturnType<typeof getTheme>;
}) {
  return (
    <div>
      <label className="block text-xs mb-1" style={{ color: th.sub }}>{label}</label>
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          step="1"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
          className="flex-1 px-2.5 py-1.5 text-sm rounded-lg focus:outline-none min-w-0"
          style={{ background: th.inputBg, border: `1px solid ${th.inputBorder}`, color: th.inputText }}
          onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(253,218,54,0.5)'; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = th.inputBorder; }}
        />
        <span className="text-xs w-8 text-right" style={{ color: th.sub }}>{unit}</span>
      </div>
      {hint && <p className="text-xs mt-0.5" style={{ color: th.empty }}>{hint}</p>}
    </div>
  );
}

export default function GaitDataPanel({ data, onChange, athlete }: GaitDataPanelProps) {
  const { darkMode } = useT();
  const th = getTheme(darkMode);

  return (
    <div className="space-y-3">
      {athlete?.height_cm && (
        <div className="p-2.5 rounded-lg text-xs" style={{ background: th.infoBg, border: `1px solid ${th.infoBorder}` }}>
          <p className="font-medium mb-1" style={{ color: th.infoTitle }}>Datos del Lab</p>
          <p style={{ color: th.infoText }}>
            Altura: <span style={{ color: th.rowText, fontWeight: 600 }}>{athlete.height_cm} cm</span>
          </p>
          {athlete.leg_length_cm && (
            <p style={{ color: th.infoText }}>
              Long. pierna: <span style={{ color: th.rowText, fontWeight: 600 }}>{athlete.leg_length_cm} cm</span>
            </p>
          )}
        </div>
      )}
      <Field label="Cadencia" value={data.cadence_spm} unit="spm" onChange={(v) => onChange({ ...data, cadence_spm: v })} hint="Óptimo: 170–185 pasos/min" th={th} />
      <Field label="Longitud de zancada" value={data.stride_length_cm} unit="cm" onChange={(v) => onChange({ ...data, stride_length_cm: v })} th={th} />
      <Field label="Tiempo de contacto" value={data.contact_time_ms} unit="ms" onChange={(v) => onChange({ ...data, contact_time_ms: v })} hint="Élite: 160–200 ms" th={th} />
      <Field label="Oscilación vertical" value={data.vertical_oscillation_cm} unit="cm" onChange={(v) => onChange({ ...data, vertical_oscillation_cm: v })} hint="Óptimo: 6–8 cm" th={th} />
      <div>
        <label className="block text-xs mb-1.5" style={{ color: th.sub }}>Tipo de pisada</label>
        <div className="flex gap-1.5">
          {FOOT_STRIKE_OPTIONS.map((opt) => {
            const active = data.foot_strike === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => onChange({ ...data, foot_strike: active ? null : opt.value })}
                className="flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-all"
                style={
                  active
                    ? { background: '#fdda36', border: '1px solid rgba(253,218,54,0.6)', color: '#514163' }
                    : { background: th.btnBg, border: `1px solid ${th.btnBorder}`, color: th.btnText }
                }
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
