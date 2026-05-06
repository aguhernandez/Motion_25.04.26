import { useT } from '../../lib/LanguageContext';
import { getTheme } from '../../lib/theme';

export interface LiftData {
  weight_kg?: number;
  reps?: number;
  sets?: number;
  rpe?: number;
  one_rm_kg?: number;
  bar_velocity_ms?: number;
  peak_power_w?: number;
  phase?: string;
}

interface WeightliftingDataPanelProps {
  data: LiftData;
  onChange: (data: LiftData) => void;
  accentColor: string;
}

function calcOneRM(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight;
  return Math.round(weight / (1.0278 - 0.0278 * reps));
}

function calcRelativePower(weight: number, velocity: number): number {
  if (!velocity || !weight) return 0;
  return Math.round(weight * velocity * 9.81);
}

export default function WeightliftingDataPanel({ data, onChange, accentColor }: WeightliftingDataPanelProps) {
  const { darkMode } = useT();
  const th = getTheme(darkMode);

  const set = (key: keyof LiftData, val: string) => {
    const num = parseFloat(val);
    onChange({ ...data, [key]: isNaN(num) ? undefined : num });
  };

  const computedOneRM = data.weight_kg && data.reps ? calcOneRM(data.weight_kg, data.reps) : null;
  const computedPower = data.weight_kg && data.bar_velocity_ms ? calcRelativePower(data.weight_kg, data.bar_velocity_ms) : null;
  const rpeColors: Record<number, string> = { 6: '#10b981', 7: '#10b981', 8: '#f59e0b', 9: '#f97316', 10: '#ef4444' };
  const rpeColor = data.rpe ? rpeColors[Math.round(data.rpe)] ?? '#06b6d4' : accentColor;

  const inputStyle = {
    background: th.inputBg,
    border: `1px solid ${th.inputBorder}`,
    color: th.inputText,
  };

  const metricStyle = {
    background: th.infoBg,
    border: `1px solid ${th.infoBorder}`,
  };

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: th.panelBg, border: `1px solid ${th.panelBorder}` }}>
      <div className="px-4 py-3 border-b" style={{ borderColor: th.panelHeaderBorder }}>
        <span className="text-sm font-semibold" style={{ color: th.title }}>Datos del levantamiento</span>
      </div>
      <div className="p-3 space-y-3">

        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-xs mb-1" style={{ color: th.sub }}>Carga (kg)</label>
            <input
              type="number"
              min="0"
              step="0.5"
              value={data.weight_kg ?? ''}
              onChange={(e) => set('weight_kg', e.target.value)}
              placeholder="100"
              className="w-full px-2 py-1.5 text-sm rounded-lg focus:outline-none"
              style={inputStyle}
              onFocus={(e) => { e.currentTarget.style.borderColor = `${accentColor}60`; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = th.inputBorder; }}
            />
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: th.sub }}>Reps</label>
            <input
              type="number"
              min="1"
              max="30"
              value={data.reps ?? ''}
              onChange={(e) => set('reps', e.target.value)}
              placeholder="3"
              className="w-full px-2 py-1.5 text-sm rounded-lg focus:outline-none"
              style={inputStyle}
              onFocus={(e) => { e.currentTarget.style.borderColor = `${accentColor}60`; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = th.inputBorder; }}
            />
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: th.sub }}>Series</label>
            <input
              type="number"
              min="1"
              max="20"
              value={data.sets ?? ''}
              onChange={(e) => set('sets', e.target.value)}
              placeholder="3"
              className="w-full px-2 py-1.5 text-sm rounded-lg focus:outline-none"
              style={inputStyle}
              onFocus={(e) => { e.currentTarget.style.borderColor = `${accentColor}60`; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = th.inputBorder; }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs mb-1" style={{ color: th.sub }}>RPE (1–10)</label>
            <input
              type="number"
              min="1"
              max="10"
              step="0.5"
              value={data.rpe ?? ''}
              onChange={(e) => set('rpe', e.target.value)}
              placeholder="8"
              className="w-full px-2 py-1.5 text-sm rounded-lg focus:outline-none"
              style={inputStyle}
              onFocus={(e) => { e.currentTarget.style.borderColor = `${accentColor}60`; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = th.inputBorder; }}
            />
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: th.sub }}>Velocidad barra (m/s)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={data.bar_velocity_ms ?? ''}
              onChange={(e) => set('bar_velocity_ms', e.target.value)}
              placeholder="1.20"
              className="w-full px-2 py-1.5 text-sm rounded-lg focus:outline-none"
              style={inputStyle}
              onFocus={(e) => { e.currentTarget.style.borderColor = `${accentColor}60`; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = th.inputBorder; }}
            />
          </div>
        </div>

        {(computedOneRM || data.rpe || computedPower) && (
          <div className="grid grid-cols-3 gap-2 pt-1">
            {computedOneRM !== null && (
              <div className="p-2.5 rounded-xl text-center" style={metricStyle}>
                <p className="text-base font-bold" style={{ color: accentColor }}>{computedOneRM}</p>
                <p className="text-xs" style={{ color: th.sub }}>kg</p>
                <p className="text-xs leading-tight mt-0.5" style={{ color: th.sub }}>1RM estimado</p>
                <p className="text-xs" style={{ color: th.empty }}>Brzycki</p>
              </div>
            )}
            {data.rpe && (
              <div className="p-2.5 rounded-xl text-center" style={metricStyle}>
                <p className="text-base font-bold" style={{ color: rpeColor }}>RPE {data.rpe}</p>
                <p className="text-xs mt-0.5 leading-tight" style={{ color: th.sub }}>
                  {data.rpe <= 7 ? 'Moderado' : data.rpe <= 8.5 ? 'Difícil' : data.rpe <= 9.5 ? 'Muy difícil' : 'Máximo'}
                </p>
                <p className="text-xs" style={{ color: th.empty }}>Esfuerzo percibido</p>
              </div>
            )}
            {computedPower !== null && (
              <div className="p-2.5 rounded-xl text-center" style={metricStyle}>
                <p className="text-base font-bold" style={{ color: accentColor }}>{computedPower}</p>
                <p className="text-xs" style={{ color: th.sub }}>W</p>
                <p className="text-xs leading-tight mt-0.5" style={{ color: th.sub }}>Potencia estimada</p>
                <p className="text-xs" style={{ color: th.empty }}>P = m·g·v</p>
              </div>
            )}
          </div>
        )}

        {data.bar_velocity_ms && (
          <div className="p-2 rounded-lg text-xs" style={{ background: `${accentColor}10`, border: `1px solid ${accentColor}25` }}>
            <span className="font-medium" style={{ color: accentColor }}>Zona VBT: </span>
            <span style={{ color: th.sub }}>
              {data.bar_velocity_ms >= 1.3 ? 'Velocidad / Potencia (≥1.3 m/s)'
                : data.bar_velocity_ms >= 1.0 ? 'Potencia (1.0–1.3 m/s)'
                : data.bar_velocity_ms >= 0.75 ? 'Hipertrofia-Fuerza (0.75–1.0 m/s)'
                : data.bar_velocity_ms >= 0.5 ? 'Fuerza (0.5–0.75 m/s)'
                : 'Fuerza máxima (<0.5 m/s)'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
