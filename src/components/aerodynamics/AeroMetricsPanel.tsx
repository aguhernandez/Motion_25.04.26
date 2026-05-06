import { AlertTriangle, CheckCircle2, Info, TrendingDown, Wind } from 'lucide-react';
import type { AeroAngles, AeroRisk } from '../../lib/aeroCalculations';
import { getTorsoAngleCategory } from '../../lib/aeroCalculations';
import { useT } from '../../lib/LanguageContext';
import { getTheme } from '../../lib/theme';

interface AeroMetricsPanelProps {
  angles: AeroAngles;
  frontalAreaIndex: number;
  aerodynamicIndex: number;
  cdaEstimate: number;
  powerAtSpeed: number;
  speedAtFtp: number;
  targetSpeedKmh: number;
  ftpWatts: number;
  risks: AeroRisk[];
}

function AngleRow({
  label, value, optMin, optMax, refMin, refMax, th,
}: {
  label: string; value: number; optMin: number; optMax: number; refMin: number; refMax: number;
  th: ReturnType<typeof getTheme>;
}) {
  if (value === 0) return null;
  const pct = Math.min(100, Math.max(0, ((value - refMin) / Math.max(1, refMax - refMin)) * 100));
  const optMinPct = ((optMin - refMin) / Math.max(1, refMax - refMin)) * 100;
  const optWidthPct = ((optMax - optMin) / Math.max(1, refMax - refMin)) * 100;
  const inRange = value >= optMin && value <= optMax;
  const color = inRange ? '#10b981' : value >= refMin && value <= refMax ? '#f59e0b' : '#ef4444';

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs" style={{ color: th.sub }}>{label}</span>
        <span className="text-sm font-bold" style={{ color }}>{value}°</span>
      </div>
      <div className="relative h-1.5 rounded-full overflow-hidden" style={{ background: th.progressTrack }}>
        <div className="absolute top-0 h-full rounded-full opacity-25" style={{ left: `${optMinPct}%`, width: `${optWidthPct}%`, background: th.optimalZone }} />
        <div className="absolute top-0 h-full w-1 rounded-full" style={{ left: `${pct}%`, background: color, transform: 'translateX(-50%)' }} />
      </div>
      <div className="flex justify-between text-xs" style={{ color: th.empty }}>
        <span>{refMin}°</span>
        <span style={{ color: th.optimalText }}>{optMin}–{optMax}°</span>
        <span>{refMax}°</span>
      </div>
    </div>
  );
}

