import type { KeyPoint } from './types';
import { calculateAngleBetweenPoints } from './angleCalculations';

export type BikeType = 'road' | 'aero_road' | 'tt';

export interface AeroAngles {
  torsoAngle: number;
  hipAngleTdc: number;
  kneeAngleBdc: number;
  elbowAngle: number;
  headAngle: number;
}

export interface AeroMetrics {
  angles: AeroAngles;
  frontalAreaIndex: number;
  aerodynamicIndex: number;
  cdaEstimate: number;
  powerAtSpeed: number;
  speedAtFtp: number;
  risks: AeroRisk[];
}

export interface AeroRisk {
  type: 'hip' | 'knee' | 'head' | 'elbow';
  severity: 'warning' | 'critical';
  message: string;
}

export interface AeroSimulation {
  speed_kmh: number;
  power_w: number;
}

export interface AeroPosition {
  id: string;
  athlete_id?: string | null;
  session_id?: string | null;
  label: string;
  image_data: string;
  key_points: KeyPoint[];
  bike_type: BikeType;
  target_speed_kmh: number;
  air_density: number;
  total_mass_kg: number;
  ftp_watts: number;
  torso_angle_deg?: number | null;
  hip_angle_tdc_deg?: number | null;
  knee_angle_bdc_deg?: number | null;
  elbow_angle_deg?: number | null;
  head_angle_deg?: number | null;
  frontal_area_index: number;
  aerodynamic_index: number;
  power_at_target_speed_w: number;
  cda_estimate: number;
  notes: string;
  created_at: string;
}

export interface AeroInputs {
  bikeType: BikeType;
  targetSpeedKmh: number;
  airDensity: number;
  totalMassKg: number;
  ftpWatts: number;
}

const BIKE_TYPE_CDA_BASE: Record<BikeType, number> = {
  road: 0.32,
  aero_road: 0.27,
  tt: 0.22,
};

export function computeAeroAngles(points: KeyPoint[]): AeroAngles {
  const pm = new Map(points.map((p) => [p.label, p]));

  const shoulder = pm.get('Hombro');
  const hip = pm.get('Cadera');
  const knee = pm.get('Rodilla');
  const ankle = pm.get('Tobillo');
  const elbow = pm.get('Codo');
  const wrist = pm.get('Muñeca');
  const neck = pm.get('Cuello');
  const nose = pm.get('Nariz') ?? pm.get('Cabeza');

  const torsoAngle = shoulder && hip
    ? computeAngleWithHorizontal(shoulder, hip)
    : 0;

  const hipAngleTdc = shoulder && hip && knee
    ? calculateAngleBetweenPoints(shoulder, hip, knee)
    : 0;

  const kneeAngleBdc = hip && knee && ankle
    ? calculateAngleBetweenPoints(hip, knee, ankle)
    : 0;

  const elbowAngle = shoulder && elbow && wrist
    ? calculateAngleBetweenPoints(shoulder, elbow, wrist)
    : 0;

  const headAngle = nose && shoulder
    ? computeAngleWithHorizontal(nose, shoulder)
    : neck && shoulder
    ? computeAngleWithHorizontal(neck, shoulder)
    : 0;

  return { torsoAngle, hipAngleTdc, kneeAngleBdc, elbowAngle, headAngle };
}

function computeAngleWithHorizontal(
  top: { x: number; y: number },
  bottom: { x: number; y: number }
): number {
  const dx = bottom.x - top.x;
  const dy = bottom.y - top.y;
  const rad = Math.atan2(Math.abs(dy), Math.abs(dx));
  return Math.round((rad * 180) / Math.PI);
}

export function computeFrontalAreaIndex(points: KeyPoint[], bikeType: BikeType): number {
  const pm = new Map(points.map((p) => [p.label, p]));

  const shoulder = pm.get('Hombro');
  const hip = pm.get('Cadera');
  const elbow = pm.get('Codo');
  const neck = pm.get('Cuello');

  if (!shoulder || !hip) return 0.5;

  const torsoHeight = Math.abs(shoulder.y - hip.y);
  const torsoWidth = Math.abs(shoulder.x - hip.x);

  const armCompaction = elbow
    ? 1 - Math.min(0.3, Math.abs(elbow.x - shoulder.x))
    : 0.8;

  const neckContrib = neck
    ? Math.abs(neck.y - shoulder.y) * 0.3
    : 0.1;

  const bikeBonus: Record<BikeType, number> = { road: 0, aero_road: 0.08, tt: 0.15 };

  const raw = (torsoHeight * 0.5 + torsoWidth * 0.3 + neckContrib) * armCompaction;
  const normalized = Math.min(1, Math.max(0.15, raw));

  return Math.max(0.1, normalized - bikeBonus[bikeType]);
}

export function computeCdaEstimate(frontalAreaIndex: number, bikeType: BikeType): number {
  const base = BIKE_TYPE_CDA_BASE[bikeType];
  return base * (0.6 + frontalAreaIndex * 0.8);
}

export function computePowerAtSpeed(
  speedKmh: number,
  cda: number,
  airDensity: number,
  totalMassKg: number,
  grade = 0
): number {
  const v = speedKmh / 3.6;
  const pAero = 0.5 * airDensity * cda * v * v * v;
  const pGravity = totalMassKg * 9.81 * Math.sin(Math.atan(grade / 100)) * v;
  const pRolling = totalMassKg * 9.81 * 0.004 * v;
  return Math.round(pAero + pGravity + pRolling);
}

