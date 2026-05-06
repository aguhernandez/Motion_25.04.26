import type { KeyPoint, AngleData, ReferenceRange } from './types';

export function calculateAngleBetweenPoints(
  p1: { x: number; y: number },
  vertex: { x: number; y: number },
  p2: { x: number; y: number }
): number {
  const v1x = p1.x - vertex.x;
  const v1y = p1.y - vertex.y;
  const v2x = p2.x - vertex.x;
  const v2y = p2.y - vertex.y;

  const dot = v1x * v2x + v1y * v2y;
  const mag1 = Math.sqrt(v1x * v1x + v1y * v1y);
  const mag2 = Math.sqrt(v2x * v2x + v2y * v2y);

  if (mag1 === 0 || mag2 === 0) return 0;

  const cosAngle = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
  return Math.round((Math.acos(cosAngle) * 180) / Math.PI);
}

export function getAngleStatus(
  value: number,
  ref: ReferenceRange
): 'optimal' | 'acceptable' | 'warning' | 'critical' {
  if (value >= ref.optimal_min_deg && value <= ref.optimal_max_deg) return 'optimal';
  if (value >= ref.min_deg && value <= ref.max_deg) return 'acceptable';
  const buffer = (ref.max_deg - ref.min_deg) * 0.15;
  if (value >= ref.min_deg - buffer && value <= ref.max_deg + buffer) return 'warning';
  return 'critical';
}

export function getStatusColor(status: AngleData['status']): string {
  switch (status) {
    case 'optimal': return '#10b981';
    case 'acceptable': return '#f59e0b';
    case 'warning': return '#f97316';
    case 'critical': return '#ef4444';
  }
}

export function getStatusLabel(status: AngleData['status']): string {
  switch (status) {
    case 'optimal': return 'Óptimo';
    case 'acceptable': return 'Aceptable';
    case 'warning': return 'Atención';
    case 'critical': return 'Crítico';
  }
}

export interface CyclingAngleConfig {
  name: string;
  labelP1: string;
  labelVertex: string;
  labelP2: string;
}

export const CYCLING_ANGLE_CONFIGS: CyclingAngleConfig[] = [
  { name: 'Rodilla BDC', labelP1: 'Cadera', labelVertex: 'Rodilla', labelP2: 'Tobillo' },
  { name: 'Cadera BDC', labelP1: 'Hombro', labelVertex: 'Cadera', labelP2: 'Rodilla' },
  { name: 'Tobillo BDC', labelP1: 'Rodilla', labelVertex: 'Tobillo', labelP2: 'Metatarso' },
  { name: 'Codo', labelP1: 'Hombro', labelVertex: 'Codo', labelP2: 'Muñeca' },
  { name: 'Tronco-Manillar', labelP1: 'Cadera', labelVertex: 'Hombro', labelP2: 'Codo' },
];

export const RUNNING_ANGLE_CONFIGS: CyclingAngleConfig[] = [
  { name: 'Rodilla Apoyo', labelP1: 'Cadera', labelVertex: 'Rodilla', labelP2: 'Tobillo' },
  { name: 'Cadera Apoyo', labelP1: 'Hombro', labelVertex: 'Cadera', labelP2: 'Rodilla' },
  { name: 'Tobillo Apoyo', labelP1: 'Rodilla', labelVertex: 'Tobillo', labelP2: 'Metatarso' },
  { name: 'Hombro-Brazo', labelP1: 'Cuello', labelVertex: 'Hombro', labelP2: 'Codo' },
];

export const CYCLING_FRONTAL_ANGLE_CONFIGS: CyclingAngleConfig[] = [
  { name: 'Rodilla Der. Valgo/Varo', labelP1: 'Cadera Der.', labelVertex: 'Rodilla Der.', labelP2: 'Tobillo Der.' },
  { name: 'Rodilla Izq. Valgo/Varo', labelP1: 'Cadera Izq.', labelVertex: 'Rodilla Izq.', labelP2: 'Tobillo Izq.' },
  { name: 'Inclinación Pelvis', labelP1: 'Cadera Der.', labelVertex: 'Cadera Izq.', labelP2: 'Hombro Izq.' },
  { name: 'Simetría Hombros', labelP1: 'Hombro Der.', labelVertex: 'Cuello', labelP2: 'Hombro Izq.' },
];

export const RUNNING_REAR_ANGLE_CONFIGS: CyclingAngleConfig[] = [
  { name: 'Cadera Lateral Der.', labelP1: 'Hombro Der.', labelVertex: 'Cadera Der.', labelP2: 'Rodilla Der.' },
  { name: 'Cadera Lateral Izq.', labelP1: 'Hombro Izq.', labelVertex: 'Cadera Izq.', labelP2: 'Rodilla Izq.' },
  { name: 'Inclinación Tronco Post.', labelP1: 'Cadera Der.', labelVertex: 'Cadera Izq.', labelP2: 'Hombro Izq.' },
  { name: 'Rodilla Der. Posterior', labelP1: 'Cadera Der.', labelVertex: 'Rodilla Der.', labelP2: 'Tobillo Der.' },
  { name: 'Rodilla Izq. Posterior', labelP1: 'Cadera Izq.', labelVertex: 'Rodilla Izq.', labelP2: 'Tobillo Izq.' },
];

