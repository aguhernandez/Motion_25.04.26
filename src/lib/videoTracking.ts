import type { AngleData, KeyPoint } from './types';
import type { CyclingAngleConfig } from './angleCalculations';
import type { ReferenceRange } from './types';

export type TrackingLimit = 60 | 120;
export interface VideoFrameIndex {
  timestamps: number[];
  duration: number;
  sourceFps: number;
  variableFrameRate: boolean;
  width: number;
  height: number;
}
export interface TrackingSample {
  time: number;
  points: KeyPoint[];
  angles: AngleData[];
  confidence: Record<string, number>;
  lostIds: string[];
}
export type TrackingRequest =
  | { type: 'inspect'; file: File }
  | { type: 'analyze'; file: File; limit: TrackingLimit; startTime: number; points: KeyPoint[]; configs: CyclingAngleConfig[]; references: ReferenceRange[] };
export type TrackingResponse =
  | { type: 'metadata'; index: VideoFrameIndex }
  | { type: 'batch'; samples: TrackingSample[]; progress: number }
  | { type: 'done'; lost: boolean }
  | { type: 'error'; message: string };

/** Keep actual presentation timestamps. Never interpolate or duplicate frames. */
export function sampleFrameTimes(timestamps: number[], limit: TrackingLimit, startTime = 0): number[] {
  const startIndex = frameIndexAtTime(timestamps, startTime);
  if (startIndex < 0) return [];
  const start = timestamps[startIndex];
  const result: number[] = [];
  let nextBucket = 0;
  for (let i = startIndex; i < timestamps.length; i++) {
    const time = timestamps[i];
    const bucket = Math.floor((time - start) * limit + 1e-6);
    if (bucket < nextBucket) continue;
    result.push(time);
    nextBucket = bucket + 1;
  }
  return result;
}

/** Frame displayed at a timestamp, using presentation order, including VFR. */
export function frameIndexAtTime(times: readonly number[], time: number): number {
  if (times.length === 0 || time < times[0] - 1e-6) return -1;
  let low = 0, high = times.length;
  while (low < high) {
    const mid = (low + high) >>> 1;
    if (times[mid] <= time + 1e-6) low = mid + 1;
    else high = mid;
  }
  return low - 1;
}

export function adjacentFrameTime(times: readonly number[], time: number, direction: -1 | 1): number {
  if (!times.length) return time;
  const index = frameIndexAtTime(times, time);
  return times[Math.max(0, Math.min(times.length - 1, index + direction))];
}

export function describeFrameRate(times: number[]): Pick<VideoFrameIndex, 'sourceFps' | 'variableFrameRate'> {
  const deltas = times.slice(1).map((time, i) => time - times[i]).filter((d) => d > 1e-6).sort((a, b) => a - b);
  const median = deltas[Math.floor(deltas.length / 2)] ?? 0;
  return {
    sourceFps: median > 0 ? 1 / median : 0,
    variableFrameRate: median > 0 && deltas.some((delta) => Math.abs(delta - median) > median * 0.05),
  };
}

/** Re-analysis replaces only the corrected frame and everything after it. */
export function truncateSamples(samples: TrackingSample[], startTime: number): TrackingSample[] {
  return samples.filter((sample) => sample.time < startTime - 1e-6);
}

export function trackingCsv(samples: TrackingSample[], width: number, height: number): string {
  const rows: (string | number)[][] = [['time_ms', 'type', 'name', 'x_normalized', 'y_normalized', 'x_px', 'y_px', 'angle_deg', 'confidence', 'status']];
  for (const sample of samples) {
    for (const point of sample.points) {
      const lost = sample.lostIds.includes(point.id);
      rows.push([sample.time * 1000, 'point', point.label, lost ? '' : point.x, lost ? '' : point.y, lost ? '' : point.x * width, lost ? '' : point.y * height, '', sample.confidence[point.id] ?? '', lost ? 'lost' : 'tracked']);
    }
    for (const angle of sample.angles) rows.push([sample.time * 1000, 'angle', angle.name, '', '', '', '', angle.value_deg, '', 'tracked']);
  }
  // Prefix text cells to prevent spreadsheet formula execution from custom labels.
  const cell = (value: string | number) => {
    const text = typeof value === 'string' && /^[=+\-@\t\r]/.test(value) ? `'${value}` : String(value);
    return `"${text.replace(/"/g, '""')}"`;
  };
  return rows.map((row) => row.map(cell).join(',')).join('\r\n');
}
