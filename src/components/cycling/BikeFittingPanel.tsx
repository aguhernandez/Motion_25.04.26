import type { Athlete } from '../../lib/types';
import { useT } from '../../lib/LanguageContext';
import { getTheme } from '../../lib/theme';

interface BikeFittingData {
  saddle_height_mm?: number;
  saddle_setback_mm?: number;
  reach_mm?: number;
  cadence_rpm?: number;
}

interface BikeFittingPanelProps {
  data: BikeFittingData;
  onChange: (data: BikeFittingData) => void;
  athlete?: Athlete | null;
}

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

export default function BikeFittingPanel({ data, onChange, athlete }: BikeFittingPanelProps) {
  const { darkMode } = useT();
  const th = getTheme(darkMode);
  const recommendedSaddleHeight = athlete?.inseam_cm ? Math.round(athlete.inseam_cm * 10 * 0.883) : null;

  return (
    <div className="space-y-3">
      {athlete?.inseam_cm && (
        <div className="p-2.5 rounded-lg text-xs" style={{ background: th.infoBg, border: `1px solid ${th.infoBorder}` }}>
          <p className="font-medium mb-1" style={{ color: th.infoTitle }}>Datos del Lab</p>
          <p style={{ color: th.infoText }}>
            Entrepierna: <span style={{ color: th.rowText, fontWeight: 600 }}>{athlete.inseam_cm} cm</span>
          </p>
          {recommendedSaddleHeight && (
            <p style={{ color: th.infoText }}>
              Altura saddle estimada:{' '}
              <span style={{ color: '#fdda36', fontWeight: 600 }}>{recommendedSaddleHeight} mm</span>
              <span className="ml-1" style={{ color: th.sub }}>(×0.883)</span>
            </p>
          )}
        </div>
      )}
      <Field label="Altura de Saddle" value={data.saddle_height_mm} unit="mm" onChange={(v) => onChange({ ...data, saddle_height_mm: v })} hint={recommendedSaddleHeight ? `Ref: ${recommendedSaddleHeight} mm` : undefined} th={th} />
      <Field label="Setback de Saddle" value={data.saddle_setback_mm} unit="mm" onChange={(v) => onChange({ ...data, saddle_setback_mm: v })} th={th} />
      <Field label="Reach al Manillar" value={data.reach_mm} unit="mm" onChange={(v) => onChange({ ...data, reach_mm: v })} th={th} />
      <Field label="Cadencia" value={data.cadence_rpm} unit="rpm" onChange={(v) => onChange({ ...data, cadence_rpm: v })} hint="Óptimo: 85–105 rpm" th={th} />
    </div>
  );
}