export function computeAnglesFromPoints(
  points: KeyPoint[],
  configs: CyclingAngleConfig[],
  references: ReferenceRange[]
): AngleData[] {
  const result: AngleData[] = [];
  const pointMap = new Map(points.map((p) => [p.label, p]));

  for (const cfg of configs) {
    const p1 = pointMap.get(cfg.labelP1);
    const vertex = pointMap.get(cfg.labelVertex);
    const p2 = pointMap.get(cfg.labelP2);

    if (!p1 || !vertex || !p2) continue;

    const value = calculateAngleBetweenPoints(p1, vertex, p2);
    const ref = references.find((r) => r.angle_name === cfg.name);

    result.push({
      name: cfg.name,
      value_deg: value,
      reference_min: ref?.min_deg ?? 0,
      reference_max: ref?.max_deg ?? 180,
      optimal_min: ref?.optimal_min_deg ?? 0,
      optimal_max: ref?.optimal_max_deg ?? 180,
      status: ref ? getAngleStatus(value, ref) : 'acceptable',
      point_ids: [cfg.labelP1, cfg.labelVertex, cfg.labelP2],
    });
  }

  return result;
}

export const SWIMMING_FREESTYLE_ANGLE_CONFIGS: CyclingAngleConfig[] = [
  { name: 'Entrada de Mano',       labelP1: 'Codo',        labelVertex: 'Hombro',    labelP2: 'Cadera'       },
  { name: 'Codo Alto (Early VB)',  labelP1: 'Muñeca',      labelVertex: 'Codo',      labelP2: 'Hombro'       },
  { name: 'Rotación de Cadera',    labelP1: 'Hombro Der.', labelVertex: 'Cadera',    labelP2: 'Hombro Izq.'  },
  { name: 'Rodilla Patada',        labelP1: 'Cadera',      labelVertex: 'Rodilla',   labelP2: 'Tobillo'      },
  { name: 'Ángulo de Cuello',      labelP1: 'Hombro',      labelVertex: 'Cuello',    labelP2: 'Cabeza'       },
  { name: 'Trayectoria de Brazo',  labelP1: 'Hombro',      labelVertex: 'Codo',      labelP2: 'Muñeca'       },
];

export const SWIMMING_BACKSTROKE_ANGLE_CONFIGS: CyclingAngleConfig[] = [
  { name: 'Salida de Mano',        labelP1: 'Codo',        labelVertex: 'Hombro',    labelP2: 'Cadera'       },
  { name: 'Tirón Dorsal',          labelP1: 'Muñeca',      labelVertex: 'Codo',      labelP2: 'Hombro'       },
  { name: 'Rotación Dorsal',       labelP1: 'Hombro Der.', labelVertex: 'Cadera',    labelP2: 'Hombro Izq.'  },
  { name: 'Patada Dorsal',         labelP1: 'Cadera',      labelVertex: 'Rodilla',   labelP2: 'Tobillo'      },
  { name: 'Cabeza Neutra Dorsal',  labelP1: 'Hombro',      labelVertex: 'Cuello',    labelP2: 'Cabeza'       },
];

export const SWIMMING_BREASTSTROKE_ANGLE_CONFIGS: CyclingAngleConfig[] = [
  { name: 'Apertura de Brazos',    labelP1: 'Hombro Der.', labelVertex: 'Cuello',    labelP2: 'Hombro Izq.'  },
  { name: 'Flexión de Rodilla (Pechada)', labelP1: 'Cadera', labelVertex: 'Rodilla', labelP2: 'Tobillo'      },
  { name: 'Dorsiflexión Tobillo',  labelP1: 'Rodilla',     labelVertex: 'Tobillo',   labelP2: 'Pie'          },
  { name: 'Ángulo de Tirón',       labelP1: 'Muñeca',      labelVertex: 'Codo',      labelP2: 'Hombro'       },
  { name: 'Elevación de Cabeza',   labelP1: 'Hombro',      labelVertex: 'Cuello',    labelP2: 'Cabeza'       },
];

export const SWIMMING_BUTTERFLY_ANGLE_CONFIGS: CyclingAngleConfig[] = [
  { name: 'Entrada Mariposa',      labelP1: 'Codo',        labelVertex: 'Hombro',    labelP2: 'Cadera'       },
  { name: 'Codo Alto Mariposa',    labelP1: 'Muñeca',      labelVertex: 'Codo',      labelP2: 'Hombro'       },
  { name: 'Undulación Cadera',     labelP1: 'Hombro',      labelVertex: 'Cadera',    labelP2: 'Rodilla'      },
  { name: 'Patada Delfín',         labelP1: 'Cadera',      labelVertex: 'Rodilla',   labelP2: 'Tobillo'      },
  { name: 'Recuperación Aérea',    labelP1: 'Cadera',      labelVertex: 'Hombro',    labelP2: 'Codo'         },
];

