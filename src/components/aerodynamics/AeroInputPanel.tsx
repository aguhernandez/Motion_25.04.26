import type { Athlete } from '../../lib/types';
import type { AeroInputs, BikeType } from '../../lib/aeroCalculations';
import { useT } from '../../lib/LanguageContext';
import { getTheme } from '../../lib/theme';

interface AeroInputPanelProps {
  inputs: AeroInputs;
  onChange: (inputs: AeroInputs) => void;
  athlete?: Athlete | null;
}

function Field({
  label, value, unit, onChange, min, max, step, hint, th,
}: {
  label: string;
  value: number;
  unit: string;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  hint?: string;
  th: ReturnType<typeof getTheme>;
}) {
  return (
    <div>
      <label className="block text-xs mb-1" style={{ color: th.sub }}>{label}</label>
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          step={step ?? 1}
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="flex-1 px-2.5 py-1.5 text-sm rounded-lg focus:outline-none min-w-0"
          style={{ background: th.inputBg, border: `1px solid ${th.inputBorder}`, color: th.inputText }}
          onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(253,218,54,0.5)'; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = th.inputBorder; }}
        />
        <span className="text-xs flex-shrink-0" style={{ color: th.sub }}>{unit}</span>
      </div>
      {hint && <p className="text-xs mt-0.5" style={{ color: th.empty }}>{hint}</p>}
    </div>
  );
}

const BIKE_TYPES: { value: BikeType; label: string; desc: string }[] = [
  { value: 'road', label: 'Road', desc: 'Bici de ruta estándar' },
  { value: 'aero_road', label: 'Aero Road', desc: 'Bici de ruta aerodinámica' },
  { value: 'tt', label: 'TT / Triatlón', desc: 'Posición de contrarreloj' },
];

export default function AeroInputPanel({ inputs, onChange, athlete }: AeroInputPanelProps) {
  const { darkMode } = useT();
  const th = getTheme(darkMode);

  return (
    <div className="space-y-4">
      {athlete && (
        <div className="p-3 rounded-xl text-xs space-y-1" style={{ background: th.infoBg, border: `1px solid ${th.infoBorder}` }}>
          <p className="font-semibold mb-2" style={{ color: th.infoTitle }}>Datos del Lab — {athlete.name}</p>
          {athlete.height_cm && (
            <p style={{ color: th.infoText }}>Altura: <strong style={{ color: th.rowText }}>{athlete.height_cm} cm</strong></p>
          )}
          {athlete.weight_kg && (
            <p style={{ color: th.infoText }}>Peso: <strong style={{ color: th.rowText }}>{athlete.weight_kg} kg</strong></p>
          )}
          {athlete.torso_length_cm && (
            <p style={{ color: th.infoText }}>Torso: <strong style={{ color: th.rowText }}>{athlete.torso_length_cm} cm</strong></p>
          )}
          {athlete.arm_length_cm && (
            <p style={{ color: th.infoText }}>Brazos: <strong style={{ color: th.rowText }}>{athlete.arm_length_cm} cm</strong></p>
          )}
        </div>
      )}

      <div>
        <label className="block text-xs mb-2" style={{ color: th.sub }}>Tipo de bicicleta</label>
        <div className="grid grid-cols-1 gap-1.5">
          {BIKE_TYPES.map((bt) => (
            <button
              key={bt.value}
              onClick={() => onChange({ ...inputs, bikeType: bt.value })}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all"
              style={
                inputs.bikeType === bt.value
                  ? { background: 'rgba(253,218,54,0.12)', border: '1px solid rgba(253,218,54,0.4)', color: '#fdda36' }
                  : { background: th.tagBg, border: `1px solid ${th.rowBorder}`, color: th.sub }
              }
            >
              <div className="flex-1">
                <p className="text-xs font-semibold" style={inputs.bikeType === bt.value ? { color: '#fdda36' } : { color: th.rowText }}>{bt.label}</p>
                <p className="text-xs" style={{ color: th.sub }}>{bt.desc}</p>
              </div>
              {inputs.bikeType === bt.value && (
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#fdda36' }} />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: th.sub }}>Parámetros de simulación</p>
        <Field label="Velocidad objetivo" value={inputs.targetSpeedKmh} unit="km/h" min={10} max={80} step={1} onChange={(v) => onChange({ ...inputs, targetSpeedKmh: v })} hint="Velocidad para el cálculo de potencia" th={th} />
        <Field label="FTP" value={inputs.ftpWatts} unit="W" min={50} max={600} step={5} onChange={(v) => onChange({ ...inputs, ftpWatts: v })} hint="Para calcular velocidad estimada a FTP" th={th} />
        <Field label="Masa total sistema" value={inputs.totalMassKg} unit="kg" min={40} max={200} step={0.5} onChange={(v) => onChange({ ...inputs, totalMassKg: v })} hint="Ciclista + bici + equipamiento" th={th} />
        <Field label="Densidad del aire" value={inputs.airDensity} unit="kg/m³" min={0.9} max={1.4} step={0.001} onChange={(v) => onChange({ ...inputs, airDensity: v })} hint="Default: 1.225 (nivel del mar, 15°C)" th={th} />
      </div>
    </div>
  );
}
