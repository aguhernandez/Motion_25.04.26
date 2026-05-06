import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { AngleData } from '../../lib/types';
import { getStatusColor, getStatusLabel } from '../../lib/angleCalculations';
import { useT } from '../../lib/LanguageContext';
import { getTheme } from '../../lib/theme';

interface AnglePanelProps {
  angles: AngleData[];
}

export default function AnglePanel({ angles }: AnglePanelProps) {
  const { darkMode } = useT();
  const th = getTheme(darkMode);

  if (angles.length === 0) {
    return (
      <div className="text-center py-8 text-sm" style={{ color: th.empty }}>
        Posicioná los puntos clave para calcular ángulos
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {angles.map((angle) => {
        const color = getStatusColor(angle.status);
        const pct = Math.min(100, Math.max(0,
          ((angle.value_deg - angle.reference_min) / Math.max(1, angle.reference_max - angle.reference_min)) * 100
        ));
        const optMinPct = ((angle.optimal_min - angle.reference_min) / Math.max(1, angle.reference_max - angle.reference_min)) * 100;
        const optWidthPct = ((angle.optimal_max - angle.optimal_min) / Math.max(1, angle.reference_max - angle.reference_min)) * 100;
        const diff = angle.value_deg - angle.optimal_min;
        const Icon = angle.status === 'optimal' ? Minus : diff > 0 ? TrendingUp : TrendingDown;

        return (
          <div
            key={angle.name}
            className="rounded-lg p-3 space-y-2"
            style={{ background: th.tagBg, border: `1px solid ${th.rowBorder}` }}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium" style={{ color: th.rowText }}>{angle.name}</span>
              <div className="flex items-center gap-2">
                <Icon className="w-3.5 h-3.5" style={{ color }} />
                <span className="text-lg font-bold" style={{ color }}>{angle.value_deg}°</span>
                <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: `${color}20`, color }}>
                  {getStatusLabel(angle.status)}
                </span>
              </div>
            </div>
            <div className="relative h-2 rounded-full overflow-hidden" style={{ background: th.progressTrack }}>
              <div
                className="absolute top-0 h-full rounded-full opacity-30"
                style={{ left: `${optMinPct}%`, width: `${optWidthPct}%`, backgroundColor: th.optimalZone }}
              />
              <div
                className="absolute top-0 h-full w-0.5 rounded-full transition-all duration-300"
                style={{ left: `${pct}%`, backgroundColor: color }}
              />
            </div>
            <div className="flex justify-between text-xs" style={{ color: th.sub }}>
              <span>{angle.reference_min}°</span>
              <span style={{ color: th.optimalText }}>{angle.optimal_min}°–{angle.optimal_max}°</span>
              <span>{angle.reference_max}°</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