export const WEIGHTLIFTING_SNATCH_CONFIGS: CyclingAngleConfig[] = [
  { name: 'Rodilla (Arranque)',    labelP1: 'Cadera',      labelVertex: 'Rodilla',   labelP2: 'Tobillo'      },
  { name: 'Cadera (Arranque)',     labelP1: 'Hombro',      labelVertex: 'Cadera',    labelP2: 'Rodilla'      },
  { name: 'Tronco (Arranque)',     labelP1: 'Cadera',      labelVertex: 'Hombro',    labelP2: 'Cuello'       },
  { name: 'Codo (Arranque)',       labelP1: 'Hombro',      labelVertex: 'Codo',      labelP2: 'Muñeca'       },
  { name: 'Tobillo (Arranque)',    labelP1: 'Rodilla',     labelVertex: 'Tobillo',   labelP2: 'Metatarso'    },
];

export const WEIGHTLIFTING_CLEAN_JERK_CONFIGS: CyclingAngleConfig[] = [
  { name: 'Rodilla (Clin)',        labelP1: 'Cadera',      labelVertex: 'Rodilla',   labelP2: 'Tobillo'      },
  { name: 'Cadera (Clin)',         labelP1: 'Hombro',      labelVertex: 'Cadera',    labelP2: 'Rodilla'      },
  { name: 'Tronco (Clin)',         labelP1: 'Cadera',      labelVertex: 'Hombro',    labelP2: 'Cuello'       },
  { name: 'Codo Rack (Clin)',      labelP1: 'Hombro',      labelVertex: 'Codo',      labelP2: 'Muñeca'       },
  { name: 'Hombro Envión',         labelP1: 'Codo',        labelVertex: 'Hombro',    labelP2: 'Cadera'       },
];

export const WEIGHTLIFTING_SQUAT_CONFIGS: CyclingAngleConfig[] = [
  { name: 'Rodilla (Sentadilla)',  labelP1: 'Cadera',      labelVertex: 'Rodilla',   labelP2: 'Tobillo'      },
  { name: 'Cadera (Sentadilla)',   labelP1: 'Hombro',      labelVertex: 'Cadera',    labelP2: 'Rodilla'      },
  { name: 'Tronco (Sentadilla)',   labelP1: 'Cadera',      labelVertex: 'Hombro',    labelP2: 'Cuello'       },
  { name: 'Tobillo (Sentadilla)',  labelP1: 'Rodilla',     labelVertex: 'Tobillo',   labelP2: 'Metatarso'    },
];

export const WEIGHTLIFTING_DEADLIFT_CONFIGS: CyclingAngleConfig[] = [
  { name: 'Rodilla (Peso Muerto)', labelP1: 'Cadera',      labelVertex: 'Rodilla',   labelP2: 'Tobillo'      },
  { name: 'Cadera (Peso Muerto)',  labelP1: 'Hombro',      labelVertex: 'Cadera',    labelP2: 'Rodilla'      },
  { name: 'Tronco (Peso Muerto)',  labelP1: 'Cadera',      labelVertex: 'Hombro',    labelP2: 'Cuello'       },
  { name: 'Tobillo (Peso Muerto)', labelP1: 'Rodilla',     labelVertex: 'Tobillo',   labelP2: 'Metatarso'    },
];

export const WEIGHTLIFTING_PRESS_CONFIGS: CyclingAngleConfig[] = [
  { name: 'Codo (Press Hombros)', labelP1: 'Hombro',      labelVertex: 'Codo',      labelP2: 'Muñeca'       },
  { name: 'Hombro (Press)',        labelP1: 'Codo',        labelVertex: 'Hombro',    labelP2: 'Cadera'       },
  { name: 'Tronco (Press)',        labelP1: 'Cadera',      labelVertex: 'Hombro',    labelP2: 'Cuello'       },
];

export const WEIGHTLIFTING_BENCH_CONFIGS: CyclingAngleConfig[] = [
  { name: 'Codo (Press Banca)',    labelP1: 'Hombro',      labelVertex: 'Codo',      labelP2: 'Muñeca'       },
  { name: 'Hombro Abducción',      labelP1: 'Codo',        labelVertex: 'Hombro',    labelP2: 'Cadera'       },
  { name: 'Muñeca (Banca)',        labelP1: 'Codo',        labelVertex: 'Muñeca',    labelP2: 'Barra'        },
];

export const WEIGHTLIFTING_POWER_CLEAN_CONFIGS: CyclingAngleConfig[] = [
  { name: 'Rodilla (Power Clean)', labelP1: 'Cadera',      labelVertex: 'Rodilla',   labelP2: 'Tobillo'      },
  { name: 'Cadera (Power Clean)',  labelP1: 'Hombro',      labelVertex: 'Cadera',    labelP2: 'Rodilla'      },
  { name: 'Tronco (Power Clean)',  labelP1: 'Cadera',      labelVertex: 'Hombro',    labelP2: 'Cuello'       },
  { name: 'Codo Catch (PC)',       labelP1: 'Hombro',      labelVertex: 'Codo',      labelP2: 'Muñeca'       },
  { name: 'Tobillo (Power Clean)', labelP1: 'Rodilla',     labelVertex: 'Tobillo',   labelP2: 'Metatarso'    },
];