export default function AeroMetricsPanel({
  angles, frontalAreaIndex, aerodynamicIndex, cdaEstimate,
  powerAtSpeed, speedAtFtp, targetSpeedKmh, ftpWatts, risks,
}: AeroMetricsPanelProps) {
  const { darkMode } = useT();
  const th = getTheme(darkMode);
  const torsoCategory = getTorsoAngleCategory(angles.torsoAngle);

  const aiBg = aerodynamicIndex >= 80
    ? 'rgba(16,185,129,0.12)'
    : aerodynamicIndex >= 60
    ? 'rgba(245,158,11,0.1)'
    : 'rgba(239,68,68,0.1)';

  const aiColor = aerodynamicIndex >= 80 ? '#10b981' : aerodynamicIndex >= 60 ? '#f59e0b' : '#ef4444';

  return (
    <div className="space-y-4">
      <div className="p-3 rounded-xl text-center" style={{ background: aiBg, border: `1px solid ${aiColor}30` }}>
        <div className="flex items-center justify-center gap-2 mb-1">
          <Wind className="w-4 h-4" style={{ color: aiColor }} />
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: aiColor }}>Aerodynamic Index</span>
        </div>
        <div className="text-5xl font-black" style={{ color: aiColor }}>{aerodynamicIndex}</div>
        <div className="text-xs mt-1" style={{ color: th.sub }}>/ 100 (relativo a tus posiciones guardadas)</div>
        <div className="mt-2 h-2 rounded-full overflow-hidden" style={{ background: th.progressTrack }}>
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${aerodynamicIndex}%`, background: aiColor }} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="p-2.5 rounded-xl text-center" style={{ background: th.tagBg, border: `1px solid ${th.rowBorder}` }}>
          <p className="text-xs mb-1" style={{ color: th.sub }}>Potencia a {targetSpeedKmh} km/h</p>
          <p className="text-2xl font-bold" style={{ color: '#fdda36' }}>{powerAtSpeed}</p>
          <p className="text-xs" style={{ color: th.sub }}>Watts estimados</p>
        </div>
        <div className="p-2.5 rounded-xl text-center" style={{ background: th.tagBg, border: `1px solid ${th.rowBorder}` }}>
          <p className="text-xs mb-1" style={{ color: th.sub }}>Velocidad a {ftpWatts}W (FTP)</p>
          <p className="text-2xl font-bold" style={{ color: '#06b6d4' }}>{speedAtFtp}</p>
          <p className="text-xs" style={{ color: th.sub }}>km/h estimados</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="p-2.5 rounded-xl" style={{ background: th.tagBg, border: `1px solid ${th.rowBorder}` }}>
          <p className="text-xs mb-1" style={{ color: th.sub }}>CdA estimado</p>
          <p className="text-lg font-bold" style={{ color: th.rowText }}>{cdaEstimate.toFixed(3)}</p>
          <p className="text-xs" style={{ color: th.empty }}>Estimación relativa</p>
        </div>
        <div className="p-2.5 rounded-xl" style={{ background: th.tagBg, border: `1px solid ${th.rowBorder}` }}>
          <p className="text-xs mb-1" style={{ color: th.sub }}>Área frontal rel.</p>
          <p className="text-lg font-bold" style={{ color: th.rowText }}>{(frontalAreaIndex * 100).toFixed(0)}%</p>
          <p className="text-xs" style={{ color: th.empty }}>Índice relativo</p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: th.sub }}>Ángulos Biomecánicos</p>
          {angles.torsoAngle > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: `${torsoCategory.color}20`, color: torsoCategory.color }}>
              {torsoCategory.label}
            </span>
          )}
        </div>
        <AngleRow label="Torso Angle" value={angles.torsoAngle} optMin={30} optMax={50} refMin={10} refMax={65} th={th} />
        <AngleRow label="Cadera TDC (Hip)" value={angles.hipAngleTdc} optMin={45} optMax={70} refMin={30} refMax={90} th={th} />
        <AngleRow label="Rodilla BDC (Knee)" value={angles.kneeAngleBdc} optMin={140} optMax={150} refMin={120} refMax={165} th={th} />
        <AngleRow label="Codo (Elbow)" value={angles.elbowAngle} optMin={80} optMax={100} refMin={60} refMax={130} th={th} />
        <AngleRow label="Cabeza (Head)" value={angles.headAngle} optMin={5} optMax={20} refMin={0} refMax={40} th={th} />
      </div>

      {risks.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: th.sub }}>Alertas Aero / Potencia</p>
          {risks.map((risk, i) => (
            <div
              key={i}
              className="flex gap-2.5 p-2.5 rounded-xl"
              style={{
                background: risk.severity === 'critical' ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)',
                border: `1px solid ${risk.severity === 'critical' ? 'rgba(239,68,68,0.25)' : 'rgba(245,158,11,0.25)'}`,
              }}
            >
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: risk.severity === 'critical' ? '#ef4444' : '#f59e0b' }} />
              <p className="text-xs leading-relaxed" style={{ color: risk.severity === 'critical' ? '#ef4444' : '#f59e0b' }}>{risk.message}</p>
            </div>
          ))}
        </div>
      )}

      {risks.length === 0 && angles.torsoAngle > 0 && (
        <div className="flex gap-2.5 p-2.5 rounded-xl" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
          <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: '#10b981' }} />
          <p className="text-xs" style={{ color: '#10b981' }}>Posición dentro de rangos seguros. Sin riesgos detectados.</p>
        </div>
      )}

      <div className="flex gap-2 p-2.5 rounded-xl" style={{ background: th.tagBg, border: `1px solid ${th.rowBorder}` }}>
        <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: th.sub }} />
        <p className="text-xs leading-relaxed" style={{ color: th.sub }}>
          <strong style={{ color: th.rowText }}>Estimación relativa aerodinámica.</strong> No representa medición validada en túnel de viento. Preparado para integración futura con método Chung.
        </p>
      </div>

      <div className="flex items-center gap-2 p-2 rounded-lg" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}>
        <TrendingDown className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#10b981' }} />
        <div className="flex-1">
          <p className="text-xs font-medium" style={{ color: '#10b981' }}>Aero Gain vs Power Risk</p>
          <div className="mt-1 h-1.5 rounded-full overflow-hidden" style={{ background: th.progressTrack }}>
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.max(10, aerodynamicIndex - (risks.filter(r => r.severity === 'critical').length * 20))}%`,
                background: 'linear-gradient(90deg, #10b981, #06b6d4)',
              }}
            />
          </div>
          <div className="flex justify-between mt-0.5">
            <span className="text-xs" style={{ color: th.empty }}>Power Risk</span>
            <span className="text-xs" style={{ color: th.empty }}>Aero Gain</span>
          </div>
        </div>
      </div>
    </div>
  );
}
