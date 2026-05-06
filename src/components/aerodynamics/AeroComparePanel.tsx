import { Trash2, Wind, Zap, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import type { AeroPosition } from '../../lib/aeroCalculations';
import AeroPowerCurve from './AeroPowerCurve';
import { buildPowerCurve } from '../../lib/aeroCalculations';
import { useT } from '../../lib/LanguageContext';
import { getTheme } from '../../lib/theme';

const POSITION_COLORS = ['#fdda36', '#06b6d4', '#10b981', '#f97316', '#ec4899', '#8b5cf6'];

interface AeroComparePanelProps {
  positions: AeroPosition[];
  onDelete: (id: string) => void;
  onLoad: (pos: AeroPosition) => void;
}

export default function AeroComparePanel({ positions, onDelete, onLoad }: AeroComparePanelProps) {
  const { darkMode } = useT();
  const th = getTheme(darkMode);
  const [expanded, setExpanded] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev.slice(-1), id]
    );
  };

  const comparePositions = positions.filter((p) => selectedIds.includes(p.id));

  const curves = comparePositions.map((pos, i) => ({
    label: pos.label,
    color: POSITION_COLORS[i % POSITION_COLORS.length],
    data: buildPowerCurve(pos.cda_estimate, pos.air_density, pos.total_mass_kg),
  }));

  if (positions.length === 0) {
    return (
      <div className="text-center py-8" style={{ color: th.empty }}>
        <Wind className="w-8 h-8 mx-auto mb-2 opacity-30" />
        <p className="text-sm">Guardá posiciones para comparar</p>
      </div>
    );
  }

  const maxAI = Math.max(...positions.map((p) => p.aerodynamic_index));

  return (
    <div className="space-y-3">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between text-sm font-semibold"
        style={{ color: th.title }}
      >
        <span>Posiciones guardadas ({positions.length})</span>
        {expanded ? <ChevronUp className="w-4 h-4" style={{ color: th.sub }} /> : <ChevronDown className="w-4 h-4" style={{ color: th.sub }} />}
      </button>

      {expanded && (
        <div className="space-y-2">
          {positions.map((pos, i) => {
            const color = POSITION_COLORS[i % POSITION_COLORS.length];
            const isSelected = selectedIds.includes(pos.id);
            const isBest = pos.aerodynamic_index === maxAI;

            return (
              <div
                key={pos.id}
                className="rounded-xl overflow-hidden transition-all"
                style={{
                  border: `1px solid ${isSelected ? `${color}60` : th.rowBorder}`,
                  background: isSelected ? `${color}08` : th.rowBg,
                }}
              >
                <div className="flex items-center gap-2 px-3 py-2.5">
                  <button
                    onClick={() => toggleSelect(pos.id)}
                    className="w-4 h-4 rounded flex-shrink-0 flex items-center justify-center border transition-all"
                    style={isSelected ? { background: color, borderColor: color } : { borderColor: th.rowBorder }}
                  >
                    {isSelected && <div className="w-2 h-2 rounded-sm bg-white" />}
                  </button>

                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold truncate" style={{ color: th.rowText }}>{pos.label}</p>
                      {isBest && (
                        <span className="text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0" style={{ background: 'rgba(253,218,54,0.12)', color: '#fdda36' }}>Mejor</span>
                      )}
                    </div>
                    <p className="text-xs" style={{ color: th.sub }}>
                      {new Date(pos.created_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
                      {pos.bike_type && <span className="ml-2 capitalize">{pos.bike_type.replace('_', ' ')}</span>}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                      <div className="text-sm font-bold" style={{ color }}>{Math.round(pos.aerodynamic_index)}</div>
                      <div className="text-xs" style={{ color: th.sub }}>AI</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold" style={{ color: '#fdda36' }}>{Math.round(pos.power_at_target_speed_w)}W</div>
                      <div className="text-xs" style={{ color: th.sub }}>{pos.target_speed_kmh}km/h</div>
                    </div>
                    <button
                      onClick={() => onLoad(pos)}
                      className="p-1.5 rounded-lg transition-all"
                      style={{ color: th.sub }}
                      title="Cargar posición"
                      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#fdda36'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = th.sub; }}
                    >
                      <Zap className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDelete(pos.id)}
                      className="p-1.5 rounded-lg transition-all"
                      style={{ color: th.sub }}
                      title="Eliminar"
                      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#ef4444'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = th.sub; }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="px-3 pb-2">
                  <div className="h-1 rounded-full overflow-hidden" style={{ background: th.progressTrack }}>
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pos.aerodynamic_index}%`, background: color }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {comparePositions.length === 2 && (
        <div className="space-y-3 pt-2">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: th.sub }}>Comparación directa</p>

          <div className="grid grid-cols-2 gap-2">
            {comparePositions.map((pos, i) => {
              const color = POSITION_COLORS[selectedIds.indexOf(pos.id) % POSITION_COLORS.length];
              return (
                <div key={pos.id} className="p-2.5 rounded-xl space-y-1.5" style={{ background: th.tagBg, border: `1px solid ${color}30` }}>
                  <div className="flex items-center gap-1.5 mb-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                    <p className="text-xs font-semibold truncate" style={{ color }}>{pos.label}</p>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span style={{ color: th.sub }}>AI</span>
                    <span className="font-bold" style={{ color }}>{Math.round(pos.aerodynamic_index)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span style={{ color: th.sub }}>Torso</span>
                    <span style={{ color: th.rowText }}>{pos.torso_angle_deg ?? '—'}°</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span style={{ color: th.sub }}>Cadera TDC</span>
                    <span style={{ color: th.rowText }}>{pos.hip_angle_tdc_deg ?? '—'}°</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span style={{ color: th.sub }}>Potencia</span>
                    <span className="font-bold" style={{ color: '#fdda36' }}>{Math.round(pos.power_at_target_speed_w)}W</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span style={{ color: th.sub }}>CdA est.</span>
                    <span style={{ color: th.rowText }}>{pos.cda_estimate.toFixed(3)}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {(() => {
            const diff = comparePositions[1].power_at_target_speed_w - comparePositions[0].power_at_target_speed_w;
            const winner = diff > 0 ? comparePositions[0] : comparePositions[1];
            const absDiff = Math.abs(Math.round(diff));
            return (
              <div
                className="p-3 rounded-xl text-center"
                style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}
              >
                <p className="text-xs" style={{ color: '#10b981' }}>
                  <strong>{winner.label}</strong> ahorra{' '}
                  <strong>{absDiff}W</strong> a {comparePositions[0].target_speed_kmh} km/h
                </p>
                <p className="text-xs mt-0.5" style={{ color: th.sub }}>
                  AI diff: {Math.abs(Math.round(comparePositions[0].aerodynamic_index - comparePositions[1].aerodynamic_index))} puntos
                </p>
              </div>
            );
          })()}
        </div>
      )}

      {curves.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: th.sub }}>Curva Potencia vs Velocidad</p>
          <AeroPowerCurve
            curves={curves}
            ftpWatts={comparePositions[0]?.ftp_watts ?? 250}
            targetSpeedKmh={comparePositions[0]?.target_speed_kmh ?? 40}
          />
        </div>
      )}
    </div>
  );
}
