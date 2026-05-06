import type { AeroSimulation } from '../../lib/aeroCalculations';
import { useT } from '../../lib/LanguageContext';
import { getTheme } from '../../lib/theme';

interface AeroPowerCurveProps {
  curves: { label: string; color: string; data: AeroSimulation[] }[];
  ftpWatts: number;
  targetSpeedKmh: number;
}

export default function AeroPowerCurve({ curves, ftpWatts, targetSpeedKmh }: AeroPowerCurveProps) {
  const { darkMode } = useT();
  const th = getTheme(darkMode);

  if (curves.length === 0 || curves[0].data.length === 0) {
    return (
      <p className="text-center text-sm py-6" style={{ color: th.empty }}>
        Capturá una posición para ver la curva de potencia
      </p>
    );
  }

  const allPowers = curves.flatMap((c) => c.data.map((d) => d.power_w));
  const maxPower = Math.max(...allPowers, ftpWatts * 1.1);
  const minPower = Math.min(...allPowers) * 0.9;
  const allSpeeds = curves[0].data.map((d) => d.speed_kmh);
  const w = 500;
  const h = 160;
  const padL = 46;
  const padR = 12;
  const padT = 12;
  const padB = 28;
  const chartW = w - padL - padR;
  const chartH = h - padT - padB;

  const toX = (s: number) => padL + ((s - allSpeeds[0]) / (allSpeeds[allSpeeds.length - 1] - allSpeeds[0])) * chartW;
  const toY = (p: number) => padT + chartH - ((p - minPower) / (maxPower - minPower)) * chartH;

  const ftpY = toY(ftpWatts);
  const targetX = toX(targetSpeedKmh);

  const yLabels = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(minPower + t * (maxPower - minPower)));

  return (
    <div className="space-y-3">
      <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ overflow: 'visible' }}>
        {yLabels.map((val) => (
          <g key={val}>
            <line x1={padL} y1={toY(val)} x2={padL + chartW} y2={toY(val)} stroke={darkMode ? 'rgba(81,65,99,0.2)' : 'rgba(81,65,99,0.08)'} strokeWidth="1" />
            <text x={padL - 4} y={toY(val) + 4} textAnchor="end" fontSize="9" fill={th.sub}>{val}</text>
          </g>
        ))}

        {allSpeeds.map((s) => (
          <text key={s} x={toX(s)} y={h - 6} textAnchor="middle" fontSize="9" fill={th.sub}>{s}</text>
        ))}

        {ftpWatts > minPower && ftpWatts < maxPower && (
          <line x1={padL} y1={ftpY} x2={padL + chartW} y2={ftpY} stroke="rgba(253,218,54,0.4)" strokeWidth="1" strokeDasharray="4 3" />
        )}
        {targetSpeedKmh >= allSpeeds[0] && targetSpeedKmh <= allSpeeds[allSpeeds.length - 1] && (
          <line x1={targetX} y1={padT} x2={targetX} y2={padT + chartH} stroke="rgba(6,182,212,0.35)" strokeWidth="1" strokeDasharray="4 3" />
        )}

        {curves.map((curve) => {
          const pts = curve.data.map((d) => `${toX(d.speed_kmh)},${toY(d.power_w)}`).join(' ');
          const fillPts = `${padL},${padT + chartH} ` + pts + ` ${toX(curve.data[curve.data.length - 1].speed_kmh)},${padT + chartH}`;
          return (
            <g key={curve.label}>
              <polygon points={fillPts} fill={`${curve.color}15`} />
              <polyline points={pts} fill="none" stroke={curve.color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
              {curve.data.map((d) => (
                <circle key={d.speed_kmh} cx={toX(d.speed_kmh)} cy={toY(d.power_w)} r="2.5" fill={curve.color} />
              ))}
            </g>
          );
        })}

        <text x={padL - 4} y={ftpY - 4} textAnchor="end" fontSize="8" fill="rgba(253,218,54,0.7)">FTP</text>
        <text x={targetX + 3} y={padT + 10} fontSize="8" fill="rgba(6,182,212,0.7)">{targetSpeedKmh}km/h</text>
        <text x={padL + chartW / 2} y={h - 1} textAnchor="middle" fontSize="9" fill={th.sub}>Velocidad (km/h)</text>
        <text x={10} y={padT + chartH / 2} textAnchor="middle" fontSize="9" fill={th.sub} transform={`rotate(-90, 10, ${padT + chartH / 2})`}>Potencia (W)</text>
      </svg>

      {curves.length > 1 && (
        <div className="flex flex-wrap gap-3">
          {curves.map((c) => (
            <div key={c.label} className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 rounded" style={{ background: c.color }} />
              <span className="text-xs" style={{ color: th.sub }}>{c.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