export function computeSpeedAtPower(
  powerW: number,
  cda: number,
  airDensity: number,
  totalMassKg: number
): number {
  let v = 10;
  for (let i = 0; i < 200; i++) {
    const p = computePowerAtSpeed(v * 3.6, cda, airDensity, totalMassKg);
    const diff = powerW - p;
    if (Math.abs(diff) < 0.1) break;
    v += diff * 0.001;
    if (v < 0) { v = 0; break; }
  }
  return Math.round(v * 3.6 * 10) / 10;
}

export function computeAeroIndex(
  frontalAreaIndex: number,
  allPositions: { frontal_area_index: number }[]
): number {
  if (allPositions.length === 0) return Math.round((1 - frontalAreaIndex) * 100);
  const minFai = Math.min(...allPositions.map((p) => p.frontal_area_index), frontalAreaIndex);
  const maxFai = Math.max(...allPositions.map((p) => p.frontal_area_index), frontalAreaIndex);
  if (maxFai === minFai) return 85;
  return Math.round(100 - ((frontalAreaIndex - minFai) / (maxFai - minFai)) * 100);
}

export function detectAeroRisks(angles: AeroAngles): AeroRisk[] {
  const risks: AeroRisk[] = [];

  if (angles.hipAngleTdc > 0 && angles.hipAngleTdc < 45) {
    risks.push({
      type: 'hip',
      severity: 'critical',
      message: `Ángulo de cadera en TDC muy cerrado (${angles.hipAngleTdc}°). Riesgo de reducción de producción de potencia.`,
    });
  } else if (angles.hipAngleTdc > 0 && angles.hipAngleTdc < 52) {
    risks.push({
      type: 'hip',
      severity: 'warning',
      message: `Ángulo de cadera en TDC ajustado (${angles.hipAngleTdc}°). Monitorear compensación lumbar.`,
    });
  }

  if (angles.kneeAngleBdc > 0 && (angles.kneeAngleBdc < 130 || angles.kneeAngleBdc > 155)) {
    risks.push({
      type: 'knee',
      severity: angles.kneeAngleBdc < 125 || angles.kneeAngleBdc > 160 ? 'critical' : 'warning',
      message: `Ángulo de rodilla en BDC fuera de rango óptimo (${angles.kneeAngleBdc}° / óptimo: 140–150°). ${angles.kneeAngleBdc < 130 ? 'Saddle muy bajo.' : 'Saddle muy alto.'}`,
    });
  }

  if (angles.headAngle > 20) {
    risks.push({
      type: 'head',
      severity: angles.headAngle > 30 ? 'critical' : 'warning',
      message: `Elevación de cabeza alta (${angles.headAngle}°). Reduce eficiencia aerodinámica cervical.`,
    });
  }

  if (angles.elbowAngle > 0 && (angles.elbowAngle < 70 || angles.elbowAngle > 110)) {
    risks.push({
      type: 'elbow',
      severity: 'warning',
      message: `Ángulo de codo fuera del rango aero eficiente (${angles.elbowAngle}° / óptimo: 80–100°).`,
    });
  }

  return risks;
}

export function buildPowerCurve(
  cda: number,
  airDensity: number,
  totalMassKg: number,
  speeds = [25, 30, 35, 38, 40, 42, 45, 48, 50]
): AeroSimulation[] {
  return speeds.map((s) => ({
    speed_kmh: s,
    power_w: computePowerAtSpeed(s, cda, airDensity, totalMassKg),
  }));
}

export function getTorsoAngleCategory(angle: number): { label: string; color: string } {
  if (angle >= 40 && angle <= 50) return { label: 'Endurance', color: '#10b981' };
  if (angle >= 30 && angle < 40) return { label: 'Race Aggressive', color: '#f59e0b' };
  if (angle >= 10 && angle < 30) return { label: 'TT / Aero', color: '#06b6d4' };
  if (angle > 50) return { label: 'Upright', color: '#94a3b8' };
  return { label: 'Extreme Aero', color: '#ef4444' };
}

export const AERO_KEY_POINTS: KeyPoint[] = [
  { id: 'nose', label: 'Nariz', x: 0.42, y: 0.10, color: '#0ea5e9' },
  { id: 'neck', label: 'Cuello', x: 0.43, y: 0.17, color: '#3b82f6' },
  { id: 'shoulder', label: 'Hombro', x: 0.41, y: 0.24, color: '#8b5cf6' },
  { id: 'elbow', label: 'Codo', x: 0.33, y: 0.33, color: '#ec4899' },
  { id: 'wrist', label: 'Muñeca', x: 0.27, y: 0.41, color: '#f97316' },
  { id: 'hip', label: 'Cadera', x: 0.52, y: 0.37, color: '#ef4444' },
  { id: 'knee', label: 'Rodilla', x: 0.49, y: 0.56, color: '#f59e0b' },
  { id: 'ankle', label: 'Tobillo', x: 0.51, y: 0.73, color: '#10b981' },
];

export const AERO_POINT_CONNECTIONS: [string, string][] = [
  ['Nariz', 'Cuello'],
  ['Cuello', 'Hombro'],
  ['Hombro', 'Codo'],
  ['Codo', 'Muñeca'],
  ['Hombro', 'Cadera'],
  ['Cadera', 'Rodilla'],
  ['Rodilla', 'Tobillo'],
];
