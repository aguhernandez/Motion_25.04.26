import { useState } from 'react';
import { getTheme } from '../../lib/theme';
import { useT } from '../../lib/LanguageContext';
import type { Athlete } from '../../lib/types';

export interface SwimData {
  stroke_rate_spm?: number;
  stroke_length_m?: number;
  stroke_index?: number;
  distance_per_stroke_m?: number;
  tempo_s?: number;
  lap_time_s?: number;
  pool_length_m?: number;
  body_rotation_deg?: number;
}

interface SwimDataPanelProps {
  data: SwimData;
  onChange: (data: SwimData) => void;
  athlete?: Athlete;
}

function field(label: string, unit: string, value: number | undefined, key: keyof SwimData, onChange: (data: Partial<SwimData>) => void, th: ReturnType<typeof getTheme>) {
  return (
    <div key={key} className="space-y-1">
      <label className="text-xs font-medium" style={{ color: th.sub }}>{label}</label>
      <div className="relative">
        <input
          type="number"
          value={value ?? ''}
          onChange={(e) => onChange({ [key]: e.target.value === '' ? undefined : parseFloat(e.target.value) })}
          className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none pr-10"
          style={{ background: th.inputBg, border: `1px solid ${th.inputBorder}`, color: th.inputText }}
          onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(6,182,212,0.5)'; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = th.inputBorder; }}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: th.empty }}>{unit}</span>
      </div>
    </div>
  );
}

function computeSwimMetrics(data: SwimData): { si: number | null; swolf: number | null; pace100: string | null } {
  const si = data.stroke_rate_spm && data.distance_per_stroke_m && data.lap_time_s && data.pool_length_m
    ? parseFloat(((data.distance_per_stroke_m * data.pool_length_m) / (data.lap_time_s || 1)).toFixed(2))
    : null;

  const swolf = data.stroke_rate_spm && data.tempo_s && data.pool_length_m
    ? Math.round((data.stroke_rate_spm / 2) + (data.tempo_s || 0))
    : null;

  const pace100 = data.lap_time_s && data.pool_length_m && data.pool_length_m > 0
    ? (() => {
        const totalS = (data.lap_time_s / data.pool_length_m) * 100;
        const m = Math.floor(totalS / 60);
        const s = Math.round(totalS % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
      })()
    : null;

  return { si, swolf, pace100 };
}

export default function SwimDataPanel({ data, onChange, athlete }: SwimDataPanelProps) {
  const { darkMode } = useT();
  const th = getTheme(darkMode);
  const [open, setOpen] = useState(true);

  const update = (partial: Partial<SwimData>) => onChange({ ...data, ...partial });
  const metrics = computeSwimMetrics(data);

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: th.panelBg, border: `1px solid ${th.panelBorder}` }}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: th.panelHeaderBorder }}
      >
        <div>
          <span className="text-sm font-semibold" style={{ color: th.title }}>Datos de Nado</span>
          {athlete?.arm_length_cm && (
            <span className="ml-2 text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(6,182,212,0.1)', color: '#06b6d4' }}>
              Enverg. {Math.round(athlete.arm_length_cm * 2)} cm
            </span>
          )}
        </div>
        <span className="text-xs" style={{ color: th.sub }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {field('Frecuencia de brazada', 'spm', data.stroke_rate_spm, 'stroke_rate_spm', update, th)}
            {field('Long. de brazada', 'm', data.stroke_length_m, 'stroke_length_m', update, th)}
            {field('Distancia por brazada', 'm', data.distance_per_stroke_m, 'distance_per_stroke_m', update, th)}
            {field('Tempo (ciclo)', 's', data.tempo_s, 'tempo_s', update, th)}
            {field('Tiempo por largo', 's', data.lap_time_s, 'lap_time_s', update, th)}
            {field('Longitud de pileta', 'm', data.pool_length_m, 'pool_length_m', update, th)}
            {field('Rotación corporal', '°', data.body_rotation_deg, 'body_rotation_deg', update, th)}
          </div>

          {(metrics.si !== null || metrics.swolf !== null || metrics.pace100 !== null) && (
            <div className="grid grid-cols-3 gap-2 pt-2 border-t" style={{ borderColor: th.rowBorder }}>
              {metrics.si !== null && (
                <div className="p-2.5 rounded-xl text-center" style={{ background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)' }}>
                  <p className="text-base font-bold" style={{ color: '#06b6d4' }}>{metrics.si}</p>
                  <p className="text-xs mt-0.5" style={{ color: th.sub }}>Índice de nado</p>
                </div>
              )}
              {metrics.swolf !== null && (
                <div className="p-2.5 rounded-xl text-center" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                  <p className="text-base font-bold" style={{ color: '#10b981' }}>{metrics.swolf}</p>
                  <p className="text-xs mt-0.5" style={{ color: th.sub }}>SWOLF</p>
                </div>
              )}
              {metrics.pace100 !== null && (
                <div className="p-2.5 rounded-xl text-center" style={{ background: 'rgba(253,218,54,0.08)', border: '1px solid rgba(253,218,54,0.2)' }}>
                  <p className="text-base font-bold" style={{ color: '#fdda36' }}>{metrics.pace100}</p>
                  <p className="text-xs mt-0.5" style={{ color: th.sub }}>Pace /100m</p>
                </div>
              )}
            </div>
          )}

          <div className="p-2.5 rounded-lg" style={{ background: th.tagBg }}>
            <p className="text-xs leading-relaxed" style={{ color: th.sub }}>
              <strong style={{ color: th.rowText }}>SWOLF</strong> = brazadas por largo + segundos = eficiencia técnica. Menor es mejor.
              &nbsp;<strong style={{ color: th.rowText }}>SI</strong> = índice de nado (velocidad × brazada), indicador de eficiencia global.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
